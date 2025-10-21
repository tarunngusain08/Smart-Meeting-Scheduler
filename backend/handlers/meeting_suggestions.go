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

	"github.com/gin-gonic/gin"
)

// FindMeetingTimes handles suggesting meeting times using MS Graph API and Gemini
func FindMeetingTimes(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.FindMeetingTimesRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// Set default values if not provided
		if req.MeetingDuration == "" {
			req.MeetingDuration = "PT30M" // Default 30 minutes
		}
		if req.MinimumAttendeePercentage == 0 {
			req.MinimumAttendeePercentage = 100 // Default to requiring all attendees
		}

		token := utils.GetAccessTokenFromContext(c)

		// Call MS Graph findMeetingTimes
		url := fmt.Sprintf("%s/me/findMeetingTimes", cfg.GraphAPIBase)
		jsonBody, err := json.Marshal(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to prepare request"})
			return
		}

		graphReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		graphReq.Header.Set("Authorization", "Bearer "+token)
		graphReq.Header.Set("Content-Type", "application/json")
		timezone := "UTC"
		if req.TimeConstraint != nil && len(req.TimeConstraint.TimeSlots) > 0 {
			timezone = req.TimeConstraint.TimeSlots[0].Start.TimeZone
		}
		graphReq.Header.Set("Prefer", fmt.Sprintf("outlook.timezone=\"%s\"", timezone))

		client := &http.Client{}
		resp, err := client.Do(graphReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch meeting times"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errorResp map[string]interface{}
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err != nil {
				c.JSON(resp.StatusCode, gin.H{"error": "Failed to get meeting suggestions"})
				return
			}
			log.Printf("Graph API Error: %v", errorResp)
			c.JSON(resp.StatusCode, errorResp)
			return
		}

		var graphResult models.MeetingTimeSuggestionsResult
		if err := json.NewDecoder(resp.Body).Decode(&graphResult); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		// If no suggestions found, return early
		if len(graphResult.MeetingTimeSuggestions) == 0 {
			c.JSON(http.StatusOK, graphResult)
			return
		}

		// Enhance suggestions with Gemini API
		enhancedSuggestions, err := enhanceMeetingSuggestionsWithGemini(cfg, graphResult.MeetingTimeSuggestions, req)
		if err != nil {
			// Log the error but continue with original suggestions
			log.Printf("Failed to enhance suggestions with Gemini: %v", err)
			c.JSON(http.StatusOK, graphResult)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"emptySuggestionsReason": graphResult.EmptySuggestionsReason,
			"suggestions":            enhancedSuggestions,
		})
	}
}

// enhanceMeetingSuggestionsWithGemini uses Gemini API to enhance meeting suggestions
func enhanceMeetingSuggestionsWithGemini(cfg *config.Config, suggestions []models.MeetingTimeSuggestion, req models.FindMeetingTimesRequest) ([]models.GeminiSuggestion, error) {
	// TODO: Implement Gemini API integration
	// For now, convert regular suggestions to GeminiSuggestions with placeholder scores
	enhanced := make([]models.GeminiSuggestion, len(suggestions))
	for i, sugg := range suggestions {
		enhanced[i] = models.GeminiSuggestion{
			MeetingTimeSuggestion: sugg,
			ConfidenceScore:      float64(100-i*10) / 100, // Decreasing confidence for later suggestions
			ReasoningExplanation: "Based on attendee availability and meeting constraints",
			PreferenceMatch: struct {
				TimeOfDay     float64 `json:"timeOfDay"`
				DayOfWeek     float64 `json:"dayOfWeek"`
				AttendeeScore float64 `json:"attendeeScore"`
			}{
				TimeOfDay:     0.9,
				DayOfWeek:     0.8,
				AttendeeScore: sugg.Confidence / 100,
			},
		}
	}
	return enhanced, nil
}
