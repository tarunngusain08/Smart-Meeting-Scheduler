package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

func CheckAvailability(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req utils.AvailabilityRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		token := utils.GetAccessTokenFromContext(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		data, err := utils.GetUserAvailability(token, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check availability"})
			return
		}

		c.Data(http.StatusOK, "application/json", data)
	}
}

func ScheduleMeeting(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req utils.MeetingRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		token := utils.GetAccessTokenFromContext(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		data, err := utils.ScheduleMeeting(token, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule meeting"})
			return
		}

		c.Data(http.StatusOK, "application/json", data)
	}
}
