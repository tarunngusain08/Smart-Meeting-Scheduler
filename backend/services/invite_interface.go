package services

// MeetingInvite represents a meeting invitation with all necessary details
// to send via email or calendar API
type MeetingInvite struct {
	Subject     string   // Meeting subject/title
	Description string   // Meeting description/body
	StartTime   string   // ISO8601 format (e.g., "2024-01-15T14:00:00Z")
	EndTime     string   // ISO8601 format (e.g., "2024-01-15T15:00:00Z")
	Attendees   []string // List of attendee email addresses
	Organizer   string   // Organizer email address
	Location    string   // Meeting location (physical or virtual)
}

// Sender defines the interface for sending meeting invitations
// Implementations can use different mechanisms (SMTP, Graph API, etc.)
type Sender interface {
	// SendInvite sends a meeting invitation to all attendees
	// Returns an error if the invitation could not be sent
	SendInvite(invite *MeetingInvite) error
}

