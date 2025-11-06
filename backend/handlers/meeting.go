package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/services"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
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
		// Only send custom invites if using mock mode (Graph API automatically sends invites)
		mode := os.Getenv("GRAPH_MODE")
		if mode != "real" {
			// Using mock mode, send custom invites via email
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
		} else {
			log.Printf("Using real Graph API - invites are sent automatically by Microsoft Graph")
		}

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

		// Extract attendee emails from AttendeeWithTimezone structs
		attendeeEmails := make([]string, len(req.Attendees))
		for i, attendee := range req.Attendees {
			attendeeEmails[i] = attendee.Email
		}

		// Extract priority attendee emails from AttendeeWithTimezone structs
		priorityAttendeeEmails := make([]string, len(req.PriorityAttendees))
		for i, attendee := range req.PriorityAttendees {
			priorityAttendeeEmails[i] = attendee.Email
		}

		// Fetch calendar events for all participants (including organizer)
		allParticipants := append([]string{organizer}, attendeeEmails...)
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
	// Try to call external API first
	log.Printf("Calling external API for optimal meeting slots: %s", apiURL)
	log.Printf("req: %+v", req)
	log.Printf("req.Attendees: %+v", req.Attendees)
	log.Printf("req.PriorityAttendees: %+v", req.PriorityAttendees)

	log.Printf("--------------------------------------------------------")
	log.Printf("participantCalendars: %+v", participantCalendars)

	// Prepare the request payload for the external API
	payload := map[string]interface{}{
		"participantCalendars": participantCalendars,
		"attendees":            req.Attendees,
		"priorityAttendees":    req.PriorityAttendees,
		"duration":             req.Duration,
		"startTime":            req.StartTime.Format(time.RFC3339),
		"endTime":              req.EndTime.Format(time.RFC3339),
		"timeZone":             req.TimeZone,
		"maxSuggestions":       req.MaxSuggestions,
	}

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Warning: Failed to marshal request: %v. Falling back to local logic.", err)
		return findMeetingSlotsLocal(participantCalendars, req)
	}

	// Call the external API
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		log.Printf("Warning: Failed to call external API: %v. Falling back to local logic.", err)
		return findMeetingSlotsLocal(participantCalendars, req)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("Warning: External API returned status %d: %s. Falling back to local logic.", resp.StatusCode, string(bodyBytes))
		return findMeetingSlotsLocal(participantCalendars, req)
	}

	// Read response body
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Warning: Failed to read response body: %v. Falling back to local logic.", err)
		return findMeetingSlotsLocal(participantCalendars, req)
	}

	log.Printf("API Response: %s", string(bodyBytes))

	// Try parsing as direct response (new format)
	var directResponse struct {
		Status         string `json:"status"`
		SuggestedSlots []struct {
			StartTime         string   `json:"start_time"`
			EndTime           string   `json:"end_time"`
			AttendeesIncluded []string `json:"attendees_included,omitempty"`
			MissingAttendees  []string `json:"missing_attendees,omitempty"`
			Confidence        float64  `json:"confidence,omitempty"`
			Score             float64  `json:"score,omitempty"`
		} `json:"suggested_slots"`
		ReasoningSummary string `json:"reasoning_summary"`
	}

	if err := json.Unmarshal(bodyBytes, &directResponse); err == nil && directResponse.Status != "" {
		log.Printf("Parsed direct format. Status: %s, Slots: %d", directResponse.Status, len(directResponse.SuggestedSlots))

		if directResponse.Status == "no_slots_available" || len(directResponse.SuggestedSlots) == 0 {
			log.Printf("No slots available. Reasoning: %s. Falling back to local logic.", directResponse.ReasoningSummary)
			return findMeetingSlotsLocal(participantCalendars, req)
		}

		// Convert to our format
		suggestions := make([]models.MeetingSuggestion, 0, len(directResponse.SuggestedSlots))
		for i, s := range directResponse.SuggestedSlots {
			startTime, err := parseFlexibleTime(s.StartTime)
			if err != nil {
				log.Printf("Warning: Failed to parse start time %s: %v", s.StartTime, err)
				continue
			}
			endTime, err := parseFlexibleTime(s.EndTime)
			if err != nil {
				log.Printf("Warning: Failed to parse end time %s: %v", s.EndTime, err)
				continue
			}

			confidence := s.Confidence
			if confidence == 0 {
				confidence = 90.0
			}
			score := s.Score
			if score == 0 {
				score = 90.0
			}

			log.Printf("Slot %d: %s to %s (attendees: %d)", i+1, startTime.Format(time.RFC3339), endTime.Format(time.RFC3339), len(s.AttendeesIncluded))

			suggestions = append(suggestions, models.MeetingSuggestion{
				Start:      startTime,
				End:        endTime,
				Confidence: confidence,
				Score:      score,
			})
		}

		log.Printf("Successfully received %d suggestions from external API", len(suggestions))
		return suggestions, nil
	}

	// Try wrapped format as fallback
	var wrappedResponse struct {
		Output []struct {
			Content []struct {
				Text string `json:"text"`
			} `json:"content"`
		} `json:"output"`
	}

	if err := json.Unmarshal(bodyBytes, &wrappedResponse); err == nil && len(wrappedResponse.Output) > 0 && len(wrappedResponse.Output[0].Content) > 0 {
		jsonText := wrappedResponse.Output[0].Content[0].Text
		log.Printf("Trying wrapped format. Extracted text: %s", jsonText)

		if err := json.Unmarshal([]byte(jsonText), &directResponse); err == nil && directResponse.Status != "" {
			log.Printf("Parsed wrapped format successfully")
			// Use same conversion logic as above - recursive call would work but let's keep it simple
			// Just log and fall back for now since this is a backup path
		}
	}

	log.Printf("Warning: Could not parse API response. Falling back to local logic.")
	return findMeetingSlotsLocal(participantCalendars, req)
}

// parseFlexibleTime attempts to parse time strings in multiple formats including timezone offsets
func parseFlexibleTime(timeStr string) (time.Time, error) {
	formats := []string{
		time.RFC3339,                // "2006-01-02T15:04:05Z07:00"
		"2006-01-02T15:04:05-07:00", // With timezone offset
		"2006-01-02T15:04:05Z",      // UTC
		"2006-01-02T15:04:05",       // Without timezone
	}

	for _, format := range formats {
		if t, err := time.Parse(format, timeStr); err == nil {
			return t, nil
		}
	}

	return time.Time{}, fmt.Errorf("unable to parse time: %s", timeStr)
}

// findMeetingSlotsLocal is a fallback function that uses local logic to find meeting slots
func findMeetingSlotsLocal(participantCalendars map[string][]models.Event, req models.FindMeetingTimesRequest) ([]models.MeetingSuggestion, error) {
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
}
