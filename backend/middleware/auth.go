package middleware

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
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
		// Set session context and access token
		c.Set("session_id", sessionID)
		c.Set("access_token", session.AccessToken)
		c.Next()
	}
}
