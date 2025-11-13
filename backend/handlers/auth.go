package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"crypto/subtle"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func Login(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prefer using backend as OAuth redirect target so backend receives the provider callback
		backendCallback := ""
		if cfg.BackendURL != "" {
			backendCallback = strings.TrimRight(cfg.BackendURL, "/") + "/auth/callback"
		} else {
			// fallback to whatever is already configured
			backendCallback = cfg.OAuth2Config.RedirectURL
		}
		cfg.OAuth2Config.RedirectURL = backendCallback

		// Log OAuth2 configuration for debugging
		log.Printf("OAuth2 Config - Client ID: %s", cfg.ClientID)
		log.Printf("OAuth2 Config - Redirect URI: %s", cfg.OAuth2Config.RedirectURL)
		log.Printf("OAuth2 Config - Auth Endpoint: %s", cfg.OAuth2Config.Endpoint.AuthURL)

		state := utils.GenerateState()

		// Choose cookie domain and secure flag based on env/config
		cookieDomain := getCookieDomain(cfg, c)
		// When SameSite=None, Secure MUST be true (browser requirement)
		// Browsers allow Secure=true cookies on localhost even over HTTP
		secure := true // Always true when SameSite=None

		// Set oauth_state cookie (HttpOnly) — use SameSite=None so cross-site flows work (requires Secure=true in browsers)
		log.Printf("Setting oauth_state cookie: domain=%s, secure=%v, sameSite=None", cookieDomain, secure)
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "oauth_state",
			Value:    state,
			Path:     "/",
			Domain:   cookieDomain,
			MaxAge:   3600, // 1 hour
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteNoneMode,
		})

		authURL := cfg.OAuth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
		log.Printf("Login initiated. Redirecting to: %s", authURL)
		c.Redirect(http.StatusFound, authURL)
	}
}

