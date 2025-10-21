package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// CalendarAvailability handles checking calendar availability for multiple users
func CalendarAvailability(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.AvailabilityRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		if len(req.Schedules) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No schedules provided"})
			return
		}

		// Get access token from context (set by auth middleware)
		token := utils.GetAccessTokenFromContext(c)

		// Prepare request to MS Graph API
		graphReq := map[string]interface{}{
			"schedules": req.Schedules,
			"startTime": map[string]interface{}{
				"dateTime": req.StartTime,
				"timeZone": req.TimeZone,
			},
			"endTime": map[string]interface{}{
				"dateTime": req.EndTime,
				"timeZone": req.TimeZone,
			},
			"availabilityViewInterval": 30, // 30-minute intervals
		}

		jsonBody, err := json.Marshal(graphReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare request"})
			return
		}

		url := fmt.Sprintf("%s/users/%s/calendar/getSchedule", cfg.GraphAPIBase, "me")
		req2, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		req2.Header.Set("Authorization", "Bearer "+token)
		req2.Header.Set("Content-Type", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req2)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch availability"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errorResp map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
				c.JSON(resp.StatusCode, gin.H{"error": "Failed to get availability"})
				return
			}
			c.JSON(resp.StatusCode, errorResp)
			return
		}

		// Parse and return the response
		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

// CreateMeeting handles creating a new Teams meeting
func CreateMeeting(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.MeetingRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		token := utils.GetAccessTokenFromContext(c)

		// Convert request to MS Graph event format
		attendees := make([]map[string]interface{}, len(req.Attendees))
		for i, att := range req.Attendees {
			attendeeType := "required"
			if att.Type != "" {
				attendeeType = att.Type
			}
			attendees[i] = map[string]interface{}{
				"emailAddress": map[string]string{
					"address": att.Email,
					"name":    att.Name,
				},
				"type": attendeeType,
			}
		}

		timeZone := req.TimeZone
		if timeZone == "" {
			timeZone = "UTC"
		}

		event := map[string]interface{}{
			"subject": req.Subject,
			"body": map[string]string{
				"contentType": "HTML",
				"content":     req.Body,
			},
			"start": map[string]string{
				"dateTime": req.StartTime,
				"timeZone": timeZone,
			},
			"end": map[string]string{
				"dateTime": req.EndTime,
				"timeZone": timeZone,
			},
			"attendees":            attendees,
			"isOnlineMeeting":     true,
			"onlineMeetingProvider": "teamsForBusiness",
		}

		if req.Location != nil {
			event["location"] = map[string]string{
				"displayName": *req.Location,
			}
		}

		jsonBody, err := json.Marshal(event)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare request"})
			return
		}

		url := fmt.Sprintf("%s/me/events", cfg.GraphAPIBase)
		req2, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		req2.Header.Set("Authorization", "Bearer "+token)
		req2.Header.Set("Content-Type", "application/json")

		client := &http.Client{
			Timeout: time.Second * 30,
		}
		
		resp, err := client.Do(req2)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			var errorResp map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
				c.JSON(resp.StatusCode, gin.H{"error": "Failed to create meeting"})
				return
			}
			log.Printf("Failed to create meeting. Status: %d, Error: %v", resp.StatusCode, errorResp)
			c.JSON(resp.StatusCode, errorResp)
			return
		}

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}

func CalendarEvents(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := utils.GetAccessTokenFromContext(c)

		// Get query parameters with defaults
		startTime := c.DefaultQuery("startTime", time.Now().Format(time.RFC3339))
		endTime := c.DefaultQuery("endTime", time.Now().AddDate(0, 0, 7).Format(time.RFC3339))
		
		url := fmt.Sprintf("%s/me/calendarView?startDateTime=%s&endDateTime=%s", 
			cfg.GraphAPIBase, 
			startTime,
			endTime,
		)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Prefer", "outlook.timezone=\"UTC\"")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
			return
		}
		defer resp.Body.Close()

		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusOK, result)
	}
}
