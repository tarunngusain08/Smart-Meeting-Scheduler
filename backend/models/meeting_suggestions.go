package models

// FindMeetingTimesRequest represents the request body for finding meeting times
type FindMeetingTimesRequest struct {
	Attendees                 []AttendeeBase     `json:"attendees,omitempty"`
	IsOrganizerOptional      bool               `json:"isOrganizerOptional,omitempty"`
	LocationConstraint       *LocationConstraint `json:"locationConstraint,omitempty"`
	MaxCandidates            int32              `json:"maxCandidates,omitempty"`
	MeetingDuration          string             `json:"meetingDuration,omitempty"` // ISO8601 format
	MinimumAttendeePercentage float64           `json:"minimumAttendeePercentage,omitempty"`
	ReturnSuggestionReasons   bool              `json:"returnSuggestionReasons,omitempty"`
	TimeConstraint           *TimeConstraint    `json:"timeConstraint,omitempty"`
}

// AttendeeBase represents an attendee or resource for the meeting
type AttendeeBase struct {
	Type         string       `json:"type"` // "required" for person, "resource" for resource
	EmailAddress EmailAddress `json:"emailAddress"`
}

// LocationConstraint represents requirements about the meeting location
type LocationConstraint struct {
	IsRequired       bool       `json:"isRequired"`
	SuggestLocation  bool       `json:"suggestLocation"`
	Locations        []Location `json:"locations,omitempty"`
}

// TimeConstraint represents time restrictions for a meeting
type TimeConstraint struct {
	ActivityDomain string           `json:"activityDomain,omitempty"` // "work", "personal", "unrestricted"
	TimeSlots      []TimeSlotDetail `json:"timeSlots,omitempty"`
}

// TimeSlotDetail represents a time slot with start and end times
type TimeSlotDetail struct {
	Start TimeInfo `json:"start"`
	End   TimeInfo `json:"end"`
}

// TimeInfo represents a point in time with timezone
type TimeInfo struct {
	DateTime string `json:"dateTime"`
	TimeZone string `json:"timeZone"`
}

// MeetingTimeSuggestionsResult represents the response from findMeetingTimes
type MeetingTimeSuggestionsResult struct {
	EmptySuggestionsReason  string                  `json:"emptySuggestionsReason,omitempty"`
	MeetingTimeSuggestions []MeetingTimeSuggestion `json:"meetingTimeSuggestions"`
}

// MeetingTimeSuggestion represents a suggested meeting time
type MeetingTimeSuggestion struct {
	Confidence            float64                `json:"confidence"`
	Order                int32                  `json:"order"`
	OrganizerAvailability string                 `json:"organizerAvailability"`
	SuggestionReason     string                 `json:"suggestionReason,omitempty"`
	AttendeeAvailability []AttendeeAvailability `json:"attendeeAvailability"`
	Locations            []Location             `json:"locations,omitempty"`
	MeetingTimeSlot      TimeSlotDetail        `json:"meetingTimeSlot"`
}

// AttendeeAvailability represents an attendee's availability for a suggested time
type AttendeeAvailability struct {
	Availability string       `json:"availability"` // free, tentative, busy, oof, workingElsewhere
	Attendee     AttendeeBase `json:"attendee"`
}

// GeminiSuggestion represents an AI-enhanced meeting time suggestion
type GeminiSuggestion struct {
	MeetingTimeSuggestion
	ConfidenceScore     float64 `json:"confidenceScore"`
	ReasoningExplanation string `json:"reasoningExplanation"`
	PreferenceMatch     struct {
		TimeOfDay     float64 `json:"timeOfDay"`     // How well it matches preferred time of day
		DayOfWeek     float64 `json:"dayOfWeek"`     // How well it matches preferred day of week
		AttendeeScore float64 `json:"attendeeScore"` // Aggregate score for attendee preferences
	} `json:"preferenceMatch"`
}
