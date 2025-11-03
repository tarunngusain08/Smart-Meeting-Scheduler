package services

import (
	"fmt"
	"log"
	"net/smtp"
	"os"
)

// MailtrapSender implements the Sender interface using Mailtrap SMTP
// Mailtrap is a test email service that captures emails without sending them to real recipients
// Perfect for development and testing
type MailtrapSender struct {
	Username string // Mailtrap username
	Password string // Mailtrap password
	Host     string // Mailtrap SMTP host
	Port     string // Mailtrap SMTP port
	From     string // From email address (can be any email for testing)
}

// NewMailtrapSender creates a new Mailtrap sender instance
// Configuration is loaded from environment variables:
// - MAILTRAP_USERNAME: Mailtrap SMTP username
// - MAILTRAP_PASSWORD: Mailtrap SMTP password
// - MAILTRAP_HOST: Mailtrap SMTP host (default: smtp.mailtrap.io)
// - MAILTRAP_PORT: Mailtrap SMTP port (default: 2525)
// - MAILTRAP_FROM_EMAIL: From email address (default: noreply@gruve.ai)
//
// Get credentials from: https://mailtrap.io/inboxes
func NewMailtrapSender() *MailtrapSender {
	username := os.Getenv("MAILTRAP_USERNAME")
	password := os.Getenv("MAILTRAP_PASSWORD")
	host := os.Getenv("MAILTRAP_HOST")
	port := os.Getenv("MAILTRAP_PORT")
	fromEmail := os.Getenv("MAILTRAP_FROM_EMAIL")

	if username == "" {
		log.Println("WARNING: MAILTRAP_USERNAME not set")
	}
	if password == "" {
		log.Println("WARNING: MAILTRAP_PASSWORD not set")
	}
	if host == "" {
		host = "smtp.mailtrap.io" // Default Mailtrap host
	}
	if port == "" {
		port = "2525" // Default Mailtrap port
	}
	if fromEmail == "" {
		fromEmail = "noreply@gruve.ai" // Default from email
	}

	return &MailtrapSender{
		Username: username,
		Password: password,
		Host:     host,
		Port:     port,
		From:     fromEmail,
	}
}

// SendInvite sends a meeting invitation via Mailtrap SMTP with .ics attachment
// Emails are captured in Mailtrap inbox and not sent to real recipients
func (m *MailtrapSender) SendInvite(invite *MeetingInvite) error {
	if m.Username == "" || m.Password == "" {
		return fmt.Errorf("Mailtrap credentials not configured (MAILTRAP_USERNAME and MAILTRAP_PASSWORD required)")
	}

	// Generate .ics file content
	icsContent, err := generateICS(invite, m.From)
	if err != nil {
		return fmt.Errorf("failed to generate ICS content: %w", err)
	}

	// Build MIME email with .ics attachment
	message, err := buildMIMEMessage(invite, icsContent, m.From)
	if err != nil {
		return fmt.Errorf("failed to build MIME message: %w", err)
	}

	// Authenticate with Mailtrap
	auth := smtp.PlainAuth("", m.Username, m.Password, m.Host)
	addr := fmt.Sprintf("%s:%s", m.Host, m.Port)

	// Send to all attendees
	// Note: With Mailtrap, these won't actually reach the recipients
	// They'll be captured in your Mailtrap inbox for inspection
	recipients := append([]string{}, invite.Attendees...)

	err = smtp.SendMail(addr, auth, m.From, recipients, []byte(message))
	if err != nil {
		return fmt.Errorf("failed to send email via Mailtrap SMTP: %w", err)
	}

	log.Printf("Successfully sent meeting invite via Mailtrap to %d attendees (captured in Mailtrap inbox)", len(recipients))
	return nil
}
