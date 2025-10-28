package services

import (
	"Smart-Meeting-Scheduler/models"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// MockGraphClient implements GraphClient using local Postgres database
type MockGraphClient struct {
	DB                *sql.DB
	TeamsMeetingBaseURL string
}

// NewMockGraphClient creates a new MockGraphClient instance
func NewMockGraphClient(db *sql.DB, teamsMeetingBaseURL string) *MockGraphClient {
	return &MockGraphClient{DB: db, TeamsMeetingBaseURL: teamsMeetingBaseURL}
}

// GetCalendarView retrieves calendar events for a user within a time range from local DB
func (m *MockGraphClient) GetCalendarView(userIdentifier string, startTime, endTime time.Time) ([]models.Event, error) {
	// First, try to resolve the userIdentifier to a user ID
	// It could be a display name, email, or UUID
	var userID string

	// Check if it's already a UUID (user ID)
	if len(userIdentifier) == 36 && strings.Contains(userIdentifier, "-") {
		userID = userIdentifier
	} else {
		// Try to find user by email or display name
		userQuery := `
			SELECT id FROM users
			WHERE email = $1 OR display_name = $1 OR user_principal_name = $1
			LIMIT 1
		`
		err := m.DB.QueryRow(userQuery, userIdentifier).Scan(&userID)
		if err != nil {
			// If not found, assume it's already a user ID or return empty
			userID = userIdentifier
		}
	}

	query := `
		SELECT id, subject, start_time, end_time, organizer, location, is_online, online_url
		FROM mock_events
		WHERE organizer = $1
		  AND start_time < $3
		  AND end_time > $2
		ORDER BY start_time ASC
	`

	rows, err := m.DB.Query(query, userID, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %v", err)
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		var location, onlineURL sql.NullString
		err := rows.Scan(
			&event.ID,
			&event.Subject,
			&event.Start,
			&event.End,
			&event.Organizer,
			&location,
			&event.IsOnline,
			&onlineURL,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %v", err)
		}

		if location.Valid {
			event.Location = location.String
		}
		if onlineURL.Valid {
			event.OnlineURL = onlineURL.String
		}

		// Get attendees for this event
		attendees, _ := m.getEventAttendees(event.ID)
		event.Attendees = attendees

		events = append(events, event)
	}

	return events, nil
}

// GetUserEvents retrieves all events for a user within a time range
func (m *MockGraphClient) GetUserEvents(userEmail string, startTime, endTime time.Time) ([]models.Event, error) {
	// For mock, this is similar to GetCalendarView but includes events where user is an attendee
	query := `
		SELECT DISTINCT e.id, e.subject, e.start_time, e.end_time, e.organizer, 
		       e.location, e.is_online, e.online_url, e.body_preview
		FROM mock_events e
		LEFT JOIN mock_event_attendees ea ON e.id = ea.event_id
		WHERE (e.organizer = $1 OR ea.attendee_email = $1)
		  AND e.start_time < $3
		  AND e.end_time > $2
		ORDER BY e.start_time ASC
	`

	rows, err := m.DB.Query(query, userEmail, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %v", err)
	}
	defer rows.Close()

	var events []models.Event
	for rows.Next() {
		var event models.Event
		var location, onlineURL, bodyPreview sql.NullString
		err := rows.Scan(
			&event.ID,
			&event.Subject,
			&event.Start,
			&event.End,
			&event.Organizer,
			&location,
			&event.IsOnline,
			&onlineURL,
			&bodyPreview,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan event: %v", err)
		}

		if location.Valid {
			event.Location = location.String
		}
		if onlineURL.Valid {
			event.OnlineURL = onlineURL.String
		}
		if bodyPreview.Valid {
			event.BodyPreview = bodyPreview.String
		}

		// Get attendees for this event
		attendees, _ := m.getEventAttendees(event.ID)
		event.Attendees = attendees

		events = append(events, event)
	}

	return events, nil
}

// FindMeetingTimes finds available meeting times for a group of attendees
func (m *MockGraphClient) FindMeetingTimes(organizer string, attendees []string, duration time.Duration, startTime, endTime time.Time) ([]models.MeetingSuggestion, error) {
	// Get all busy times for organizer and attendees
	allEmails := append([]string{organizer}, attendees...)
	busySlots := make(map[string][]models.TimeSlot)

	for _, email := range allEmails {
		events, err := m.GetCalendarView(email, startTime, endTime)
		if err != nil {
			continue // Skip if user not found
		}

		for _, event := range events {
			busySlots[email] = append(busySlots[email], models.TimeSlot{
				Start: event.Start,
				End:   event.End,
			})
		}
	}

	// Find common free slots
	suggestions := m.findCommonFreeSlots(busySlots, startTime, endTime, duration)

	return suggestions, nil
}

// CreateOnlineMeeting creates a new online meeting in local DB
func (m *MockGraphClient) CreateOnlineMeeting(organizer string, start time.Time, end time.Time, subject string, attendees []string) (models.Event, error) {
	eventID := uuid.New().String()
	baseURL := strings.TrimRight(m.TeamsMeetingBaseURL, "/")
	onlineURL := fmt.Sprintf("%s/%s", baseURL, eventID)

	query := `
		INSERT INTO mock_events (id, subject, start_time, end_time, organizer, is_online, online_url, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := m.DB.Exec(query, eventID, subject, start, end, organizer, true, onlineURL, time.Now())
	if err != nil {
		return models.Event{}, fmt.Errorf("failed to create online meeting: %v", err)
	}

	// Add attendees
	for _, attendee := range attendees {
		_, _ = m.DB.Exec(
			"INSERT INTO mock_event_attendees (event_id, attendee_email) VALUES ($1, $2)",
			eventID, attendee,
		)
	}

	return models.Event{
		ID:        eventID,
		Subject:   subject,
		Start:     start,
		End:       end,
		Organizer: organizer,
		Attendees: attendees,
		OnlineURL: onlineURL,
		IsOnline:  true,
	}, nil
}

// CreateCalendarEvent creates a regular calendar event in local DB
func (m *MockGraphClient) CreateCalendarEvent(organizer string, event models.CreateMeetingRequest) (models.Event, error) {
	eventID := uuid.New().String()
	onlineURL := ""

	if event.IsOnline {
		baseURL := strings.TrimRight(m.TeamsMeetingBaseURL, "/")
		onlineURL = fmt.Sprintf("%s/%s", baseURL, eventID)
	}

	query := `
		INSERT INTO mock_events (id, subject, start_time, end_time, organizer, location, is_online, online_url, body_preview, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`

	_, err := m.DB.Exec(query, eventID, event.Subject, event.Start, event.End, organizer,
		event.Location, event.IsOnline, onlineURL, event.Description, time.Now())
	if err != nil {
		return models.Event{}, fmt.Errorf("failed to create calendar event: %v", err)
	}

	// Add attendees
	for _, attendee := range event.Attendees {
		_, _ = m.DB.Exec(
			"INSERT INTO mock_event_attendees (event_id, attendee_email) VALUES ($1, $2)",
			eventID, attendee,
		)
	}

	return models.Event{
		ID:          eventID,
		Subject:     event.Subject,
		Start:       event.Start,
		End:         event.End,
		Organizer:   organizer,
		Attendees:   event.Attendees,
		Location:    event.Location,
		OnlineURL:   onlineURL,
		BodyPreview: event.Description,
		IsOnline:    event.IsOnline,
	}, nil
}

// GetAvailability checks availability for a user within a time range
func (m *MockGraphClient) GetAvailability(userEmail string, startTime, endTime time.Time) (models.AvailabilityResponse, error) {
	events, err := m.GetCalendarView(userEmail, startTime, endTime)
	if err != nil {
		return models.AvailabilityResponse{}, err
	}

	busySlots := []models.TimeSlot{}
	for _, event := range events {
		busySlots = append(busySlots, models.TimeSlot{
			Start: event.Start,
			End:   event.End,
		})
	}

	freeSlots := calculateFreeSlots(startTime, endTime, busySlots)

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

// Helper function to get attendees for an event
func (m *MockGraphClient) getEventAttendees(eventID string) ([]string, error) {
	query := "SELECT attendee_email FROM mock_event_attendees WHERE event_id = $1"
	rows, err := m.DB.Query(query, eventID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attendees []string
	for rows.Next() {
		var email string
		if err := rows.Scan(&email); err == nil {
			attendees = append(attendees, email)
		}
	}

	return attendees, nil
}

// Helper function to find common free slots for all attendees
func (m *MockGraphClient) findCommonFreeSlots(busySlots map[string][]models.TimeSlot, startTime, endTime time.Time, duration time.Duration) []models.MeetingSuggestion {
	// Merge all busy slots
	allBusySlots := []models.TimeSlot{}
	for _, slots := range busySlots {
		allBusySlots = append(allBusySlots, slots...)
	}

	// Calculate free slots
	freeSlots := calculateFreeSlots(startTime, endTime, allBusySlots)

	// Find slots that fit the duration
	var suggestions []models.MeetingSuggestion
	for _, slot := range freeSlots {
		slotDuration := slot.End.Sub(slot.Start)
		if slotDuration >= duration {
			// Can fit the meeting in this slot
			suggestions = append(suggestions, models.MeetingSuggestion{
				Start:      slot.Start,
				End:        slot.Start.Add(duration),
				Confidence: 100.0,
				Score:      100.0,
			})
		}
	}

	// Limit to top 5 suggestions
	if len(suggestions) > 5 {
		suggestions = suggestions[:5]
	}

	return suggestions
}
