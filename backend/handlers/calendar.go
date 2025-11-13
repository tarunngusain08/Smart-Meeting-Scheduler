package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/services"
	"Smart-Meeting-Scheduler/utils"
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
	"github.com/gin-gonic/gin"
)

// CalendarEvents retrieves calendar events using Microsoft Graph SDK
// Uses calendarView endpoint with startDateTime and endDateTime parameters
func CalendarEvents(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		accessToken := utils.GetAccessTokenFromContext(c)
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		userEmail := c.Query("email")
		startTimeStr := c.Query("startTime")
		endTimeStr := c.Query("endTime")

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

		// Format times as RFC3339 strings for Graph API
		startDateTime := startTime.Format(time.RFC3339)
		endDateTime := endTime.Format(time.RFC3339)

		// Check if we're in real mode or mock mode
		graphMode := strings.ToLower(os.Getenv("GRAPH_MODE"))
		if graphMode == "real" {
			// Use Microsoft Graph SDK
			events, err := fetchCalendarViewWithGraphSDK(accessToken, userEmail, startDateTime, endDateTime)
			if err != nil {
				log.Printf("Failed to fetch calendar events: %v", err)
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
			return
		}

		// Mock mode - use existing GraphClient interface
		client := getGraphClient(accessToken, cfg)
		if userEmail == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "email parameter is required in mock mode"})
			return
		}

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

// fetchCalendarViewWithGraphSDK fetches calendar events using Microsoft Graph SDK
func fetchCalendarViewWithGraphSDK(accessToken, userEmail, startDateTime, endDateTime string) ([]models.Event, error) {
	// Initialize Graph SDK client
	authProvider := &services.TokenAuthProvider{AccessToken: accessToken}
	adapter, err := msgraphsdk.NewGraphRequestAdapter(authProvider)
	if err != nil {
		return nil, fmt.Errorf("error creating graph adapter: %v", err)
	}
	graphClient := msgraphsdk.NewGraphServiceClient(adapter)

	// Set up headers with timezone preference
	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.timezone=\"UTC\"")

	// Set up query parameters
	requestParameters := &graphusers.ItemCalendarViewRequestBuilderGetQueryParameters{
		StartDateTime: &startDateTime,
		EndDateTime:   &endDateTime,
		Select:        []string{"subject", "body", "bodyPreview", "organizer", "attendees", "start", "end", "location", "onlineMeeting"},
	}

	configuration := &graphusers.ItemCalendarViewRequestBuilderGetRequestConfiguration{
		Headers:       headers,
		QueryParameters: requestParameters,
	}

	// Fetch calendar view
	var calendarView []graphmodels.Eventable
	if userEmail == "" {
		// Use /me/calendarView for authenticated user
		result, err := graphClient.Me().CalendarView().Get(context.Background(), configuration)
		if err != nil {
			return nil, fmt.Errorf("failed to get calendar view: %v", err)
		}
		calendarView = result.GetValue()
	} else {
		// Use /users/{email}/calendarView for specific user
		result, err := graphClient.Users().ByUserId(userEmail).CalendarView().Get(context.Background(), configuration)
		if err != nil {
			return nil, fmt.Errorf("failed to get calendar view: %v", err)
		}
		calendarView = result.GetValue()
	}

	// Convert Graph API events to models.Event
	var events []models.Event
	for _, item := range calendarView {
		event := convertGraphEventToModel(item)
		events = append(events, event)
	}

	return events, nil
}

// convertGraphEventToModel converts a Graph API event to models.Event
func convertGraphEventToModel(item graphmodels.Eventable) models.Event {
	event := models.Event{}

	if id := item.GetId(); id != nil {
		event.ID = *id
	}
	if subject := item.GetSubject(); subject != nil {
		event.Subject = *subject
	}
	if bodyPreview := item.GetBodyPreview(); bodyPreview != nil {
		event.BodyPreview = *bodyPreview
	}

	// Parse start time
	if start := item.GetStart(); start != nil {
		if dateTime := start.GetDateTime(); dateTime != nil {
			if t, err := time.Parse(time.RFC3339, *dateTime); err == nil {
				event.Start = t
			}
		}
	}

	// Parse end time
	if end := item.GetEnd(); end != nil {
		if dateTime := end.GetDateTime(); dateTime != nil {
			if t, err := time.Parse(time.RFC3339, *dateTime); err == nil {
				event.End = t
			}
		}
	}

	// Get organizer
	if organizer := item.GetOrganizer(); organizer != nil {
		if emailAddr := organizer.GetEmailAddress(); emailAddr != nil {
			if address := emailAddr.GetAddress(); address != nil {
				event.Organizer = *address
			}
		}
	}

	// Get attendees
	attendees := []string{}
	for _, att := range item.GetAttendees() {
		if emailAddr := att.GetEmailAddress(); emailAddr != nil {
			if address := emailAddr.GetAddress(); address != nil {
				attendees = append(attendees, *address)
			}
		}
	}
	event.Attendees = attendees

	// Get location
	if location := item.GetLocation(); location != nil {
		if displayName := location.GetDisplayName(); displayName != nil {
			event.Location = *displayName
		}
	}

	// Get online meeting URL
	if onlineMeeting := item.GetOnlineMeeting(); onlineMeeting != nil {
		if joinUrl := onlineMeeting.GetJoinUrl(); joinUrl != nil {
			event.OnlineURL = *joinUrl
			event.IsOnline = true
		}
	}

	return event
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
