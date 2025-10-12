package middleware

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check for session cookie first
		sessionID, err := c.Cookie("session_id")
		if err == nil {
			// If we have a session, try to get it
			if session, exists := utils.GetSession(sessionID); exists {
				// Add access token to context
				c.Set("access_token", session.AccessToken)
				c.Next()
				return
			}
		}

		// If no valid session, check Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			// Remove "Bearer " prefix if present
			token := authHeader
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
			}
			// Set token in context for handlers to use
			c.Set("access_token", token)
			c.Next()
			return
		}

		// If no Authorization header, check access_token cookie
		token, err := c.Cookie("access_token")
		if err != nil || token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "No valid session or token found"})
			return
		}

		// Set token in context for handlers to use
		c.Set("access_token", token)
		c.Next()
	}
}