func Callback(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		log.Printf("Received callback. URL: %s", c.Request.URL.String())

		// Prefer query params (provider -> backend redirect). Otherwise expect JSON body (frontend/native exchange).
		code := c.Query("code")
		state := c.Query("state")

		// Log incoming cookies for debugging
		log.Printf("Callback received - cookies: %v", c.Request.Cookies())
		log.Printf("Callback received - Host: %s, RequestURI: %s", c.Request.Host, c.Request.RequestURI)

		// If provider redirected to backend with code, do the exchange on the server,
		// set session cookie, then redirect to frontend WITHOUT exposing code/state.
		if code != "" {
			// Validate state cookie
			savedState, err := c.Cookie("oauth_state")
			if err != nil {
				log.Printf("Missing oauth_state cookie during GET callback: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "missing state cookie"})
				return
			}
			if subtle.ConstantTimeCompare([]byte(savedState), []byte(state)) != 1 {
				log.Printf("State validation failed (GET). Saved: %s, Received: %s", savedState, state)
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid state parameter"})
				return
			}

			// Exchange code for tokens on the server
			log.Printf("Exchanging code for tokens (GET callback)...")
			token, err := cfg.OAuth2Config.Exchange(ctx, code)
			if err != nil {
				log.Printf("Token exchange failed (GET): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange authorization code"})
				return
			}
			if token == nil {
				log.Printf("Token exchange returned nil token (GET)")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "token exchange returned empty token"})
				return
			}

			rawIDToken, _ := token.Extra("id_token").(string)
			if rawIDToken == "" {
				log.Printf("No id_token found in token response (GET); ensure 'openid' scope is requested")
				c.JSON(http.StatusInternalServerError, gin.H{"error": "no id_token in token response"})
				return
			}

			idToken, err := cfg.Verifier.Verify(ctx, rawIDToken)
			if err != nil {
				log.Printf("ID token verification failed (GET): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify ID token"})
				return
			}

			var claims struct {
				Name  string `json:"name"`
				Email string `json:"email"`
				Sub   string `json:"sub"`
			}
			if err := idToken.Claims(&claims); err != nil {
				log.Printf("Failed to parse id token claims (GET): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse user claims"})
				return
			}

			// create server-side session
			expirySeconds := 0
			if !token.Expiry.IsZero() {
				expirySeconds = int(time.Until(token.Expiry).Seconds())
				if expirySeconds < 0 {
					expirySeconds = 0
				}
			}
			sessionID := utils.CreateSession(token.AccessToken, token.RefreshToken, expirySeconds)

			// cookie settings
			cookieDomain := getCookieDomain(cfg, c)
			// When SameSite=None, Secure MUST be true (browser requirement)
			// Browsers allow Secure=true cookies on localhost even over HTTP
			secure := true // Always true when SameSite=None

			// Set session cookie (HttpOnly + SameSite=None for cross-site)
			http.SetCookie(c.Writer, &http.Cookie{
				Name:     "session_id",
				Value:    sessionID,
				Path:     "/",
				Domain:   cookieDomain,
				MaxAge:   30 * 24 * 60 * 60,
				HttpOnly: true,
				Secure:   secure,
				SameSite: http.SameSiteNoneMode,
			})

			// Redirect to frontend WITHOUT code/state to avoid re-triggering login
			redirectTo := strings.TrimRight(cfg.FrontendURL, "/")
			log.Printf("Callback complete (GET). redirecting to frontend: %s", redirectTo)
			c.Redirect(http.StatusSeeOther, redirectTo)
			return
		}

		// For POST requests from frontend (mobile/native flow) - frontend will POST {code, state}
		var req struct {
			Code  string `json:"code"`
			State string `json:"state"`
		}
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
			return
		}
		code = req.Code
		state = req.State

		if code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "no authorization code provided"})
			return
		}

		// Validate state stored in cookie
		savedState, err := c.Cookie("oauth_state")
		if err != nil {
			log.Printf("Missing oauth_state cookie (POST): %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing state cookie"})
			return
		}
		if subtle.ConstantTimeCompare([]byte(savedState), []byte(state)) != 1 {
			log.Printf("State validation failed (POST). Saved: %s, Received: %s", savedState, state)
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid state parameter"})
			return
		}

		// Exchange code for tokens (POST flow)
		log.Printf("Exchanging code for tokens (POST)...")
		token, err := cfg.OAuth2Config.Exchange(ctx, code)
		if err != nil {
			log.Printf("Token exchange failed (POST): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to exchange authorization code"})
			return
		}
		if token == nil {
			log.Printf("Token exchange returned nil token (POST)")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "token exchange returned empty token"})
			return
		}

		rawIDToken, _ := token.Extra("id_token").(string)
		if rawIDToken == "" {
			log.Printf("No id_token found in token response (POST); ensure 'openid' scope is requested")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "no id_token in token response"})
			return
		}

		idToken, err := cfg.Verifier.Verify(ctx, rawIDToken)
		if err != nil {
			log.Printf("ID token verification failed (POST): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to verify ID token"})
			return
		}

		var claims struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Sub   string `json:"sub"`
		}
		if err := idToken.Claims(&claims); err != nil {
			log.Printf("Failed to parse id token claims (POST): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse user claims"})
			return
		}

		// Create session server-side
		expirySeconds := 0
		if !token.Expiry.IsZero() {
			expirySeconds = int(time.Until(token.Expiry).Seconds())
			if expirySeconds < 0 {
				expirySeconds = 0
			}
		}
		sessionID := utils.CreateSession(token.AccessToken, token.RefreshToken, expirySeconds)

		// cookie settings
		cookieDomain := getCookieDomain(cfg, c)
		// When SameSite=None, Secure MUST be true (browser requirement)
		// Browsers allow Secure=true cookies on localhost even over HTTP
		secure := true // Always true when SameSite=None

		// Set session cookie (HttpOnly + SameSite=None)
		http.SetCookie(c.Writer, &http.Cookie{
			Name:     "session_id",
			Value:    sessionID,
			Path:     "/",
			Domain:   cookieDomain,
			MaxAge:   30 * 24 * 60 * 60,
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteNoneMode,
		})

		// Return minimal user info (no tokens)
		c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"name":  claims.Name,
				"email": claims.Email,
				"sub":   claims.Sub,
			},
			"sessionId": sessionID,
		})
	}
}

