package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
)

// OutlookSender implements the Sender interface using Microsoft Graph SDK
// to send calendar invitations via Outlook/Exchange
type OutlookSender struct {
	AccessToken string // Access token for Graph API authentication
	OrganizerEmail string // Email of the organizer (user creating the event)
}

// NewOutlookSender creates a new Outlook sender instance
// Requires access token and organizer email to be provided
// Configuration can be loaded from environment or passed dynamically
func NewOutlookSender(accessToken, organizerEmail string) *OutlookSender {
	return &OutlookSender{
		AccessToken: accessToken,
		OrganizerEmail: organizerEmail,
	}
}

// NewOutlookSenderFromEnv creates a new Outlook sender from environment variables
// This is a convenience method, but access token should typically come from request context
func NewOutlookSenderFromEnv() *OutlookSender {
	// Note: Access token should come from authenticated session, not env
	// This is mainly for testing/fallback
	accessToken := os.Getenv("GRAPH_ACCESS_TOKEN")
	organizerEmail := os.Getenv("ORGANIZER_EMAIL")
	
	if accessToken == "" {
		log.Println("WARNING: GRAPH_ACCESS_TOKEN not set - Outlook sender will need token from context")
	}
	if organizerEmail == "" {
		log.Println("WARNING: ORGANIZER_EMAIL not set - Outlook sender will need organizer email")
	}

	return &OutlookSender{
		AccessToken: accessToken,
		OrganizerEmail: organizerEmail,
	}
}

// SendInvite sends a meeting invitation via Microsoft Graph API
// Creates a calendar event which automatically sends invites to all attendees
func (o *OutlookSender) SendInvite(invite *MeetingInvite) error {
	if o.AccessToken == "" {
		return fmt.Errorf("access token not provided - Outlook sender requires authentication")
	}

	// Use organizer from invite if provided, otherwise use sender's organizer
	organizerEmail := invite.Organizer
	if organizerEmail == "" {
		organizerEmail = o.OrganizerEmail
	}
	if organizerEmail == "" {
		return fmt.Errorf("organizer email not provided")
	}

	// Initialize Graph SDK client
	authProvider := &TokenAuthProvider{AccessToken: o.AccessToken}
	adapter, err := msgraphsdk.NewGraphRequestAdapter(authProvider)
	if err != nil {
		return fmt.Errorf("error creating graph adapter: %v", err)
	}
	graphClient := msgraphsdk.NewGraphServiceClient(adapter)

	// Create event request body
	requestBody := graphmodels.NewEvent()
	
	// Set subject
	requestBody.SetSubject(&invite.Subject)

	// Set body/description
	if invite.Description != "" {
		body := graphmodels.NewItemBody()
		contentType := graphmodels.HTML_BODYTYPE
		body.SetContentType(&contentType)
		body.SetContent(&invite.Description)
		requestBody.SetBody(body)
	}

	// Parse and set start time
	startTime, err := parseTimeString(invite.StartTime)
	if err != nil {
		return fmt.Errorf("invalid start time format: %w", err)
	}
	
	// Determine timezone from parsed time or use default
	timeZone := getTimeZoneFromTime(startTime)
	
	// Set up headers with timezone preference
	headers := abstractions.NewRequestHeaders()
	headers.Add("Prefer", fmt.Sprintf("outlook.timezone=\"%s\"", timeZone))

	configuration := &graphusers.ItemEventsRequestBuilderPostRequestConfiguration{
		Headers: headers,
	}
	
	start := graphmodels.NewDateTimeTimeZone()
	// Format as dateTime without timezone indicator (Graph API expects format like "2017-04-15T12:00:00")
	startDateTime := startTime.Format("2006-01-02T15:04:05")
	start.SetDateTime(&startDateTime)
	start.SetTimeZone(&timeZone)
	requestBody.SetStart(start)

	// Parse and set end time
	endTime, err := parseTimeString(invite.EndTime)
	if err != nil {
		return fmt.Errorf("invalid end time format: %w", err)
	}
	end := graphmodels.NewDateTimeTimeZone()
	endDateTime := endTime.Format("2006-01-02T15:04:05")
	end.SetDateTime(&endDateTime)
	end.SetTimeZone(&timeZone)
	requestBody.SetEnd(end)

	// Set location
	if invite.Location != "" {
		location := graphmodels.NewLocation()
		location.SetDisplayName(&invite.Location)
		requestBody.SetLocation(location)
	}

	// Set attendees
	var attendeeObjs []graphmodels.Attendeeable
	for _, email := range invite.Attendees {
		attendee := graphmodels.NewAttendee()
		emailAddress := graphmodels.NewEmailAddress()
		emailAddress.SetAddress(&email)
		
		// Try to extract name from email if possible
		name := extractNameFromEmail(email)
		emailAddress.SetName(&name)
		
		attendee.SetEmailAddress(emailAddress)
		
		// Note: Attendee type defaults to "required" in Graph API
		// The SDK version may not expose SetType method directly
		// Attendees will be added as required by default
		
		attendeeObjs = append(attendeeObjs, attendee)
	}
	requestBody.SetAttendees(attendeeObjs)

	// Allow new time proposals
	allowNewTimeProposals := true
	requestBody.SetAllowNewTimeProposals(&allowNewTimeProposals)

	// Create the event using Graph API
	// This automatically sends calendar invitations to all attendees
	var createdEvent graphmodels.Eventable
	if organizerEmail == "me" || strings.HasSuffix(strings.ToLower(organizerEmail), "@me") {
		// Use /me/events endpoint for authenticated user
		createdEvent, err = graphClient.Me().Events().Post(context.Background(), requestBody, configuration)
	} else {
		// Use /users/{email}/events endpoint for specific user
		createdEvent, err = graphClient.Users().ByUserId(organizerEmail).Events().Post(context.Background(), requestBody, configuration)
	}

	if err != nil {
		return fmt.Errorf("failed to create event via Graph API: %v", err)
	}

	if createdEvent.GetId() != nil {
		log.Printf("Successfully created event %s and sent invites to %d attendees via Outlook/Graph API", 
			*createdEvent.GetId(), len(invite.Attendees))
	} else {
		log.Printf("Successfully created event and sent invites to %d attendees via Outlook/Graph API", 
			len(invite.Attendees))
	}

	return nil
}

