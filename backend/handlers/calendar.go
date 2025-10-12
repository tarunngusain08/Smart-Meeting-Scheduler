package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	graphAPIBase = "https://graph.microsoft.com/v1.0"
)

// GET /api/calendar/events?days=7&start=2025-10-11
func CalendarEvents(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get access token from context (set by AuthMiddleware)
		accessToken := c.GetString("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		// Parse query parameters
		days := 7 // default to 7 days
		if d := c.Query("days"); d != "" {
			if parsed, err := strconv.Atoi(d); err == nil {
				days = parsed
			}
		}

		startDate := time.Now()
		if s := c.Query("start"); s != "" {
			if parsed, err := time.Parse("2006-01-02", s); err == nil {
				startDate = parsed
			}
		}
		endDate := startDate.AddDate(0, 0, days)

		// Build Microsoft Graph API URL with filter for date range
		url := fmt.Sprintf("%s/me/calendar/calendarView?startDateTime=%s&endDateTime=%s&$orderby=start/dateTime",
			graphAPIBase,
			startDate.Format("2006-01-02T00:00:00"),
			endDate.Format("2006-01-02T23:59:59"))

		// Create request
		httpReq, err := http.NewRequest("GET", url, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		httpReq.Header.Add("Authorization", "Bearer "+accessToken)

		// Make request
		client := &http.Client{}
		resp, err := client.Do(httpReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Graph API error: %s", string(body))})
			return
		}

		// Parse response
		var result models.GraphEventResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		// Convert to our model
		events := make([]models.CalendarEvent, 0)
		for _, e := range result.Value {
			start, _ := time.Parse(time.RFC3339, e.Start.DateTime)
			end, _ := time.Parse(time.RFC3339, e.End.DateTime)

			attendees := make([]models.User, 0)
			for _, a := range e.Attendees {
				attendees = append(attendees, models.User{
					Email: a.EmailAddress.Address,
					Name:  a.EmailAddress.Name,
				})
			}

			events = append(events, models.CalendarEvent{
				ID:       e.ID,
				Subject:  e.Subject,
				Start:    start,
				End:      end,
				Location: e.Location.DisplayName,
				IsOnline: e.OnlineMeeting.JoinURL != "",
				JoinURL:  e.OnlineMeeting.JoinURL,
				Organizer: &models.User{
					Email: e.Organizer.EmailAddress.Address,
					Name:  e.Organizer.EmailAddress.Name,
				},
				Attendees:   attendees,
				IsCancelled: e.IsCancelled,
			})
		}

		c.JSON(http.StatusOK, events)
	}
}

// fetchCurrentUser gets the details of the authenticated user from Microsoft Graph API
func fetchCurrentUser(accessToken string) (*models.GraphUser, error) {
	url := fmt.Sprintf("%s/me", graphAPIBase)
	httpReq, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	httpReq.Header.Add("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user details: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Graph API error: %s", string(body))
	}

	var user models.GraphUser
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to parse user details: %v", err)
	}

	return &user, nil
}

