package models

import "time"

type CalendarEvent struct {
	ID             string    `json:"id"`
	Subject        string    `json:"subject"`
	Start          time.Time `json:"start"`
	End            time.Time `json:"end"`
	Location       string    `json:"location,omitempty"`
	IsOnline       bool      `json:"isOnline"`
	JoinURL        string    `json:"joinUrl,omitempty"`
	Organizer      *User     `json:"organizer"`
	Attendees      []User    `json:"attendees"`
	IsCancelled    bool      `json:"isCancelled"`
	ResponseStatus string    `json:"responseStatus"`
}

type User struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type GraphUser struct {
	ID                string `json:"id"`
	DisplayName       string `json:"displayName"`
	Mail              string `json:"mail"`
	UserPrincipalName string `json:"userPrincipalName"`
}

type AvailabilityRequest struct {
	Attendees []User    `json:"attendees"`
	StartTime time.Time `json:"startTime"`
	EndTime   time.Time `json:"endTime"`
	Duration  int       `json:"duration"`            // in minutes
	Organizer *User     `json:"organizer,omitempty"` // The meeting organizer
}

type TimeSlot struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
	Score float64   `json:"score,omitempty"`
}

// Common availability error reasons from Microsoft Graph API
const (
	ErrOrganizerUnavailable     = "OrganizerUnavailable"
	ErrAttendeeUnavailable      = "AttendeeUnavailable"
	ErrLocationUnavailable      = "LocationUnavailable"
	ErrUnknownAvailabilityError = "Unknown"
)

type AvailabilityResponse struct {
	Suggestions []TimeSlot `json:"suggestions"`
	Reason      string     `json:"reason,omitempty"`  // Reason if no suggestions available
	Status      string     `json:"status"`            // "success" or "error"
	Message     string     `json:"message,omitempty"` // Human-readable message
}

type GraphEventResponse struct {
	Value []struct {
		ID      string `json:"id"`
		Subject string `json:"subject"`
		Start   struct {
			DateTime string `json:"dateTime"`
			TimeZone string `json:"timeZone"`
		} `json:"start"`
		End struct {
			DateTime string `json:"dateTime"`
			TimeZone string `json:"timeZone"`
		} `json:"end"`
		Location struct {
			DisplayName string `json:"displayName"`
		} `json:"location"`
		OnlineMeeting struct {
			JoinURL string `json:"joinUrl"`
		} `json:"onlineMeeting"`
		Organizer struct {
			EmailAddress struct {
				Address string `json:"address"`
				Name    string `json:"name"`
			} `json:"emailAddress"`
		} `json:"organizer"`
		Attendees []struct {
			EmailAddress struct {
				Address string `json:"address"`
				Name    string `json:"name"`
			} `json:"emailAddress"`
			Status struct {
				Response string `json:"response"`
			} `json:"status"`
		} `json:"attendees"`
		IsCancelled bool `json:"isCancelled"`
	} `json:"value"`
}
