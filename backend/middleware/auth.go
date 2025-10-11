package middleware

import (
	"Smart-Meeting-Scheduler/config"
	"net/http"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Example: get token from header/cookie/session
		token := c.GetHeader("Authorization")
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Missing token"})
			return
		}
		// Optionally: verify token here
		c.Set("access_token", token[len("Bearer "):])
		c.Next()
	}
}
