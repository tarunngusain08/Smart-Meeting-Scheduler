package services

import (
	"crypto/rand"
	"fmt"
	"log"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// GmailSender implements the Sender interface using Gmail SMTP
// to send calendar invitations with .ics attachments
type GmailSender struct {
	Email    string // Gmail address
	Password string // Gmail app password (not regular password)
	SMTPHost string
	SMTPPort string
}

// NewGmailSender creates a new Gmail sender instance
// Configuration is loaded from environment variables:
// - GMAIL_EMAIL: Gmail email address
// - GMAIL_APP_PASSWORD: Gmail app-specific password (not regular password)
//
// Note: You must enable 2FA on Gmail and generate an "App Password"
// See: https://support.google.com/accounts/answer/185833
func NewGmailSender() *GmailSender {
	email := os.Getenv("GMAIL_EMAIL")
	password := os.Getenv("GMAIL_APP_PASSWORD")

	if email == "" {
		log.Println("WARNING: GMAIL_EMAIL not set")
	}
	if password == "" {
		log.Println("WARNING: GMAIL_APP_PASSWORD not set")
	}

	return &GmailSender{
		Email:    email,
		Password: password,
		SMTPHost: "smtp.gmail.com",
		SMTPPort: "587",
	}
}

// SendInvite sends a meeting invitation via Gmail SMTP with .ics attachment
// Sends individual emails to each attendee for better Outlook compatibility
func (g *GmailSender) SendInvite(invite *MeetingInvite) error {
	if g.Email == "" || g.Password == "" {
		return fmt.Errorf("gmail credentials not configured (GMAIL_EMAIL and GMAIL_APP_PASSWORD required)")
	}

	// Generate .ics file content
	icsContent, err := generateICS(invite, g.Email)
	if err != nil {
		return fmt.Errorf("failed to generate ICS content: %w", err)
	}

	// Authenticate with Gmail
	auth := smtp.PlainAuth("", g.Email, g.Password, g.SMTPHost)
	addr := fmt.Sprintf("%s:%s", g.SMTPHost, g.SMTPPort)

	// Send individual emails to each attendee for better delivery
	// This ensures Outlook receives the invite properly
	var lastErr error
	sentCount := 0
	for _, attendee := range invite.Attendees {
		// Build MIME email with .ics attachment for this specific attendee
		message, err := buildMIMEMessage(invite, icsContent, g.Email, attendee)
		if err != nil {
			log.Printf("Failed to build MIME message for %s: %v", attendee, err)
			lastErr = err
			continue
		}

		// Send to this specific attendee
		recipients := []string{attendee}
		err = smtp.SendMail(addr, auth, g.Email, recipients, []byte(message))
		if err != nil {
			log.Printf("Failed to send email to %s: %v", attendee, err)
			lastErr = err
			continue
		}
		sentCount++
		log.Printf("Successfully sent meeting invite via Gmail to %s", attendee)
	}

	if sentCount == 0 {
		return fmt.Errorf("failed to send any invites: %w", lastErr)
	}

	if sentCount < len(invite.Attendees) {
		log.Printf("Warning: Only sent %d out of %d invites", sentCount, len(invite.Attendees))
	}

	log.Printf("Successfully sent meeting invites via Gmail to %d out of %d attendees", sentCount, len(invite.Attendees))
	return nil
}

// generateUID creates a unique identifier for the calendar event
func generateUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x@gruve.ai", b)
}

// generateBoundary creates a unique MIME boundary string
func generateBoundary() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("boundary_%x", b)
}

// formatICalDateTime converts ISO8601 time string to iCal format (YYYYMMDDTHHMMSSZ)
func formatICalDateTime(timeStr string) (string, error) {
	// Try parsing as RFC3339 (ISO8601)
	t, err := time.Parse(time.RFC3339, timeStr)
	if err != nil {
		// Try parsing without timezone
		t, err = time.Parse("2006-01-02T15:04:05", timeStr)
		if err != nil {
			return "", err
		}
	}

	// Convert to UTC and format as iCal datetime
	return t.UTC().Format("20060102T150405Z"), nil
}

// escapeICalText escapes special characters in iCalendar text fields
func escapeICalText(text string) string {
	// Escape backslashes, commas, semicolons, and newlines per RFC 5545
	text = strings.ReplaceAll(text, "\\", "\\\\")
	text = strings.ReplaceAll(text, ",", "\\,")
	text = strings.ReplaceAll(text, ";", "\\;")
	text = strings.ReplaceAll(text, "\n", "\\n")
	text = strings.ReplaceAll(text, "\r", "")
	return text
}

