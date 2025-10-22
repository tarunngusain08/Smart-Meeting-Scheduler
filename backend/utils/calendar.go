package utils

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
)

// TimeSlot represents a time slot for a meeting
type TimeSlot struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// AvailabilityRequest represents a request to check availability
type AvailabilityRequest struct {
	Attendees []string `json:"attendees"`
	TimeSlot  TimeSlot `json:"timeSlot"`
}

// MeetingRequest represents a request to schedule a meeting
type MeetingRequest struct {
	Subject     string   `json:"subject"`
	Start       TimeSlot `json:"timeSlot"`
	Attendees   []string `json:"attendees"`
	Description string   `json:"description"`
}

// EventResponse represents a calendar event
type EventResponse struct {
	ID              string    `json:"id"`
	Subject         string    `json:"subject"`
	Start           time.Time `json:"start"`
	End             time.Time `json:"end"`
	JoinURL         string    `json:"joinUrl,omitempty"`
	IsOnlineMeeting bool      `json:"isOnlineMeeting"`
}

// AvailabilityResponse represents the availability check response
type AvailabilityResponse struct {
	Email     string          `json:"email"`
	Events    []EventResponse `json:"events"`
	Available bool            `json:"available"`
}

// createOnlineMeeting creates a Teams online meeting
func createOnlineMeeting(client *msgraphsdk.GraphServiceClient, req MeetingRequest) (graphmodels.OnlineMeetingable, error) {
	meeting := graphmodels.NewOnlineMeeting()
	meeting.SetSubject(&req.Subject)
	meeting.SetStartDateTime(&req.Start.Start)
	meeting.SetEndDateTime(&req.Start.End)

	return client.Me().OnlineMeetings().Post(context.Background(), meeting, nil)
}

// createCalendarEvent creates a calendar event with Teams meeting info
func createCalendarEvent(client *msgraphsdk.GraphServiceClient, req MeetingRequest, onlineMeeting graphmodels.OnlineMeetingable) (graphmodels.Eventable, error) {
	event := graphmodels.NewEvent()
	event.SetSubject(&req.Subject)

	// Set times
	startTime := graphmodels.NewDateTimeTimeZone()
	startStr := req.Start.Start.Format(time.RFC3339)
	timezone := "UTC"
	startTime.SetDateTime(&startStr)
	startTime.SetTimeZone(&timezone)
	event.SetStart(startTime)

	endTime := graphmodels.NewDateTimeTimeZone()
	endStr := req.Start.End.Format(time.RFC3339)
	endTime.SetDateTime(&endStr)
	endTime.SetTimeZone(&timezone)
	event.SetEnd(endTime)

	// Set description with Teams URL
	body := graphmodels.NewItemBody()
	bodyType := graphmodels.TEXT_BODYTYPE
	content := fmt.Sprintf("%s\n\nTeams meeting join URL: %s",
		req.Description,
		*onlineMeeting.GetJoinWebUrl())
	body.SetContentType(&bodyType)
	body.SetContent(&content)
	event.SetBody(body)

	// Set attendees
	attendees := make([]graphmodels.Attendeeable, len(req.Attendees))
	for i, email := range req.Attendees {
		attendee := graphmodels.NewAttendee()
		emailAddr := graphmodels.NewEmailAddress()
		emailAddr.SetAddress(&email)
		attendee.SetEmailAddress(emailAddr)
		attendees[i] = attendee
	}
	event.SetAttendees(attendees)

	// Enable Teams meeting
	isOnlineMeeting := true
	event.SetIsOnlineMeeting(&isOnlineMeeting)

	return client.Me().Events().Post(context.Background(), event, nil)
}

// getCalendarEvents gets calendar events for a user in a time range
func getCalendarEvents(client *msgraphsdk.GraphServiceClient, email string, timeSlot TimeSlot) ([]EventResponse, error) {
	// Get user's calendar events for the time period
	events, err := client.Users().ByUserId(email).Calendar().
		CalendarView().
		Get(context.Background(), nil)

	if err != nil {
		return nil, err
	}

	// Convert events to response format
	eventList := make([]EventResponse, 0)
	for _, event := range events.GetValue() {
		startTime := event.GetStart().GetDateTime()
		endTime := event.GetEnd().GetDateTime()

		if startTime != nil && endTime != nil {
			start, _ := time.Parse(time.RFC3339, *startTime)
			end, _ := time.Parse(time.RFC3339, *endTime)

			// Check if event overlaps with requested time slot
			if !(end.Before(timeSlot.Start) || start.After(timeSlot.End)) {
				eventList = append(eventList, EventResponse{
					ID:              *event.GetId(),
					Subject:         *event.GetSubject(),
					Start:           start,
					End:             end,
					IsOnlineMeeting: *event.GetIsOnlineMeeting(),
				})
			}
		}
	}

	return eventList, nil
}

// ScheduleMeeting creates a new Teams meeting and calendar event
func ScheduleMeeting(token string, req MeetingRequest) ([]byte, error) {
	client, err := GetGraphClient(token)
	if err != nil {
		return nil, fmt.Errorf("failed to create graph client: %v", err)
	}

	// First create Teams meeting
	onlineMeeting, err := createOnlineMeeting(client, req)
	if err != nil {
		return nil, fmt.Errorf("failed to create Teams meeting: %v", err)
	}

	// Then create calendar event with Teams meeting info
	event, err := createCalendarEvent(client, req, onlineMeeting)
	if err != nil {
		return nil, fmt.Errorf("failed to create calendar event: %v", err)
	}

	// Convert to response format
	response := EventResponse{
		ID:              *event.GetId(),
		Subject:         *event.GetSubject(),
		Start:           req.Start.Start,
		End:             req.Start.End,
		JoinURL:         *onlineMeeting.GetJoinWebUrl(),
		IsOnlineMeeting: true,
	}

	return json.Marshal(response)
}

// GetUserAvailability checks calendar availability for all attendees
func GetUserAvailability(token string, req AvailabilityRequest) ([]byte, error) {
	client, err := GetGraphClient(token)
	if err != nil {
		return nil, fmt.Errorf("failed to create graph client: %v", err)
	}

	responses := make([]AvailabilityResponse, len(req.Attendees))
	for i, email := range req.Attendees {
		events, err := getCalendarEvents(client, email, req.TimeSlot)

		if err != nil {
			responses[i] = AvailabilityResponse{
				Email:     email,
				Events:    nil,
				Available: false,
			}
			continue
		}

		responses[i] = AvailabilityResponse{
			Email:     email,
			Events:    events,
			Available: len(events) == 0, // Available if no conflicting events
		}
	}

	return json.Marshal(map[string]interface{}{
		"timeSlot":  req.TimeSlot,
		"attendees": responses,
		"allAvailable": func() bool {
			for _, r := range responses {
				if !r.Available {
					return false
				}
			}
			return true
		}(),
	})
}
