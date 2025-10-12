package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func Login(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the frontend callback URL from the query parameter
		frontendCallback := c.Query("redirect_uri")
		if frontendCallback == "" {
			frontendCallback = cfg.FrontendURL // fallback to default frontend URL
		}

		// Update OAuth2 config with the frontend callback URL
		cfg.OAuth2Config.RedirectURL = frontendCallback

		// Log OAuth2 configuration
		log.Printf("OAuth2 Config - Client ID: %s", cfg.ClientID)
		log.Printf("OAuth2 Config - Redirect URI: %s", cfg.OAuth2Config.RedirectURL)
		log.Printf("OAuth2 Config - Auth Endpoint: %s", cfg.OAuth2Config.Endpoint.AuthURL)

		state := utils.GenerateState()
		// Set cookie with proper security settings
		c.SetCookie(
			"oauth_state",
			state,
			3600,        // Max age in seconds (1 hour)
			"/",         // Path
			"localhost", // Domain
			false,       // Secure (false for local development)
			true,        // HTTP only
		)

		authURL := cfg.OAuth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		log.Printf("Login initiated. Redirecting to: %s", authURL)
		c.Redirect(http.StatusFound, authURL)
	}
}

func Callback(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Printf("Received callback. URL: %s", c.Request.URL.String())

		code := c.Query("code")
		state := c.Query("state")

		if code != "" {
			// This is a direct callback from Microsoft Teams
			// Redirect to frontend with the code
			frontendCallback := cfg.FrontendURL + "/auth/callback"
			redirectURL := fmt.Sprintf("%s?code=%s&state=%s",
				frontendCallback,
				code,
				state,
			)
			log.Printf("Redirecting to frontend: %s", redirectURL)
			c.Redirect(http.StatusTemporaryRedirect, redirectURL)
			return
		}

		// For POST requests from frontend
		var req struct {
			Code  string `json:"code"`
			State string `json:"state"`
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid request body",
			})
			return
		}

		code = req.Code
		state = req.State

		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "No authorization code provided",
			})
			return
		}

		// Validate state
		savedState, err := c.Cookie("oauth_state")
		if err != nil || state != savedState {
			log.Printf("State validation failed. Saved state: %s, Received state: %s, Error: %v",
				savedState, state, err)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid state parameter",
			})
			return
		}

		log.Printf("Exchanging code for token...")

		token, err := cfg.OAuth2Config.Exchange(context.Background(), code)
		if err != nil {
			log.Printf("Token exchange failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to exchange authorization code for tokens",
			})
			return
		}
		log.Printf("Token exchange successful. Access token length: %d", len(token.AccessToken))

		rawIDToken, ok := token.Extra("id_token").(string)
		if !ok {
			log.Printf("No id_token found in token response")
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "No ID token found in response",
			})
			return
		}

		idToken, err := cfg.Verifier.Verify(context.Background(), rawIDToken)
		if err != nil {
			log.Printf("ID token verification failed: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to verify ID token",
			})
			return
		}

		var claims struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		if err := idToken.Claims(&claims); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to parse user claims",
			})
			return
		}

		// Create session with refresh token
		sessionID := utils.CreateSession(
			token.AccessToken,
			token.RefreshToken,
			int(time.Until(token.Expiry).Seconds()),
		)

		// Set session cookie that expires in 30 days
		c.SetCookie(
			"session_id",
			sessionID,
			30*24*60*60, // 30 days
			"/",
			"localhost",
			false, // Set to true in production with HTTPS
			true,
		)

		// Return success response
		c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"name":  claims.Name,
				"email": claims.Email,
			},
			"sessionId": sessionID,
		})
	}
}

func Logout(c *gin.Context) {
	// Clear session if it exists
	if sessionID, err := c.Cookie("session_id"); err == nil {
		utils.DeleteSession(sessionID)
	}

	// Clear all auth-related cookies
	c.SetCookie("session_id", "", -1, "/", "localhost", false, true)
	c.SetCookie("oauth_state", "", -1, "/", "localhost", false, true)
	c.SetCookie("access_token", "", -1, "/", "localhost", false, true)
	c.SetCookie("id_token", "", -1, "/", "localhost", false, true)

	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
