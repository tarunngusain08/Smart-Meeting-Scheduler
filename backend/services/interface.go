package services

import (
	"Smart-Meeting-Scheduler/models"
	"time"
)

// GraphClient defines the interface for interacting with Microsoft Graph API
// or a mock implementation for calendar and meeting operations
type GraphClient interface {
	// GetCalendarView retrieves calendar events for a user within a time range
	GetCalendarView(userEmail string, startTime, endTime time.Time) ([]models.Event, error)

	// GetUserEvents retrieves all events for a user within a time range
	GetUserEvents(userEmail string, startTime, endTime time.Time) ([]models.Event, error)

	// FindMeetingTimes finds available meeting times for a group of attendees
	FindMeetingTimes(organizer string, attendees []string, duration time.Duration, startTime, endTime time.Time) ([]models.MeetingSuggestion, error)

	// CreateOnlineMeeting creates a new online meeting (Teams meeting)
	CreateOnlineMeeting(organizer string, start time.Time, end time.Time, subject string, attendees []string) (models.Event, error)

	// CreateCalendarEvent creates a regular calendar event
	CreateCalendarEvent(organizer string, event models.CreateMeetingRequest) (models.Event, error)

	// GetAvailability checks availability for a user within a time range
	GetAvailability(userEmail string, startTime, endTime time.Time) (models.AvailabilityResponse, error)
	
	// GetAvailabilityWithTimezone checks availability with timezone-aware working hours filtering
	GetAvailabilityWithTimezone(userEmail string, startTime, endTime time.Time, timezone string) (models.AvailabilityResponse, error)
}
