package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/services"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// getGraphClient returns the appropriate GraphClient based on environment
func getGraphClient(accessToken string, cfg *config.Config) services.GraphClient {
	mode := os.Getenv("GRAPH_MODE")
	if mode == "real" && accessToken != "" {
		return services.NewGraphAPIClient(accessToken, cfg)
	}

	// Use mock client with database from config
	if cfg.DB == nil {
		// Database not initialized - this shouldn't happen if config is loaded properly
		log.Println("ERROR: Database not initialized for mock mode. Please ensure PostgreSQL is running.")
		// Return mock client with nil DB - will cause panic if used, but better than silent failure
		return services.NewMockGraphClient(nil, cfg.TeamsMeetingBaseURL)
	}
	return services.NewMockGraphClient(cfg.DB, cfg.TeamsMeetingBaseURL)
}

// fetchUserEmail fetches the authenticated user's email from Graph API
func fetchUserEmail(accessToken string, cfg *config.Config) (string, error) {
	// Make request to Microsoft Graph /me endpoint
	req, err := http.NewRequest("GET", cfg.GraphAPIBase+"/me", nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Add("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch user profile: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Graph API returned status %d", resp.StatusCode)
	}

	var profile struct {
		Mail              string `json:"mail"`
		UserPrincipalName string `json:"userPrincipalName"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Prefer mail, fallback to userPrincipalName
	if profile.Mail != "" {
		return profile.Mail, nil
	}
	if profile.UserPrincipalName != "" {
		return profile.UserPrincipalName, nil
	}

	return "", fmt.Errorf("no email found in user profile")
}

// CreateMeeting creates a new calendar meeting
func CreateMeeting(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")

		var req models.CreateMeetingRequest
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request body",
				"details": err.Error(),
			})
			return
		}

		// Get organizer email from context or request
		organizer := c.Query("organizer")
		if organizer == "" {
			// Fetch from Graph API /me endpoint
			var err error
			organizer, err = fetchUserEmail(accessToken, cfg)
			if err != nil {
				log.Printf("Failed to fetch user email: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get organizer email",
					"details": err.Error(),
				})
				return
			}
		}

		// Get the appropriate client
		client := getGraphClient(accessToken, cfg)

		var event models.Event
		var err error

		if req.IsOnline {
			// Create online meeting (Teams)
			event, err = client.CreateOnlineMeeting(
				organizer,
				req.Start,
				req.End,
				req.Subject,
				req.Attendees,
			)
		} else {
			// Create regular calendar event
			event, err = client.CreateCalendarEvent(organizer, req)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to create meeting",
				"details": err.Error(),
			})
			return
		}

		// Send meeting invitations to attendees asynchronously
		go func() {
			sender := services.GetInviteSender()

			invite := &services.MeetingInvite{
				Subject:     req.Subject,
				Description: req.Description,
				StartTime:   req.Start.Format(time.RFC3339),
				EndTime:     req.End.Format(time.RFC3339),
				Attendees:   req.Attendees,
				Organizer:   organizer,
				Location:    req.Location,
			}

			if err := sender.SendInvite(invite); err != nil {
				log.Printf("Failed to send meeting invite: %v", err)
				// Don't fail the request - meeting was created successfully
			} else {
				log.Printf("Successfully sent meeting invites to %d attendees", len(req.Attendees))
			}
		}()

		c.JSON(http.StatusCreated, gin.H{
			"message": "Meeting created successfully",
			"event":   event,
		})
	}
}

// FindMeetingTimes finds available meeting times for attendees using external AI API
func FindMeetingTimes(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := c.GetString("access_token")

		var req models.FindMeetingTimesRequest
		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   "Invalid request body",
				"details": err.Error(),
			})
			return
		}

		// Get organizer email
		organizer := c.Query("organizer")
		if organizer == "" {
			// Fetch from Graph API /me endpoint
			var err error
			organizer, err = fetchUserEmail(accessToken, cfg)
			if err != nil {
				log.Printf("Failed to fetch user email: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":   "Failed to get organizer email",
					"details": err.Error(),
				})
				return
			}
		}

		// Validate duration
		if req.Duration <= 0 {
			req.Duration = 30 // Default to 30 minutes
		}

		// Set max suggestions if not provided
		if req.MaxSuggestions <= 0 {
			req.MaxSuggestions = 5
		}

		// Get the appropriate client
		client := getGraphClient(accessToken, cfg)

		// Fetch calendar events for all participants (including organizer)
		allParticipants := append([]string{organizer}, req.Attendees...)
		participantCalendars := make(map[string][]models.Event)

		for _, participant := range allParticipants {
			// client.GetUserEvents(participant, req.StartTime, req.EndTime)
			events, err := client.GetUserEvents(participant, req.StartTime, req.EndTime)
			if err != nil {
				log.Printf("Warning: Failed to fetch calendar for %s: %v", participant, err)
				// Continue with empty calendar for this participant
				participantCalendars[participant] = []models.Event{}
			} else {
				participantCalendars[participant] = events
			}
		}

		// Call external Gemini API to find optimal meeting slots
		log.Println("Calling external Gemini API to find optimal meeting slots")
		log.Println("participantCalendars: ", participantCalendars)
		log.Println("req: ", req)

		suggestions, err := findMeetingSlots(cfg.MeetingSlotsAPIURL, participantCalendars, req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "Failed to find meeting times",
				"details": err.Error(),
			})
			return
		}

		// Limit suggestions
		if len(suggestions) > req.MaxSuggestions {
			suggestions = suggestions[:req.MaxSuggestions]
		}

		response := models.MeetingTimesResponse{
			Suggestions: suggestions,
		}

		if len(suggestions) == 0 {
			response.Message = "No available meeting times found in the specified range"
		} else {
			response.Message = "Meeting times found successfully"
		}

		c.JSON(http.StatusOK, response)
	}
}

// findMeetingSlots calls the configured external API to find optimal meeting slots
// Falls back to local mock logic if external API is unavailable
func findMeetingSlots(apiURL string, participantCalendars map[string][]models.Event, req models.FindMeetingTimesRequest) ([]models.MeetingSuggestion, error) {
	// For demo/development, use local mock logic instead of external API
	// This avoids dependency on external services
	log.Println("Using local mock logic for finding meeting slots")

	// Convert participantCalendars to the format expected by MockGraphClient.FindMeetingTimes
	// We need to create a map of busy slots for each participant
	busySlots := make(map[string][]models.TimeSlot)

	for participant, events := range participantCalendars {
		for _, event := range events {
			busySlots[participant] = append(busySlots[participant], models.TimeSlot{
				Start: event.Start,
				End:   event.End,
			})
		}
	}

	// Use the same logic as MockGraphClient.findCommonFreeSlots
	// Merge all busy slots
	allBusySlots := []models.TimeSlot{}
	for _, slots := range busySlots {
		allBusySlots = append(allBusySlots, slots...)
	}

	// Sort busy slots by start time
	for i := 0; i < len(allBusySlots)-1; i++ {
		for j := i + 1; j < len(allBusySlots); j++ {
			if allBusySlots[i].Start.After(allBusySlots[j].Start) {
				allBusySlots[i], allBusySlots[j] = allBusySlots[j], allBusySlots[i]
			}
		}
	}

	// Find free slots within the requested time range
	var freeSlots []models.TimeSlot
	current := req.StartTime

	for _, busySlot := range allBusySlots {
		// If there's a gap before this busy slot
		if current.Before(busySlot.Start) {
			freeSlots = append(freeSlots, models.TimeSlot{
				Start: current,
				End:   busySlot.Start,
			})
		}
		// Move current time to after this busy slot
		if busySlot.End.After(current) {
			current = busySlot.End
		}
	}

	// Add remaining time until end of range
	if current.Before(req.EndTime) {
		freeSlots = append(freeSlots, models.TimeSlot{
			Start: current,
			End:   req.EndTime,
		})
	}

	// Find slots that fit the duration and convert to suggestions
	var suggestions []models.MeetingSuggestion
	for _, slot := range freeSlots {
		slotDuration := slot.End.Sub(slot.Start)
		if slotDuration >= time.Duration(req.Duration)*time.Minute {
			// Can fit the meeting in this slot
			suggestions = append(suggestions, models.MeetingSuggestion{
				Start:      slot.Start,
				End:        slot.Start.Add(time.Duration(req.Duration) * time.Minute),
				Confidence: 100.0,
				Score:      100.0,
			})
		}
	}

	// Sort suggestions by start time
	for i := 0; i < len(suggestions)-1; i++ {
		for j := i + 1; j < len(suggestions); j++ {
			if suggestions[i].Start.After(suggestions[j].Start) {
				suggestions[i], suggestions[j] = suggestions[j], suggestions[i]
			}
		}
	}

	// Limit to max suggestions
	if len(suggestions) > req.MaxSuggestions {
		suggestions = suggestions[:req.MaxSuggestions]
	}

	return suggestions, nil

	// Original external API code (commented out for now)
	/*
		// Prepare the request payload for the external API
		payload := map[string]interface{}{
			"participantCalendars": participantCalendars,
			"duration":             req.Duration,
			"startTime":            req.StartTime.Format(time.RFC3339),
			"endTime":              req.EndTime.Format(time.RFC3339),
			"timeZone":             req.TimeZone,
			"maxSuggestions":       req.MaxSuggestions,
		}

		payloadBytes, err := json.Marshal(payload)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}

		// Call the external API
		resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(payloadBytes))
		if err != nil {
			return nil, fmt.Errorf("failed to call external API: %w", err)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("external API returned status %d", resp.StatusCode)
		}

		// Parse the response
		var apiResponse struct {
			Suggestions []struct {
				Start      string  `json:"start"`
				End        string  `json:"end"`
				Confidence float64 `json:"confidence"`
				Score      float64 `json:"score"`
			} `json:"suggestions"`
		}

		if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
			return nil, fmt.Errorf("failed to decode API response: %w", err)
		}

		// Convert to our model format
		suggestions := make([]models.MeetingSuggestion, 0, len(apiResponse.Suggestions))
		for _, s := range apiResponse.Suggestions {
			startTime, err := time.Parse(time.RFC3339, s.Start)
			if err != nil {
				log.Printf("Warning: Failed to parse start time %s: %v", s.Start, err)
				continue
			}
			endTime, err := time.Parse(time.RFC3339, s.End)
			if err != nil {
				log.Printf("Warning: Failed to parse end time %s: %v", s.End, err)
				continue
			}

			suggestions = append(suggestions, models.MeetingSuggestion{
				Start:      startTime,
				End:        endTime,
				Confidence: s.Confidence,
				Score:      s.Score,
			})
		}

		return suggestions, nil
	*/
}
