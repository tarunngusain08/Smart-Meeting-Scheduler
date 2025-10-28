package services

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"context"
	"fmt"
	"time"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
)

// GraphAPIClient implements GraphClient using Microsoft Graph SDK
type GraphAPIClient struct {
	Client      *msgraphsdk.GraphServiceClient
	AccessToken string
	Config      *config.Config
}

// NewGraphAPIClient creates a new GraphAPIClient instance
func NewGraphAPIClient(accessToken string, cfg *config.Config) *GraphAPIClient {
	client := InitializeGraphClient(accessToken)
	return &GraphAPIClient{
		Client:      client,
		AccessToken: accessToken,
		Config:      cfg,
	}
}

// InitializeGraphClient initializes the Microsoft Graph SDK client
func InitializeGraphClient(accessToken string) *msgraphsdk.GraphServiceClient {
	authProvider := &TokenAuthProvider{AccessToken: accessToken}
	adapter, err := msgraphsdk.NewGraphRequestAdapter(authProvider)
	if err != nil {
		panic(fmt.Sprintf("Error creating adapter: %v", err))
	}
	return msgraphsdk.NewGraphServiceClient(adapter)
}

// TokenAuthProvider implements authentication for Graph SDK
type TokenAuthProvider struct {
	AccessToken string
}

func (t *TokenAuthProvider) AuthenticateRequest(ctx context.Context, request *abstractions.RequestInformation, additionalAuthenticationContext map[string]interface{}) error {
	request.Headers.Add("Authorization", "Bearer "+t.AccessToken)
	return nil
}

// GetCalendarView retrieves calendar events for a user within a time range
func (c *GraphAPIClient) GetCalendarView(userEmail string, startTime, endTime time.Time) ([]models.Event, error) {
	requestStartDateTime := startTime.Format(time.RFC3339)
	requestEndDateTime := endTime.Format(time.RFC3339)

	requestParams := &graphusers.ItemCalendarViewRequestBuilderGetQueryParameters{
		StartDateTime: &requestStartDateTime,
		EndDateTime:   &requestEndDateTime,
	}
	config := &graphusers.ItemCalendarViewRequestBuilderGetRequestConfiguration{
		QueryParameters: requestParams,
	}

	calendarView, err := c.Client.Users().ByUserId(userEmail).CalendarView().Get(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to get calendar view: %v", err)
	}

	var events []models.Event
	for _, item := range calendarView.GetValue() {
		start, _ := time.Parse(time.RFC3339, *item.GetStart().GetDateTime())
		end, _ := time.Parse(time.RFC3339, *item.GetEnd().GetDateTime())
		
		organizer := ""
		if item.GetOrganizer() != nil && item.GetOrganizer().GetEmailAddress() != nil {
			organizer = *item.GetOrganizer().GetEmailAddress().GetAddress()
		}

		attendees := []string{}
		for _, att := range item.GetAttendees() {
			if att.GetEmailAddress() != nil && att.GetEmailAddress().GetAddress() != nil {
				attendees = append(attendees, *att.GetEmailAddress().GetAddress())
			}
		}

		onlineURL := ""
		if item.GetOnlineMeeting() != nil && item.GetOnlineMeeting().GetJoinUrl() != nil {
			onlineURL = *item.GetOnlineMeeting().GetJoinUrl()
		}

		events = append(events, models.Event{
			ID:        *item.GetId(),
			Subject:   *item.GetSubject(),
			Start:     start,
			End:       end,
			Organizer: organizer,
			Attendees: attendees,
			OnlineURL: onlineURL,
			IsOnline:  onlineURL != "",
		})
	}
	return events, nil
}

// GetUserEvents retrieves all events for a user within a time range
func (c *GraphAPIClient) GetUserEvents(userEmail string, startTime, endTime time.Time) ([]models.Event, error) {
	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.timezone=\"Pacific Standard Time\"")

	params := &graphusers.ItemEventsRequestBuilderGetQueryParameters{
		Select: []string{"subject", "bodyPreview", "organizer", "attendees", "start", "end", "location", "onlineMeeting"},
	}
	config := &graphusers.ItemEventsRequestBuilderGetRequestConfiguration{
		Headers:         headers,
		QueryParameters: params,
	}

	eventsResp, err := c.Client.Users().ByUserId(userEmail).Events().Get(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to get user events: %v", err)
	}

	var events []models.Event
	for _, item := range eventsResp.GetValue() {
		start, _ := time.Parse(time.RFC3339, *item.GetStart().GetDateTime())
		end, _ := time.Parse(time.RFC3339, *item.GetEnd().GetDateTime())

		// Filter by time range
		if start.Before(startTime) || end.After(endTime) {
			continue
		}

		organizer := ""
		if item.GetOrganizer() != nil && item.GetOrganizer().GetEmailAddress() != nil {
			organizer = *item.GetOrganizer().GetEmailAddress().GetAddress()
		}

		attendees := []string{}
		for _, att := range item.GetAttendees() {
			if att.GetEmailAddress() != nil && att.GetEmailAddress().GetAddress() != nil {
				attendees = append(attendees, *att.GetEmailAddress().GetAddress())
			}
		}

		onlineURL := ""
		if item.GetOnlineMeeting() != nil && item.GetOnlineMeeting().GetJoinUrl() != nil {
			onlineURL = *item.GetOnlineMeeting().GetJoinUrl()
		}

		location := ""
		if item.GetLocation() != nil && item.GetLocation().GetDisplayName() != nil {
			location = *item.GetLocation().GetDisplayName()
		}

		bodyPreview := ""
		if item.GetBodyPreview() != nil {
			bodyPreview = *item.GetBodyPreview()
		}

		events = append(events, models.Event{
			ID:          *item.GetId(),
			Subject:     *item.GetSubject(),
			Start:       start,
			End:         end,
			Organizer:   organizer,
			Attendees:   attendees,
			OnlineURL:   onlineURL,
			Location:    location,
			BodyPreview: bodyPreview,
			IsOnline:    onlineURL != "",
		})
	}

	return events, nil
}