// generateICS creates an RFC-5545 compliant iCalendar (.ics) file content
func generateICS(invite *MeetingInvite, organizerEmail string) (string, error) {
	// Generate unique UID for the event
	uid := generateUID()

	// Get current timestamp in iCal format
	now := time.Now().UTC()
	timestamp := now.Format("20060102T150405Z")

	// Parse start and end times
	startTime, err := formatICalDateTime(invite.StartTime)
	if err != nil {
		return "", fmt.Errorf("invalid start time: %w", err)
	}

	endTime, err := formatICalDateTime(invite.EndTime)
	if err != nil {
		return "", fmt.Errorf("invalid end time: %w", err)
	}

	// Build attendee list
	var attendees strings.Builder
	for _, email := range invite.Attendees {
		attendees.WriteString(fmt.Sprintf("ATTENDEE;CN=%s;RSVP=TRUE:mailto:%s\r\n", email, email))
	}

	// Escape special characters in text fields
	subject := escapeICalText(invite.Subject)
	description := escapeICalText(invite.Description)
	location := escapeICalText(invite.Location)

	// Build iCalendar content per RFC 5545
	// Use explicit CRLF line endings for Outlook compatibility
	ics := fmt.Sprintf(
		"BEGIN:VCALENDAR\r\n"+
			"VERSION:2.0\r\n"+
			"PRODID:-//Gruve.ai//Smart Meeting Scheduler//EN\r\n"+
			"METHOD:REQUEST\r\n"+
			"CALSCALE:GREGORIAN\r\n"+
			"BEGIN:VEVENT\r\n"+
			"UID:%s\r\n"+
			"DTSTAMP:%s\r\n"+
			"DTSTART:%s\r\n"+
			"DTEND:%s\r\n"+
			"SUMMARY:%s\r\n"+
			"DESCRIPTION:%s\r\n"+
			"LOCATION:%s\r\n"+
			"ORGANIZER;CN=%s:mailto:%s\r\n"+
			"%sSTATUS:CONFIRMED\r\n"+
			"SEQUENCE:0\r\n"+
			"PRIORITY:5\r\n"+
			"CLASS:PUBLIC\r\n"+
			"TRANSP:OPAQUE\r\n"+
			"END:VEVENT\r\n"+
			"END:VCALENDAR\r\n",
		uid,
		timestamp,
		startTime,
		endTime,
		subject,
		description,
		location,
		organizerEmail,
		organizerEmail,
		attendees.String(),
	)

	return ics, nil
}

// buildMIMEMessage constructs a multipart MIME email with both text and .ics attachment
// Improved for Outlook compatibility
// recipient is the specific email address to send to (for individual emails)
func buildMIMEMessage(invite *MeetingInvite, icsContent string, fromEmail string, recipient string) (string, error) {
	var buffer strings.Builder
	boundary := generateBoundary()

	// Email headers - improved for Outlook compatibility
	buffer.WriteString(fmt.Sprintf("From: %s\r\n", fromEmail))
	buffer.WriteString(fmt.Sprintf("To: %s\r\n", recipient))
	buffer.WriteString(fmt.Sprintf("Subject: %s\r\n", invite.Subject))
	buffer.WriteString("MIME-Version: 1.0\r\n")
	buffer.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary))
	buffer.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	buffer.WriteString("X-Mailer: Smart Meeting Scheduler\r\n")
	buffer.WriteString("Reply-To: " + fromEmail + "\r\n")
	buffer.WriteString("\r\n")

	// Text part
	buffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buffer.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	buffer.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	buffer.WriteString("\r\n")

	emailBody := buildEmailBody(invite)
	buffer.WriteString(emailBody)
	buffer.WriteString("\r\n\r\n")

	// Calendar attachment part - improved for Outlook compatibility
	buffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buffer.WriteString("Content-Type: text/calendar; method=REQUEST; charset=\"UTF-8\"\r\n")
	buffer.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	buffer.WriteString("Content-Disposition: attachment; filename=\"invite.ics\"\r\n")
	buffer.WriteString("X-Mailer: Smart Meeting Scheduler\r\n")
	buffer.WriteString("\r\n")
	buffer.WriteString(icsContent)
	buffer.WriteString("\r\n")

	// End boundary
	buffer.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	return buffer.String(), nil
}

// buildEmailBody creates a human-readable email body
func buildEmailBody(invite *MeetingInvite) string {
	var body strings.Builder

	body.WriteString(fmt.Sprintf("You have been invited to: %s\r\n\r\n", invite.Subject))

	if invite.Description != "" {
		body.WriteString(fmt.Sprintf("Description: %s\r\n\r\n", invite.Description))
	}

	body.WriteString(fmt.Sprintf("When: %s to %s\r\n", invite.StartTime, invite.EndTime))

	if invite.Location != "" {
		body.WriteString(fmt.Sprintf("Location: %s\r\n", invite.Location))
	}

	body.WriteString(fmt.Sprintf("\r\nOrganizer: %s\r\n", invite.Organizer))
	body.WriteString("\r\nPlease accept or decline this invitation.\r\n")

	return body.String()
}
