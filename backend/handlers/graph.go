package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GraphMe(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := utils.GetAccessTokenFromContext(c)
		data, err := utils.GetUserProfile(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch profile"})
			return
		}
		c.Data(http.StatusOK, "application/json", data)
	}
}

func GraphCalendar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := utils.GetAccessTokenFromContext(c)
		data, err := utils.GetUserCalendar(token)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch calendar"})
			return
		}
		c.Data(http.StatusOK, "application/json", data)
	}
}