// FindMeetingTimes finds available meeting times for a group of attendees
func (c *GraphAPIClient) FindMeetingTimes(organizer string, attendees []string, duration time.Duration, startTime, endTime time.Time) ([]models.MeetingSuggestion, error) {
	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.timezone=\"Pacific Standard Time\"")

	config := &graphusers.ItemFindMeetingTimesRequestBuilderPostRequestConfiguration{
		Headers: headers,
	}
	body := graphusers.NewItemFindMeetingTimesPostRequestBody()

	var attendeeObjs []graphmodels.AttendeeBaseable
	for _, a := range attendees {
		ab := graphmodels.NewAttendeeBase()
		email := graphmodels.NewEmailAddress()
		email.SetAddress(&a)
		ab.SetEmailAddress(email)
		attendeeObjs = append(attendeeObjs, ab)
	}
	body.SetAttendees(attendeeObjs)

	// Set max candidates for suggestions
	maxCandidates := int32(5)
	body.SetMaxCandidates(&maxCandidates)

	ts := graphmodels.NewTimeSlot()
	start := graphmodels.NewDateTimeTimeZone()
	startStr := startTime.Format("2006-01-02T15:04:05")
	start.SetDateTime(&startStr)
	tz := "Pacific Standard Time"
	start.SetTimeZone(&tz)
	ts.SetStart(start)

	end := graphmodels.NewDateTimeTimeZone()
	endStr := endTime.Format("2006-01-02T15:04:05")
	end.SetDateTime(&endStr)
	end.SetTimeZone(&tz)
	ts.SetEnd(end)

	tc := graphmodels.NewTimeConstraint()
	tc.SetTimeSlots([]graphmodels.TimeSlotable{ts})
	body.SetTimeConstraint(tc)

	resp, err := c.Client.Users().ByUserId(organizer).FindMeetingTimes().Post(context.Background(), body, config)
	if err != nil {
		return nil, fmt.Errorf("failed to find meeting times: %v", err)
	}

	var suggestions []models.MeetingSuggestion
	for _, s := range resp.GetMeetingTimeSuggestions() {
		start, _ := time.Parse(time.RFC3339, *s.GetMeetingTimeSlot().GetStart().GetDateTime())
		end, _ := time.Parse(time.RFC3339, *s.GetMeetingTimeSlot().GetEnd().GetDateTime())
		
		confidence := 0.0
		if s.GetConfidence() != nil {
			confidence = float64(*s.GetConfidence())
		}

		suggestions = append(suggestions, models.MeetingSuggestion{
			Start:      start,
			End:        end,
			Confidence: confidence,
		})
	}
	return suggestions, nil
}

// CreateOnlineMeeting creates a new online meeting (Teams meeting)
func (c *GraphAPIClient) CreateOnlineMeeting(organizer string, start time.Time, end time.Time, subject string, attendees []string) (models.Event, error) {
	body := graphmodels.NewOnlineMeeting()
	body.SetStartDateTime(&start)
	body.SetEndDateTime(&end)
	body.SetSubject(&subject)

	resp, err := c.Client.Users().ByUserId(organizer).OnlineMeetings().Post(context.Background(), body, nil)
	if err != nil {
		return models.Event{}, fmt.Errorf("failed to create online meeting: %v", err)
	}

	return models.Event{
		ID:        *resp.GetId(),
		Subject:   *resp.GetSubject(),
		Start:     start,
		End:       end,
		Organizer: organizer,
		Attendees: attendees,
		OnlineURL: *resp.GetJoinWebUrl(),
		IsOnline:  true,
	}, nil
}

