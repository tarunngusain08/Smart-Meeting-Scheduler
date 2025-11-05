package services

import (
	"log"
	"os"
)

// GetInviteSender returns the appropriate Sender implementation based on configuration
// Configuration is determined by the MAIL_MODE environment variable:
// - "gmail": Uses Gmail SMTP to send .ics invitations
// - "mailtrap" (default): Uses Mailtrap for testing (emails captured, not sent)
func GetInviteSender() Sender {
	mode := os.Getenv("MAIL_MODE")

	switch mode {
	case "gmail":
		log.Println("Using Gmail SMTP sender for meeting invitations")
		return NewGmailSender()

	case "sendgrid":
		// Default to Mailtrap for safe testing
		log.Println("Using Sendgrid sender for meeting invitations (test mode - emails captured)")
		return nil

	default:
		log.Printf("Unknown MAIL_MODE: %s, defaulting to gmail", mode)
		return NewGmailSender()
	}
}
