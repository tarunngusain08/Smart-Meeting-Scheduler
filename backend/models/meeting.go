package models

type CreateMeetingRequest struct {
	Subject     string `json:"subject"`
	Start       string `json:"start"` // ISO8601 format
	End         string `json:"end"`   // ISO8601 format
	Attendees   []User `json:"attendees"`
	IsOnline    bool   `json:"isOnline"`
	Description string `json:"description,omitempty"`
	Location    string `json:"location,omitempty"`
}

type Meeting struct {
	ID          string    `json:"id"`
	Subject     string    `json:"subject"`
	StartTime   time.Time `json:"startTime"`
	EndTime     time.Time `json:"endTime"`
	Description string    `json:"description,omitempty"`
	Location    string    `json:"location,omitempty"`
	IsOnline    bool      `json:"isOnline"`
	OrganizerID string    `json:"organizerId"`
	CreatedAt   time.Time `json:"createdAt"`
	Attendees   []User    `json:"attendees"`
}

type MeetingStore struct {
	db *sql.DB
}

func NewMeetingStore(db *sql.DB) *MeetingStore {
	return &MeetingStore{db: db}
}

func (s *MeetingStore) CreateMeeting(meeting *Meeting, attendees []User) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert meeting
	var meetingID string
	err = tx.QueryRow(`
		INSERT INTO meetings (subject, start_time, end_time, description, location, is_online, organizer_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`, meeting.Subject, meeting.StartTime, meeting.EndTime, meeting.Description, 
	   meeting.Location, meeting.IsOnline, meeting.OrganizerID).Scan(&meetingID)
	if err != nil {
		return err
	}

	// Insert attendees
	stmt, err := tx.Prepare(`
		INSERT INTO meeting_attendees (meeting_id, user_id, response_status)
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, attendee := range attendees {
		_, err = stmt.Exec(meetingID, attendee.ID, "none")
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}