// CreateCalendarEvent creates a regular calendar event
func (c *GraphAPIClient) CreateCalendarEvent(organizer string, event models.CreateMeetingRequest) (models.Event, error) {
	body := graphmodels.NewEvent()
	body.SetSubject(&event.Subject)

	// Set start time
	start := graphmodels.NewDateTimeTimeZone()
	startStr := event.Start.Format(time.RFC3339)
	start.SetDateTime(&startStr)
	tz := "Pacific Standard Time"
	start.SetTimeZone(&tz)
	body.SetStart(start)

	// Set end time
	end := graphmodels.NewDateTimeTimeZone()
	endStr := event.End.Format(time.RFC3339)
	end.SetDateTime(&endStr)
	end.SetTimeZone(&tz)
	body.SetEnd(end)

	// Set attendees
	var attendeeObjs []graphmodels.Attendeeable
	for _, email := range event.Attendees {
		attendee := graphmodels.NewAttendee()
		emailAddr := graphmodels.NewEmailAddress()
		emailAddr.SetAddress(&email)
		attendee.SetEmailAddress(emailAddr)
		attendeeObjs = append(attendeeObjs, attendee)
	}
	body.SetAttendees(attendeeObjs)

	// Set body/description
	if event.Description != "" {
		eventBody := graphmodels.NewItemBody()
		contentType := graphmodels.TEXT_BODYTYPE
		eventBody.SetContentType(&contentType)
		eventBody.SetContent(&event.Description)
		body.SetBody(eventBody)
	}

	// Set location
	if event.Location != "" {
		location := graphmodels.NewLocation()
		location.SetDisplayName(&event.Location)
		body.SetLocation(location)
	}

	// Set online meeting if requested
	if event.IsOnline {
		isOnline := true
		body.SetIsOnlineMeeting(&isOnline)
		onlineMeetingProvider := graphmodels.TEAMSFORBUSINESS_ONLINEMEETINGPROVIDERTYPE
		body.SetOnlineMeetingProvider(&onlineMeetingProvider)
	}

	resp, err := c.Client.Users().ByUserId(organizer).Events().Post(context.Background(), body, nil)
	if err != nil {
		return models.Event{}, fmt.Errorf("failed to create calendar event: %v", err)
	}

	onlineURL := ""
	if resp.GetOnlineMeeting() != nil && resp.GetOnlineMeeting().GetJoinUrl() != nil {
		onlineURL = *resp.GetOnlineMeeting().GetJoinUrl()
	}

	return models.Event{
		ID:        *resp.GetId(),
		Subject:   event.Subject,
		Start:     event.Start,
		End:       event.End,
		Organizer: organizer,
		Attendees: event.Attendees,
		Location:  event.Location,
		OnlineURL: onlineURL,
		IsOnline:  event.IsOnline,
	}, nil
}

// GetAvailability checks availability for a user within a time range
func (c *GraphAPIClient) GetAvailability(userEmail string, startTime, endTime time.Time) (models.AvailabilityResponse, error) {
	// Get calendar events
	events, err := c.GetCalendarView(userEmail, startTime, endTime)
	if err != nil {
		return models.AvailabilityResponse{}, err
	}

	// Calculate busy and free slots
	busySlots := []models.TimeSlot{}
	for _, event := range events {
		busySlots = append(busySlots, models.TimeSlot{
			Start: event.Start,
			End:   event.End,
		})
	}

	// Calculate free slots (simplified - assumes 9 AM to 5 PM working hours)
	freeSlots := calculateFreeSlots(startTime, endTime, busySlots)

	// Calculate total times
	totalBusyTime := 0
	for _, slot := range busySlots {
		totalBusyTime += int(slot.End.Sub(slot.Start).Minutes())
	}

	totalFreeTime := 0
	for _, slot := range freeSlots {
		totalFreeTime += int(slot.End.Sub(slot.Start).Minutes())
	}

	return models.AvailabilityResponse{
		UserEmail: userEmail,
		FreeSlots: freeSlots,
		BusySlots: busySlots,
		WorkingHours: models.TimeSlot{
			Start: startTime,
			End:   endTime,
		},
		TotalFreeTime: totalFreeTime,
		TotalBusyTime: totalBusyTime,
	}, nil
}

// calculateFreeSlots calculates free time slots between busy slots
func calculateFreeSlots(startTime, endTime time.Time, busySlots []models.TimeSlot) []models.TimeSlot {
	if len(busySlots) == 0 {
		return []models.TimeSlot{{Start: startTime, End: endTime}}
	}

	// Sort busy slots by start time
	for i := 0; i < len(busySlots)-1; i++ {
		for j := i + 1; j < len(busySlots); j++ {
			if busySlots[j].Start.Before(busySlots[i].Start) {
				busySlots[i], busySlots[j] = busySlots[j], busySlots[i]
			}
		}
	}

	freeSlots := []models.TimeSlot{}
	currentTime := startTime

	for _, busy := range busySlots {
		if currentTime.Before(busy.Start) {
			freeSlots = append(freeSlots, models.TimeSlot{
				Start: currentTime,
				End:   busy.Start,
			})
		}
		if busy.End.After(currentTime) {
			currentTime = busy.End
		}
	}

	if currentTime.Before(endTime) {
		freeSlots = append(freeSlots, models.TimeSlot{
			Start: currentTime,
			End:   endTime,
		})
	}

	return freeSlots
}
