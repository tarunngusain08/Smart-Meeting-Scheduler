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
func (g *GmailSender) SendInvite(invite *MeetingInvite) error {
	if g.Email == "" || g.Password == "" {
		return fmt.Errorf("Gmail credentials not configured (GMAIL_EMAIL and GMAIL_APP_PASSWORD required)")
	}

	// Generate .ics file content
	icsContent, err := generateICS(invite, g.Email)
	if err != nil {
		return fmt.Errorf("failed to generate ICS content: %w", err)
	}

	// Build MIME email with .ics attachment
	message, err := buildMIMEMessage(invite, icsContent, g.Email)
	if err != nil {
		return fmt.Errorf("failed to build MIME message: %w", err)
	}

	// Authenticate with Gmail
	auth := smtp.PlainAuth("", g.Email, g.Password, g.SMTPHost)
	addr := fmt.Sprintf("%s:%s", g.SMTPHost, g.SMTPPort)

	// Send to all attendees
	recipients := append([]string{}, invite.Attendees...)

	err = smtp.SendMail(addr, auth, g.Email, recipients, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email via Gmail SMTP: %w", err)
	}

	log.Printf("Successfully sent meeting invite via Gmail to %d attendees", len(recipients))
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
	ics := fmt.Sprintf(
		`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Gruve.ai//Smart Meeting Scheduler//EN
METHOD:REQUEST
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:%s
DTSTAMP:%s
DTSTART:%s
DTEND:%s
SUMMARY:%s
DESCRIPTION:%s
LOCATION:%s
ORGANIZER;CN=%s:mailto:%s
%sSTATUS:CONFIRMED
SEQUENCE:0
PRIORITY:5
CLASS:PUBLIC
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR`,
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
func buildMIMEMessage(invite *MeetingInvite, icsContent string, fromEmail string) (string, error) {
	var buffer strings.Builder
	boundary := generateBoundary()

	// Email headers
	buffer.WriteString(fmt.Sprintf("From: %s\r\n", fromEmail))
	buffer.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(invite.Attendees, ", ")))
	buffer.WriteString(fmt.Sprintf("Subject: %s\r\n", invite.Subject))
	buffer.WriteString("MIME-Version: 1.0\r\n")
	buffer.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary))
	buffer.WriteString("\r\n")

	// Text part
	buffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buffer.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	buffer.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buffer.WriteString("\r\n")

	emailBody := buildEmailBody(invite)
	buffer.WriteString(emailBody)
	buffer.WriteString("\r\n\r\n")

	// Calendar attachment part
	buffer.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buffer.WriteString("Content-Type: text/calendar; method=REQUEST; charset=\"UTF-8\"; name=\"invite.ics\"\r\n")
	buffer.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buffer.WriteString("Content-Disposition: attachment; filename=\"invite.ics\"\r\n")
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
