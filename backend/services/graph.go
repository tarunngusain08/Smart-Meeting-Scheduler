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
// Uses calendarView endpoint with startDateTime and endDateTime for proper time range filtering
//
// IMPORTANT PERMISSIONS NOTE:
// - With Delegated permissions (user tokens): Can only access own calendar (/me) or shared calendars
// - With Application permissions: Can access any user's calendar using client credentials token
//
// This function tries to use Application permissions (client credentials) when accessing other users' calendars
func (c *GraphAPIClient) GetUserEvents(userEmail string, startTime, endTime time.Time) ([]models.Event, error) {
	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", "outlook.timezone=\"UTC\"")

	// Format times as RFC3339 strings for Graph API
	startDateTime := startTime.Format(time.RFC3339)
	endDateTime := endTime.Format(time.RFC3339)

	params := &graphusers.ItemCalendarViewRequestBuilderGetQueryParameters{
		StartDateTime: &startDateTime,
		EndDateTime:   &endDateTime,
		Select:        []string{"subject", "bodyPreview", "organizer", "attendees", "start", "end", "location", "onlineMeeting"},
	}
	config := &graphusers.ItemCalendarViewRequestBuilderGetRequestConfiguration{
		Headers:         headers,
		QueryParameters: params,
	}

	// Try with current token (delegated/user token) first
	eventsResp, err := c.Client.Users().ByUserId(userEmail).CalendarView().Get(context.Background(), config)
	if err != nil {
		// If it fails, try using Application permissions (client credentials token)
		// This allows accessing any user's calendar if Application permissions are granted
		if c.Config != nil {
			appToken, appErr := c.Config.GetAccessToken()
			if appErr == nil && appToken != "" {
				// Create a new client with application token
				appClient := InitializeGraphClient(appToken)
				eventsResp, err = appClient.Users().ByUserId(userEmail).CalendarView().Get(context.Background(), config)
				if err == nil {
					// Success with application token
				} else {
					return nil, fmt.Errorf("failed to get user events for %s with both delegated and application tokens: %v. Ensure Application permissions (Calendars.Read) are granted and admin consent is provided", userEmail, err)
				}
			} else {
				return nil, fmt.Errorf("failed to get user events for %s: %v. Also failed to get application token: %v. With delegated permissions, you can only access your own calendar (/me) or calendars shared with you. To access other users' calendars, ensure Application permissions (Calendars.Read) are granted", userEmail, err, appErr)
			}
		} else {
			return nil, fmt.Errorf("failed to get user events for %s: %v. With delegated permissions, you can only access your own calendar (/me) or calendars shared with you. To access other users' calendars, you need Application permissions (Calendars.Read) with admin consent", userEmail, err)
		}
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

	// Use /me/events endpoint for authenticated user's calendar
	// The access token is scoped to the authenticated user, so /me/events is most reliable
	// The organizer parameter is metadata - the event is created in the authenticated user's calendar
	resp, err := c.Client.Me().Events().Post(context.Background(), body, nil)
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

// GetAvailability checks availability for a user within a time range (UTC working hours)
func (c *GraphAPIClient) GetAvailability(userEmail string, startTime, endTime time.Time) (models.AvailabilityResponse, error) {
	return c.GetAvailabilityWithTimezone(userEmail, startTime, endTime, "")
}

// GetAvailabilityWithTimezone checks availability with timezone-aware working hours filtering
func (c *GraphAPIClient) GetAvailabilityWithTimezone(userEmail string, startTime, endTime time.Time, timezone string) (models.AvailabilityResponse, error) {
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

	// Calculate free slots filtered by working hours in the specified timezone
	standardSlots, extendedSlots := calculateFreeSlots(startTime, endTime, busySlots, timezone)

	// Calculate total times
	totalBusyTime := 0
	for _, slot := range busySlots {
		totalBusyTime += int(slot.End.Sub(slot.Start).Minutes())
	}

	// Calculate total free time for standard hours
	totalFreeTime := 0
	for _, slot := range standardSlots {
		totalFreeTime += int(slot.End.Sub(slot.Start).Minutes())
	}

	// Calculate total free time for extended hours
	totalExtendedFreeTime := 0
	for _, slot := range extendedSlots {
		totalExtendedFreeTime += int(slot.End.Sub(slot.Start).Minutes())
	}

	// Determine actual working hours based on standard free slots
	workingHoursStart := startTime
	workingHoursEnd := endTime
	if len(standardSlots) > 0 {
		workingHoursStart = standardSlots[0].Start
		workingHoursEnd = standardSlots[len(standardSlots)-1].End
	} else if len(extendedSlots) > 0 {
		// If no standard slots, use extended slots for working hours
		workingHoursStart = extendedSlots[0].Start
		workingHoursEnd = extendedSlots[len(extendedSlots)-1].End
	}

	// Ensure arrays are never nil (return empty slices)
	if standardSlots == nil {
		standardSlots = []models.TimeSlot{}
	}
	if extendedSlots == nil {
		extendedSlots = []models.TimeSlot{}
	}
	if busySlots == nil {
		busySlots = []models.TimeSlot{}
	}

	return models.AvailabilityResponse{
		UserEmail:          userEmail,
		FreeSlots:          standardSlots,
		ExtendedHoursSlots: extendedSlots,
		BusySlots:          busySlots,
		WorkingHours: models.TimeSlot{
			Start: workingHoursStart,
			End:   workingHoursEnd,
		},
		TotalFreeTime: totalFreeTime,
		TotalBusyTime: totalBusyTime,
	}, nil
}

// calculateFreeSlots calculates free time slots between busy slots, filtered by working hours
// Returns standard hours slots and extended hours slots separately
func calculateFreeSlots(startTime, endTime time.Time, busySlots []models.TimeSlot, timezone string) ([]models.TimeSlot, []models.TimeSlot) {
	if len(busySlots) == 0 {
		filtered := filterByWorkingHours([]models.TimeSlot{{Start: startTime, End: endTime}}, timezone)
		return filtered.Standard, filtered.Extended
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

	filtered := filterByWorkingHours(freeSlots, timezone)
	return filtered.Standard, filtered.Extended
}

// filterByWorkingHours filters time slots into standard (9am-6pm) and extended (7-9am, 6-11pm) hours
// If timezone is provided (IANA format like "Asia/Kolkata"), working hours are applied in that timezone
// Returns both standard and extended hours slots separately
func filterByWorkingHours(slots []models.TimeSlot, timezone string) struct {
	Standard []models.TimeSlot
	Extended []models.TimeSlot
} {
	const (
		standardStart = 9  // 9 AM
		standardEnd   = 18 // 6 PM
		extendedStart = 7  // 7 AM
		extendedEnd   = 23 // 11 PM
	)

	// Load timezone location
	var loc *time.Location
	var err error
	if timezone != "" {
		loc, err = time.LoadLocation(timezone)
		if err != nil {
			// Fallback to UTC if timezone is invalid
			loc = time.UTC
		}
	} else {
		loc = time.UTC
	}

	var standardHoursSlots []models.TimeSlot
	var extendedHoursSlots []models.TimeSlot

	for _, slot := range slots {
		// Convert slot times to the target timezone
		slotStartInTZ := slot.Start.In(loc)
		slotEndInTZ := slot.End.In(loc)

		// Process each day in the slot separately
		current := slotStartInTZ
		for current.Before(slotEndInTZ) {
			dayStart := time.Date(current.Year(), current.Month(), current.Day(), 0, 0, 0, 0, loc)
			dayEnd := dayStart.AddDate(0, 0, 1)

			// Skip weekends (Saturday = 6, Sunday = 0)
			weekday := current.Weekday()
			if weekday == time.Saturday || weekday == time.Sunday {
				current = dayEnd
				continue
			}

			// Standard working hours for this day (in target timezone)
			standardDayStart := time.Date(current.Year(), current.Month(), current.Day(), standardStart, 0, 0, 0, loc)
			standardDayEnd := time.Date(current.Year(), current.Month(), current.Day(), standardEnd, 0, 0, 0, loc)

			// Extended working hours for this day (in target timezone)
			extendedDayStart := time.Date(current.Year(), current.Month(), current.Day(), extendedStart, 0, 0, 0, loc)
			extendedDayEnd := time.Date(current.Year(), current.Month(), current.Day(), extendedEnd, 0, 0, 0, loc)

			slotStart := current
			slotEnd := slotEndInTZ
			if slotEnd.After(dayEnd) {
				slotEnd = dayEnd
			}

			// Check for standard hours overlap
			if slotStart.Before(standardDayEnd) && slotEnd.After(standardDayStart) {
				overlapStart := slotStart
				if overlapStart.Before(standardDayStart) {
					overlapStart = standardDayStart
				}
				overlapEnd := slotEnd
				if overlapEnd.After(standardDayEnd) {
					overlapEnd = standardDayEnd
				}
				if overlapStart.Before(overlapEnd) {
					standardHoursSlots = append(standardHoursSlots, models.TimeSlot{
						Start: overlapStart,
						End:   overlapEnd,
					})
				}
			}

			// Check for extended hours overlap (excluding standard hours)
			// Before standard hours (7am-9am)
			if slotStart.Before(standardDayStart) && slotEnd.After(extendedDayStart) {
				overlapStart := slotStart
				if overlapStart.Before(extendedDayStart) {
					overlapStart = extendedDayStart
				}
				overlapEnd := slotEnd
				if overlapEnd.After(standardDayStart) {
					overlapEnd = standardDayStart
				}
				if overlapStart.Before(overlapEnd) {
					extendedHoursSlots = append(extendedHoursSlots, models.TimeSlot{
						Start: overlapStart,
						End:   overlapEnd,
					})
				}
			}

			// After standard hours (6pm-11pm)
			if slotStart.Before(extendedDayEnd) && slotEnd.After(standardDayEnd) {
				overlapStart := slotStart
				if overlapStart.Before(standardDayEnd) {
					overlapStart = standardDayEnd
				}
				overlapEnd := slotEnd
				if overlapEnd.After(extendedDayEnd) {
					overlapEnd = extendedDayEnd
				}
				if overlapStart.Before(overlapEnd) {
					extendedHoursSlots = append(extendedHoursSlots, models.TimeSlot{
						Start: overlapStart,
						End:   overlapEnd,
					})
				}
			}

			// Move to next day
			current = dayEnd
		}
	}

	// Return both standard and extended hours slots separately
	// Frontend will decide which to show based on user preference
	return struct {
		Standard []models.TimeSlot
		Extended []models.TimeSlot
	}{
		Standard: standardHoursSlots,
		Extended: extendedHoursSlots,
	}
}
