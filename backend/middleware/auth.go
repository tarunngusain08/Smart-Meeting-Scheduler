package middleware

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for session cookie first
		sessionID, err := c.Cookie("session_id")
		if err != nil {
			fmt.Printf("No session cookie found: %v\n", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Authentication required",
				"code":  "NO_SESSION"})
			return
		}

		fmt.Printf("Found session ID: %s\n", sessionID)
		session, exists := utils.GetSession(sessionID)

		if !exists {
			fmt.Printf("No valid session found for ID: %s - session may have expired\n", sessionID)
			// Clear the invalid session cookie
			c.SetCookie("session_id", "", -1, "/", "", true, true)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Session expired",
				"code":  "SESSION_EXPIRED"})
			return
		}

		fmt.Printf("Session found with access token length: %d\n", len(session.AccessToken))
		// Fetch user ID from Microsoft Graph
		userID, err := getUserIDFromGraph(session.AccessToken, cfg)
		if err != nil {
			fmt.Printf("Failed to get user ID from Graph: %v\n", err)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "Failed to authenticate user",
				"code":  "GRAPH_ERROR"})
			return
		}

		// Set session context, access token, and user ID
		c.Set("session_id", sessionID)
		c.Set("access_token", session.AccessToken)
		c.Set("user_id", userID)
		c.Next()
	}
}

// getUserIDFromGraph fetches the user ID from Microsoft Graph /me endpoint
func getUserIDFromGraph(accessToken string, cfg *config.Config) (string, error) {
	req, err := http.NewRequest("GET", cfg.GraphAPIBase+"/me?$select=id", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Add("Authorization", "Bearer "+accessToken)
	req.Header.Add("Accept", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to call Graph API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Graph API returned status %d", resp.StatusCode)
	}

	var profile struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return "", fmt.Errorf("failed to parse Graph response: %w", err)
	}

	return profile.ID, nil
}
