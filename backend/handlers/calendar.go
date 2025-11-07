package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CalendarEvents retrieves calendar events for the authenticated user
func CalendarEvents(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")
		userEmail := c.Query("email")
		startTimeStr := c.Query("startTime")
		endTimeStr := c.Query("endTime")

		if userEmail == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email parameter is required"})
			return
		}

		// Parse time parameters
		startTime, err := time.Parse(time.RFC3339, startTimeStr)
		if err != nil {
			// Default to today
			startTime = time.Now().Truncate(24 * time.Hour)
		}

		endTime, err := time.Parse(time.RFC3339, endTimeStr)
		if err != nil {
			// Default to 7 days from start
			endTime = startTime.Add(7 * 24 * time.Hour)
		}

		// Get the appropriate client
		client := getGraphClient(accessToken, cfg)

		// Fetch events
		events, err := client.GetUserEvents(userEmail, startTime, endTime)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to fetch calendar events",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"events": events,
			"count":  len(events),
		})
	}
}

// CalendarAvailability checks availability for a user
func CalendarAvailability(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")

		var req struct {
			Email     string    `json:"email" binding:"required"`
			StartTime time.Time `json:"startTime" binding:"required"`
			EndTime   time.Time `json:"endTime" binding:"required"`
			TimeZone  string    `json:"timeZone"` // Optional: IANA timezone (e.g., "Asia/Kolkata")
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Validate email - reject placeholder/test emails
		if req.Email == "user@example.com" || req.Email == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid email address",
				"message": "Please use your authenticated email address to check availability",
			})
			return
		}

		// Get the appropriate client
		client := getGraphClient(accessToken, cfg)

		// Check availability with timezone
		availability, err := client.GetAvailabilityWithTimezone(req.Email, req.StartTime, req.EndTime, req.TimeZone)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to check availability",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusOK, availability)
	}
}

// GraphMe retrieves the authenticated user's profile
func GraphMe(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		// Make request to Microsoft Graph
		req, _ := http.NewRequest("GET", cfg.GraphAPIBase+"/me", nil)
		req.Header.Add("Authorization", "Bearer "+accessToken)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user profile"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			c.JSON(resp.StatusCode, gin.H{"error": "Failed to fetch user profile"})
			return
		}

		var profile map[string]interface{}
		if err := c.BindJSON(&profile); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusOK, profile)
	}
}

// GraphCalendar retrieves the authenticated user's calendar
func GraphCalendar(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		// Make request to Microsoft Graph
		req, _ := http.NewRequest("GET", cfg.GraphAPIBase+"/me/calendar", nil)
		req.Header.Add("Authorization", "Bearer "+accessToken)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch calendar"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			c.JSON(resp.StatusCode, gin.H{"error": "Failed to fetch calendar"})
			return
		}

		var calendar map[string]interface{}
		if err := c.BindJSON(&calendar); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusOK, calendar)
	}
}
