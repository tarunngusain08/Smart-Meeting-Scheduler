package models

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// UnmarshalJSON custom unmarshaler to handle duration as both string and int
func (r *FindMeetingTimesRequest) UnmarshalJSON(data []byte) error {
	type Alias FindMeetingTimesRequest
	aux := &struct {
		Duration interface{} `json:"Duration"`
		*Alias
	}{
		Alias: (*Alias)(r),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Handle duration field
	switch v := aux.Duration.(type) {
	case float64:
		r.Duration = int(v)
	case string:
		// Try to parse as duration string with time units (e.g., "30m", "1h", "1.5h")
		minutes, err := parseDurationString(v)
		if err != nil {
			return fmt.Errorf("invalid duration value: %s", v)
		}
		r.Duration = minutes
	case nil:
		r.Duration = 30 // Default
	default:
		return fmt.Errorf("duration must be a number or string, got %T", v)
	}

	return nil
}

// MeetingSuggestion represents a suggested meeting time
type MeetingSuggestion struct {
	Start      time.Time `json:"start"`
	End        time.Time `json:"end"`
	Confidence float64   `json:"confidence,omitempty"`
	Score      float64   `json:"score,omitempty"`
}

// CreateMeetingRequest represents a request to create a new meeting
type CreateMeetingRequest struct {
	Subject     string    `json:"subject" binding:"required"`
	Start       time.Time `json:"start" binding:"required"`
	End         time.Time `json:"end" binding:"required"`
	Attendees   []string  `json:"attendees" binding:"required"`
	Description string    `json:"description,omitempty"`
	Location    string    `json:"location,omitempty"`
	IsOnline    bool      `json:"isOnline"`
}

// FindMeetingTimesRequest represents a request to find available meeting times
type AttendeeWithTimezone struct {
	Email    string `json:"email" binding:"required"`
	TimeZone string `json:"timezone,omitempty"`
}

type FindMeetingTimesRequest struct {
	Attendees         []AttendeeWithTimezone `json:"Attendees" binding:"required"`
	PriorityAttendees []AttendeeWithTimezone `json:"PriorityAttendees,omitempty"`
	Duration          int                    `json:"Duration" binding:"required"` // in minutes
	StartTime         time.Time              `json:"StartTime" binding:"required"`
	EndTime           time.Time              `json:"EndTime" binding:"required"`
	TimeZone          string                 `json:"TimeZone,omitempty"` // Organizer's timezone
	MaxSuggestions    int                    `json:"MaxSuggestions,omitempty"`
}

// MeetingTimesResponse represents the response for finding meeting times
type MeetingTimesResponse struct {
	Suggestions []MeetingSuggestion `json:"suggestions"`
	Message     string              `json:"message,omitempty"`
}

// parseDurationString parses duration strings like "30m", "1h", "1.5h", "2h" into minutes
func parseDurationString(s string) (int, error) {
	// First try parsing as plain integer (already in minutes)
	if minutes, err := strconv.Atoi(s); err == nil {
		return minutes, nil
	}

	// Handle decimal hours (e.g., "1.5h")
	if strings.HasSuffix(s, "h") {
		hoursStr := strings.TrimSuffix(s, "h")
		hours, err := strconv.ParseFloat(hoursStr, 64)
		if err != nil {
			return 0, fmt.Errorf("invalid hours format: %s", s)
		}
		return int(hours * 60), nil
	}

	// Handle minutes (e.g., "30m")
	if strings.HasSuffix(s, "m") {
		minutesStr := strings.TrimSuffix(s, "m")
		minutes, err := strconv.Atoi(minutesStr)
		if err != nil {
			return 0, fmt.Errorf("invalid minutes format: %s", s)
		}
		return minutes, nil
	}

	// Try parsing as Go duration string for other formats
	d, err := time.ParseDuration(s)
	if err != nil {
		return 0, err
	}

	// Convert to minutes
	minutes := int(d.Minutes())
	if minutes <= 0 {
		return 0, fmt.Errorf("duration must be positive")
	}

	return minutes, nil
}
