package services

import (
	"log"
	"os"
)

// GetInviteSender returns the appropriate Sender implementation based on configuration
// Configuration is determined by the INVITE_SENDER_MODE environment variable:
// - "gmail": Uses Gmail SMTP to send .ics invitations
// - "mailtrap" (default): Uses Mailtrap for testing (emails captured, not sent)
func GetInviteSender() Sender {
	mode := os.Getenv("INVITE_SENDER_MODE")

	switch mode {
	case "gmail":
		log.Println("Using Gmail SMTP sender for meeting invitations")
		return NewGmailSender()

	case "mailtrap", "":
		// Default to Mailtrap for safe testing
		log.Println("Using Mailtrap sender for meeting invitations (test mode - emails captured)")
		return NewMailtrapSender()

	default:
		log.Printf("Unknown INVITE_SENDER_MODE: %s, defaulting to gmail", mode)
		return NewGmailSender()
	}
}

// GetInviteSenderForMode allows explicit mode selection
// Useful for testing or when you want to override the environment variable
func GetInviteSenderForMode(mode string) Sender {
	switch mode {
	case "gmail":
		return NewGmailSender()
	case "mailtrap":
		return NewMailtrapSender()
	default:
		return NewMailtrapSender()
	}
}