// POST /api/calendar/availability
func CalendarAvailability(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get access token from context (set by AuthMiddleware)
		accessToken := c.GetString("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		// Fetch current user details
		currentUser, err := fetchCurrentUser(accessToken)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to fetch user details: %v", err)})
			return
		}

		var req models.AvailabilityRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
			return
		}

		// Set the organizer as the current user
		organizerEmail := currentUser.Mail
		if organizerEmail == "" {
			organizerEmail = currentUser.UserPrincipalName // Fallback to UPN if mail is empty
		}
		req.Organizer = &models.User{
			Email: organizerEmail,
			Name:  currentUser.DisplayName,
		}

		// Include the organizer in the request attendees list if not already present
		organizerIncluded := false
		for _, att := range req.Attendees {
			if att.Email == organizerEmail {
				organizerIncluded = true
				break
			}
		}
		if !organizerIncluded {
			req.Attendees = append([]models.User{{Email: organizerEmail, Name: currentUser.DisplayName}}, req.Attendees...)
		}

		// Prepare findMeetingTimes request body
		attendees := make([]map[string]interface{}, len(req.Attendees))
		for i, a := range req.Attendees {
			attendees[i] = map[string]interface{}{
				"emailAddress": map[string]string{
					"address": a.Email,
					"name":    a.Name,
				},
				"type": "Required",
			}
		}

		// Keep the times in UTC for Graph API
		startTime := req.StartTime
		endTime := req.EndTime

		// Log the time range for debugging
		fmt.Printf("Searching for availability between %s and %s UTC\n", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))

		// Convert times to IST for better availability matching
		ist, _ := time.LoadLocation("Asia/Kolkata")
		startTimeIST := startTime.In(ist)
		endTimeIST := endTime.In(ist)

		log.Printf("Original time range: %v to %v", startTime.Format(time.RFC3339), endTime.Format(time.RFC3339))
		log.Printf("IST time range: %v to %v", startTimeIST.Format(time.RFC3339), endTimeIST.Format(time.RFC3339))

		// Adjust to working hours (9 AM - 5 PM IST)
		// For multi-day ranges, use first day
		workingStart := time.Date(startTimeIST.Year(), startTimeIST.Month(), startTimeIST.Day(), 9, 0, 0, 0, ist)
		if startTimeIST.Hour() >= 9 && startTimeIST.Hour() < 17 {
			workingStart = startTimeIST
		}

		// For end time, if it's more than 1 day ahead, use end of first day
		workingEnd := workingStart
		if endTimeIST.Sub(startTimeIST) <= 24*time.Hour {
			workingEnd = time.Date(endTimeIST.Year(), endTimeIST.Month(), endTimeIST.Day(), 17, 0, 0, 0, ist)
			if endTimeIST.Hour() > 9 && endTimeIST.Hour() <= 17 {
				workingEnd = endTimeIST
			}
		} else {
			workingEnd = time.Date(workingStart.Year(), workingStart.Month(), workingStart.Day(), 17, 0, 0, 0, ist)
		}

		log.Printf("Adjusted to working hours (%d:00-%d:00 IST): %s to %s",
			9, 17,
			workingStart.Format("2006-01-02 15:04 MST"),
			workingEnd.Format("2006-01-02 15:04 MST"))

		// First try to get availability using the schedules API
		scheduleRequest := map[string]interface{}{
			"schedules": []string{req.Organizer.Email},
			"startTime": map[string]interface{}{
				"dateTime": workingStart.UTC().Format("2006-01-02T15:04:05"),
				"timeZone": "UTC",
			},
			"endTime": map[string]interface{}{
				"dateTime": workingEnd.UTC().Format("2006-01-02T15:04:05"),
				"timeZone": "UTC",
			},
			"availabilityViewInterval": req.Duration,
		}

		log.Printf("Checking availability with working hours: %v to %v IST",
			workingStart.Format("2006-01-02 15:04:05 MST"),
			workingEnd.Format("2006-01-02 15:04:05 MST"))

		// Create request to Microsoft Graph for schedules
		scheduleUrl := fmt.Sprintf("%s/users/%s/calendar/getSchedule", graphAPIBase, req.Organizer.Email)
		schedulesJson, _ := json.Marshal(scheduleRequest)
		fmt.Printf("Sending schedules request to Microsoft Graph: %s\n", string(schedulesJson))

		client := &http.Client{}
		scheduleReq, _ := http.NewRequest("POST", scheduleUrl, bytes.NewBuffer(schedulesJson))
		scheduleReq.Header.Add("Authorization", "Bearer "+accessToken)
		scheduleReq.Header.Add("Content-Type", "application/json")
		scheduleReq.Header.Add("Prefer", "outlook.timezone=\"Asia/Kolkata\"")

		scheduleResp, err := client.Do(scheduleReq)
		if err == nil && scheduleResp.StatusCode == http.StatusOK {
			var scheduleResult map[string]interface{}
			body, _ := io.ReadAll(scheduleResp.Body)
			scheduleResp.Body.Close()
			fmt.Printf("Schedule API response: %s\n", string(body))

			// Create new reader from body
			if err := json.NewDecoder(bytes.NewReader(body)).Decode(&scheduleResult); err == nil {
				if schedules, ok := scheduleResult["value"].([]interface{}); ok && len(schedules) > 0 {
					if schedule, ok := schedules[0].(map[string]interface{}); ok {
						if view, ok := schedule["availabilityView"].(string); ok {
							// Process the availability view
							var slots []models.TimeSlot
							interval := 60 // 60-minute intervals
							currentTime := startTime

							for i := 0; i < len(view); i++ {
								if view[i] == '0' { // Free slot
									slotStart := currentTime.Add(time.Duration(i*interval) * time.Minute)
									slotEnd := slotStart.Add(time.Duration(req.Duration) * time.Minute)

									slots = append(slots, models.TimeSlot{
										Start: slotStart,
										End:   slotEnd,
										Score: 1.0,
									})
								}
							}

							if len(slots) > 0 {
								c.JSON(http.StatusOK, models.AvailabilityResponse{
									Suggestions: slots,
									Status:      "success",
								})
								return
							}
						}
					}
				}
			}
		}

		// If schedules API didn't work, fall back to findMeetingTimes
		findMeetingRequest := map[string]interface{}{
			"attendees":                 attendees,
			"minimumAttendeePercentage": 100,
			"meetingDuration":           fmt.Sprintf("PT%dM", req.Duration),
			"maxCandidates":             50,
			"returnSuggestionReasons":   true,
			"isOrganizerOptional":       false,
			"organizer": map[string]interface{}{
				"emailAddress": map[string]string{
					"address": req.Organizer.Email,
					"name":    req.Organizer.Name,
				},
			},
			"timeConstraint": map[string]interface{}{
				"activityDomain": "unrestricted", // Changed from "work" to allow more slots
				"timeSlots": []map[string]interface{}{
					{
						"start": map[string]string{
							"dateTime": workingStart.UTC().Format("2006-01-02T15:04:05"),
							"timeZone": "UTC",
						},
						"end": map[string]string{
							"dateTime": workingEnd.UTC().Format("2006-01-02T15:04:05"),
							"timeZone": "UTC",
						},
					},
				},
			},
			"availabilityViewInterval": req.Duration,
		}

		// Convert request to JSON
		jsonBody, err := json.Marshal(findMeetingRequest)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		// Log request for debugging
		fmt.Printf("Sending request to Microsoft Graph: %s\n", string(jsonBody))

		// Create request to Microsoft Graph
		url := fmt.Sprintf("%s/me/findMeetingTimes", graphAPIBase)
		httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		httpReq.Header.Add("Authorization", "Bearer "+accessToken)
		httpReq.Header.Add("Content-Type", "application/json")
		httpReq.Header.Add("Prefer", `outlook.timezone="UTC"`)
		httpReq.Header.Add("Prefer", `outlook.body-content-type="text"`)

		// Make request
		client = &http.Client{}
		resp, err := client.Do(httpReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find meeting times"})
			return
		}
		defer resp.Body.Close()

		// Read response body
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
			return
		}

		// Log response for debugging
		fmt.Printf("Microsoft Graph response (status %d): %s\n", resp.StatusCode, string(body))

		if resp.StatusCode != http.StatusOK {
			c.JSON(resp.StatusCode, gin.H{"error": fmt.Sprintf("Graph API error: %s", string(body))})
			return
		}

		// Create new reader from body for JSON decoding
		resp.Body = io.NopCloser(bytes.NewBuffer(body))

		// Parse response
		var result map[string]interface{}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		// Initialize response
		var response models.AvailabilityResponse
		response.Suggestions = make([]models.TimeSlot, 0)

		// First check availability view for free slots
		if availabilityView, ok := result["availabilityView"].(string); ok && availabilityView != "" {
			// Parse availability view (0=free, 1=tentative, 2=busy, 3=out of office, 4=working elsewhere)
			interval := 15 // matches availabilityViewInterval
			currentTime := startTime
			for i := 0; i < len(availabilityView); i++ {
				if availabilityView[i] == '0' { // Free slot
					slotStart := currentTime.Add(time.Duration(i*interval) * time.Minute)
					slotEnd := slotStart.Add(time.Duration(req.Duration) * time.Minute)

					// Check if slot fits within working hours (9 AM - 5 PM)
					if slotStart.Hour() >= 9 && slotEnd.Hour() <= 17 {
						response.Suggestions = append(response.Suggestions, models.TimeSlot{
							Start: slotStart,
							End:   slotEnd,
							Score: 1.0,
						})
					}
				}
			}

			// If we found free slots, return them
			if len(response.Suggestions) > 0 {
				c.JSON(http.StatusOK, response)
				return
			}
		}

		// If no free slots found, check for empty suggestions reason
		if reason, ok := result["emptySuggestionsReason"].(string); ok && reason != "" {
			var message string
			switch reason {
			case "OrganizerUnavailable":
				message = fmt.Sprintf("No available time slots found within working hours (%d:00-%d:00 IST). Current range: %s to %s",
					9, 17,
					workingStart.Format("2006-01-02 15:04 MST"),
					workingEnd.Format("2006-01-02 15:04 MST"))
			case "AttendeeUnavailable":
				message = "One or more attendees are not available during the requested time period."
			case "LocationUnavailable":
				message = "The requested location is not available during this time period."
			default:
				message = fmt.Sprintf("No available time slots found. Reason: %s", reason)
			}

			log.Printf("Microsoft Graph emptySuggestionsReason: %s", reason)

			c.JSON(http.StatusOK, models.AvailabilityResponse{
				Suggestions: []models.TimeSlot{},
				Reason:      reason,
				Status:      "error",
				Message:     message,
			})
			return
		}

		// Convert meeting suggestions to our model
		meetingTimeSuggestions, ok := result["meetingTimeSuggestions"].([]interface{})
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid response format"})
			return
		}

		for _, suggestion := range meetingTimeSuggestions {
			s, ok := suggestion.(map[string]interface{})
			if !ok {
				continue
			}

			meetingTime, ok := s["meetingTimeSlot"].(map[string]interface{})
			if !ok {
				continue
			}

			start, ok1 := meetingTime["start"].(map[string]interface{})
			end, ok2 := meetingTime["end"].(map[string]interface{})
			if !ok1 || !ok2 {
				continue
			}

			startTime, _ := time.Parse(time.RFC3339, start["dateTime"].(string))
			endTime, _ := time.Parse(time.RFC3339, end["dateTime"].(string))

			// Check if this suggestion has a confidence score
			score := 0.0
			if scoreVal, ok := s["confidence"].(float64); ok {
				score = scoreVal
			}

			response.Suggestions = append(response.Suggestions, models.TimeSlot{
				Start: startTime,
				End:   endTime,
				Score: score,
			})
		}

		c.JSON(http.StatusOK, response)
	}
}