// AuthMe verifies the current session cookie and returns user info
// This is the single source of truth for authentication state
func AuthMe(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for session cookie
		sessionID, err := c.Cookie("session_id")
		if err != nil {
			log.Printf("AuthMe: No session cookie found: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Not authenticated",
				"code":  "NO_SESSION",
			})
			return
		}

		// Validate session exists
		session, exists := utils.GetSession(sessionID)
		if !exists {
			log.Printf("AuthMe: Session not found or expired: %s", sessionID)
			// Clear invalid cookie
			cookieDomain := getCookieDomain(cfg, c)
			secure := true // Always true when SameSite=None
			c.SetCookie("session_id", "", -1, "/", cookieDomain, secure, true)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Session expired",
				"code":  "SESSION_EXPIRED",
			})
			return
		}

		// Fetch user info from Microsoft Graph
		req, err := http.NewRequest("GET", cfg.GraphAPIBase+"/me?$select=id,displayName,mail,userPrincipalName", nil)
		if err != nil {
			log.Printf("AuthMe: Failed to create Graph request: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user info"})
			return
		}

		req.Header.Add("Authorization", "Bearer "+session.AccessToken)
		req.Header.Add("Accept", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("AuthMe: Failed to call Graph API: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to authenticate user"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			log.Printf("AuthMe: Graph API returned status %d", resp.StatusCode)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Failed to verify user",
				"code":  "GRAPH_ERROR",
			})
			return
		}

		var profile struct {
			ID                string `json:"id"`
			DisplayName       string `json:"displayName"`
			Mail              string `json:"mail"`
			UserPrincipalName string `json:"userPrincipalName"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
			log.Printf("AuthMe: Failed to parse Graph response: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user info"})
			return
		}

		// Use mail or userPrincipalName as email
		email := profile.Mail
		if email == "" {
			email = profile.UserPrincipalName
		}

		c.JSON(http.StatusOK, gin.H{
			"user": gin.H{
				"id":    profile.ID,
				"name":  profile.DisplayName,
				"email": email,
				"sub":   profile.ID, // Use Graph ID as sub
			},
		})
	}
}

// getCookieDomain determines the appropriate cookie domain based on config and request
func getCookieDomain(cfg *config.Config, c *gin.Context) string {
	// If explicitly configured, use it
	if cfg.CookieDomain != "" {
		return cfg.CookieDomain
	}

	// For production/ngrok, try to extract domain from request host
	host := c.Request.Host
	if host != "" && host != "localhost" && host != "localhost:8080" {
		// Remove port if present
		if idx := strings.Index(host, ":"); idx != -1 {
			host = host[:idx]
		}
		// For ngrok domains, don't set domain (let browser use current host)
		// For other domains, you might want to set a domain, but for now return empty
		// Empty domain means cookie is set for exact host (most secure)
		if strings.Contains(host, "ngrok") || strings.Contains(host, ".") {
			return "" // Empty domain = current host only
		}
	}

	// Default to localhost for local development
	return "localhost"
}

func Logout(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Clear session if it exists
		if sessionID, err := c.Cookie("session_id"); err == nil {
			utils.DeleteSession(sessionID)
		}

		// Get cookie domain from config/request
		cookieDomain := getCookieDomain(cfg, c)
		secure := true // Always true when SameSite=None

		// Clear cookies
		c.SetCookie("session_id", "", -1, "/", cookieDomain, secure, true)
		c.SetCookie("oauth_state", "", -1, "/", cookieDomain, secure, true)
		c.SetCookie("access_token", "", -1, "/", cookieDomain, secure, true)
		c.SetCookie("id_token", "", -1, "/", cookieDomain, secure, true)

		// Also clear for localhost if we're using a different domain
		if cookieDomain != "" && cookieDomain != "localhost" {
			c.SetCookie("session_id", "", -1, "/", "localhost", secure, true)
			c.SetCookie("oauth_state", "", -1, "/", "localhost", secure, true)
		}

		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}
