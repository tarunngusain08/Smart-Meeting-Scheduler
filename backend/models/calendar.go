package models

import "time"

// AvailabilityRequest represents the request for checking calendar availability
type AvailabilityRequest struct {
	Schedules []string `json:"schedules"`
	StartTime string   `json:"startTime"`
	EndTime   string   `json:"endTime"`
	TimeZone  string   `json:"timeZone"`
}

// AvailabilityResponse represents the response from MS Graph API for availability
type AvailabilityResponse struct {
	Value []ScheduleResponse `json:"value"`
}

// ScheduleResponse represents availability information for a single user
type ScheduleResponse struct {
	ScheduleID         string           `json:"scheduleId"`
	AvailabilityView  string           `json:"availabilityView"`
	ScheduleItems     []ScheduleItem    `json:"scheduleItems"`
	WorkingHours      WorkingHours     `json:"workingHours"`
	Error             *ScheduleError    `json:"error,omitempty"`
}

// ScheduleItem represents a single calendar item in the schedule
type ScheduleItem struct {
	Status    string    `json:"status"`
	Start     TimeSlot  `json:"start"`
	End       TimeSlot  `json:"end"`
	ItemType  string    `json:"type"`
}

// TimeSlot represents a time with timezone information
type TimeSlot struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone"`
}

// WorkingHours represents a user's working hours configuration
type WorkingHours struct {
	DaysOfWeek []string  `json:"daysOfWeek"`
	StartTime  string    `json:"startTime"`
	EndTime    string    `json:"endTime"`
	TimeZone   TimeZone  `json:"timeZone"`
}

// TimeZone represents timezone information
type TimeZone struct {
	Name string `json:"name"`
}

// ScheduleError represents an error response for a specific schedule
type ScheduleError struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

// MeetingRequest represents the request to create a new meeting
type MeetingRequest struct {
	Subject     string     `json:"subject"`
	Body        string     `json:"body"`
	StartTime   string     `json:"startTime"`
	EndTime     string     `json:"endTime"`
	Attendees   []Attendee `json:"attendees"`
	Location    *string    `json:"location,omitempty"`
	TimeZone    string     `json:"timeZone,omitempty"`
	IsRecurring bool       `json:"isRecurring,omitempty"`
}

// Attendee represents a meeting attendee
type Attendee struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Type  string `json:"type,omitempty"` // required/optional
}

// MeetingResponse represents the response from MS Graph API for meeting creation
type MeetingResponse struct {
	ID                 string    `json:"id"`
	CreatedDateTime    time.Time `json:"createdDateTime"`
	LastModifiedDateTime time.Time `json:"lastModifiedDateTime"`
	Subject            string    `json:"subject"`
	OnlineMeeting     *OnlineMeetingInfo `json:"onlineMeeting,omitempty"`
	WebLink           string    `json:"webLink"`
}

// OnlineMeetingInfo represents Teams meeting information
type OnlineMeetingInfo struct {
	JoinURL    string `json:"joinUrl"`
	Provider   string `json:"provider"`
	QuickDial  string `json:"quickDial,omitempty"`
	TollNumber string `json:"tollNumber,omitempty"`
}

// CalendarEventsResponse represents the response for calendar events
type CalendarEventsResponse struct {
	Value    []Event `json:"value"`
	NextLink string  `json:"@odata.nextLink,omitempty"`
}

// Event represents a calendar event
type Event struct {
	ID                string            `json:"id"`
	Subject           string            `json:"subject"`
	Body              EventBody         `json:"body"`
	Start             TimeSlot          `json:"start"`
	End               TimeSlot          `json:"end"`
	Location          Location          `json:"location,omitempty"`
	Attendees         []EventAttendee   `json:"attendees"`
	Organizer         Organizer         `json:"organizer"`
	IsOnlineMeeting   bool              `json:"isOnlineMeeting"`
	OnlineMeeting     *OnlineMeetingInfo `json:"onlineMeeting,omitempty"`
	IsCancelled       bool              `json:"isCancelled"`
}

// EventBody represents the body content of an event
type EventBody struct {
	ContentType string `json:"contentType"`
	Content     string `json:"content"`
}

// Location represents the location of an event
type Location struct {
	DisplayName string `json:"displayName"`
	Address     *Address `json:"address,omitempty"`
}

// Address represents a physical address
type Address struct {
	Street     string `json:"street"`
	City       string `json:"city"`
	State      string `json:"state"`
	PostalCode string `json:"postalCode"`
	Country    string `json:"country"`
}

// EventAttendee represents an attendee of an event with response status
type EventAttendee struct {
	EmailAddress EmailAddress     `json:"emailAddress"`
	Status       ResponseStatus   `json:"status"`
	Type         string          `json:"type"` // required/optional
}

// EmailAddress represents an email address with display name
type EmailAddress struct {
	Name    string `json:"name"`
	Address string `json:"address"`
}

// ResponseStatus represents an attendee's response to the event
type ResponseStatus struct {
	Response string    `json:"response"` // none/accepted/tentative/declined
	Time     time.Time `json:"time"`
}

// Organizer represents the event organizer
type Organizer struct {
	EmailAddress EmailAddress `json:"emailAddress"`
}