// parseTimeString parses a time string in various formats (RFC3339, ISO8601, etc.)
func parseTimeString(timeStr string) (time.Time, error) {
	// Try RFC3339 first (most common)
	t, err := time.Parse(time.RFC3339, timeStr)
	if err == nil {
		return t, nil
	}

	// Try without timezone
	t, err = time.Parse("2006-01-02T15:04:05", timeStr)
	if err == nil {
		return t, nil
	}

	// Try with Z suffix
	t, err = time.Parse("2006-01-02T15:04:05Z", timeStr)
	if err == nil {
		return t, nil
	}

	return time.Time{}, fmt.Errorf("unable to parse time string: %s", timeStr)
}

// getTimeZoneFromTime determines the timezone from the time or uses a default
// In production, this should be determined from user preferences or invite data
func getTimeZoneFromTime(t time.Time) string {
	// Try to get timezone from the time's location
	if t.Location() != nil && t.Location().String() != "UTC" {
		// Convert common Go timezone names to IANA format
		loc := t.Location().String()
		if strings.Contains(loc, "IST") || strings.Contains(loc, "Asia/Kolkata") {
			return "Asia/Kolkata"
		}
		if strings.Contains(loc, "PST") || strings.Contains(loc, "Pacific") {
			return "Pacific Standard Time"
		}
		if strings.Contains(loc, "EST") || strings.Contains(loc, "Eastern") {
			return "Eastern Standard Time"
		}
		// Return the location string if it looks like an IANA timezone
		if strings.Contains(loc, "/") {
			return loc
		}
	}
	
	// Default to UTC
	return "UTC"
}

// extractNameFromEmail extracts a display name from an email address
// e.g., "john.doe@example.com" -> "John Doe"
func extractNameFromEmail(email string) string {
	// Remove domain
	parts := strings.Split(email, "@")
	if len(parts) == 0 {
		return email
	}

	localPart := parts[0]
	
	// Replace dots and underscores with spaces, then title case
	name := strings.ReplaceAll(localPart, ".", " ")
	name = strings.ReplaceAll(name, "_", " ")
	name = strings.ReplaceAll(name, "-", " ")
	
	// Simple title case
	words := strings.Fields(name)
	for i, word := range words {
		if len(word) > 0 {
			words[i] = strings.ToUpper(word[:1]) + strings.ToLower(word[1:])
		}
	}
	
	result := strings.Join(words, " ")
	if result == "" {
		return email
	}
	
	return result
}

