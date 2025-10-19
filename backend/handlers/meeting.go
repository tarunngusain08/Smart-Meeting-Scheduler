package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/utils"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var meetingStore *models.MeetingStore

func initMeetingStore(cfg *config.Config) error {
	if meetingStore != nil {
		return nil
	}

	dbCfg := config.NewDBConfig()
	db, err := dbCfg.ConnectDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	meetingStore = models.NewMeetingStore(db)
	return nil
}

// CreateMeeting creates a new meeting, handling both local and Graph API cases
func CreateMeeting(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := initMeetingStore(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize meeting store"})
			return
		}

		// Parse request body
		var req models.CreateMeetingRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// Parse times
		startTime, err := time.Parse(time.RFC3339, req.Start)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format"})
			return
		}

		endTime, err := time.Parse(time.RFC3339, req.End)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format"})
			return
		}

		// Create local meeting record first
		meeting := &models.Meeting{
			Subject:     req.Subject,
			StartTime:   startTime,
			EndTime:     endTime,
			Description: req.Description,
			Location:    req.Location,
			IsOnline:    req.IsOnline,
			OrganizerID: "test-user-1", // Default to first test user for now
			Attendees:   req.Attendees,
		}

		// Store in local database
		if err := meetingStore.CreateMeeting(meeting, req.Attendees); err != nil {
			log.Printf("Failed to store meeting locally: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting"})
			return
		}

		// For test users, return early with local meeting data
		for _, attendee := range req.Attendees {
			if strings.HasPrefix(attendee.Email, "test-user-") {
				c.JSON(http.StatusOK, gin.H{
					"message": "Meeting created successfully",
					"meeting": meeting,
				})
				return
			}
		}

		// For real users, continue with Graph API
		// Prepare meeting request
		meetingRequest := map[string]interface{}{
			"subject": req.Subject,
			"start": map[string]string{
				"dateTime": req.Start,
				"timeZone": "UTC", // You might want to make this configurable
			},
			"end": map[string]string{
				"dateTime": req.End,
				"timeZone": "UTC",
			},
			"attendees": formatAttendees(req.Attendees),
		}

		// Add optional fields if present
		if req.Description != "" {
			meetingRequest["body"] = map[string]string{
				"contentType": "text",
				"content":     req.Description,
			}
		}

		if req.Location != "" {
			meetingRequest["location"] = map[string]string{
				"displayName": req.Location,
			}
		}

		// If online meeting is requested
		if req.IsOnline {
			meetingRequest["isOnlineMeeting"] = true
			meetingRequest["onlineMeetingProvider"] = "teamsForBusiness"
		}

		// Convert request to JSON
		jsonBody, err := json.Marshal(meetingRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		// Get session from cookie
		sessionID, err := c.Cookie("session_id")
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No session cookie found"})
			return
		}

		session, exists := utils.GetSession(sessionID)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Session not found or expired"})
			return
		}

		// Create request to Microsoft Graph
		url := fmt.Sprintf("https://graph.microsoft.com/v1.0/me/calendar/events")
		httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		httpReq.Header.Add("Authorization", fmt.Sprintf("Bearer %s", session.AccessToken))
		httpReq.Header.Add("Content-Type", "application/json")

		// Make request
		client := &http.Client{}
		resp, err := client.Do(httpReq)
		if err != nil {
			log.Printf("Failed to create meeting: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create meeting"})
			return
		}
		defer resp.Body.Close()

		// Read response body
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
			return
		}

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			log.Printf("Graph API error: %s", string(body))
			c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Graph API error: %s", string(body))})
			return
		}

		// Parse the created event
		var result struct {
			ID            string `json:"id"`
			Subject       string `json:"subject"`
			WebLink       string `json:"webLink"`
			OnlineMeeting struct {
				JoinURL string `json:"joinUrl"`
			} `json:"onlineMeeting"`
		}
		if err := json.Unmarshal(body, &result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"id":      result.ID,
			"subject": result.Subject,
			"webLink": result.WebLink,
			"joinUrl": result.OnlineMeeting.JoinURL,
		})
	}
}

// Helper function to format attendees for the Graph API
func formatAttendees(attendees []models.User) []map[string]interface{} {
	result := make([]map[string]interface{}, len(attendees))
	for i, attendee := range attendees {
		result[i] = map[string]interface{}{
			"emailAddress": map[string]string{
				"address": attendee.Email,
				"name":    attendee.Name,
			},
			"type": "required",
		}
	}
	return result
}
