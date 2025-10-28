package models

import "time"

// Event represents a calendar event from Microsoft Graph or local storage
type Event struct {
	ID          string    `json:"id"`
	Subject     string    `json:"subject"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
	Organizer   string    `json:"organizer"`
	Attendees   []string  `json:"attendees"`
	OnlineURL   string    `json:"onlineUrl,omitempty"`
	Location    string    `json:"location,omitempty"`
	BodyPreview string    `json:"bodyPreview,omitempty"`
	IsOnline    bool      `json:"isOnline"`
}

// TimeSlot represents a time slot for availability
type TimeSlot struct {
	Start time.Time `json:"start"`
	End   time.Time `json:"end"`
}

// AvailabilityResponse represents the response for availability check
type AvailabilityResponse struct {
	UserEmail      string     `json:"userEmail"`
	FreeSlots      []TimeSlot `json:"freeSlots"`
	BusySlots      []TimeSlot `json:"busySlots"`
	WorkingHours   TimeSlot   `json:"workingHours"`
	TotalFreeTime  int        `json:"totalFreeTimeMinutes"`
	TotalBusyTime  int        `json:"totalBusyTimeMinutes"`
}
