package services

import (
	"log"
	"os"
)

// GetInviteSender returns the appropriate Sender implementation based on configuration
// Configuration is determined by the MAIL_MODE environment variable:
// - "gmail": Uses Gmail SMTP to send .ics invitations
// - "outlook": Uses Microsoft Graph SDK to send calendar invitations
// - default: Uses Gmail SMTP
//
// For Outlook mode, accessToken and organizerEmail should be provided via GetInviteSenderWithToken
func GetInviteSender() Sender {
	mode := os.Getenv("MAIL_MODE")

	switch mode {
	case "gmail":
		log.Println("Using Gmail SMTP sender for meeting invitations")
		return NewGmailSender()

	case "outlook":
		log.Println("Using Outlook/Graph API sender for meeting invitations")
		// Note: Access token should be provided via GetInviteSenderWithToken
		// This fallback uses env vars if available
		return NewOutlookSenderFromEnv()

	default:
		log.Printf("Unknown MAIL_MODE: %s, defaulting to gmail", mode)
		return NewGmailSender()
	}
}

// GetInviteSenderWithToken returns the appropriate Sender with authentication token
// This is preferred for Outlook mode as it requires an access token
func GetInviteSenderWithToken(accessToken, organizerEmail string) Sender {
	mode := os.Getenv("MAIL_MODE")

	switch mode {
	case "outlook":
		log.Println("Using Outlook/Graph API sender with provided token")
		return NewOutlookSender(accessToken, organizerEmail)

	case "gmail":
		log.Println("Using Gmail SMTP sender for meeting invitations")
		return NewGmailSender()

	default:
		log.Printf("MAIL_MODE: %s, using Gmail SMTP sender", mode)
		return NewGmailSender()
	}
}
