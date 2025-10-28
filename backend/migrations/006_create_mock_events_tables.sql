-- Create mock_events table for storing calendar events in local database
CREATE TABLE IF NOT EXISTS mock_events (
    id VARCHAR(255) PRIMARY KEY,
    subject VARCHAR(500) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    organizer VARCHAR(255) NOT NULL,
    location VARCHAR(500),
    is_online BOOLEAN DEFAULT FALSE,
    online_url TEXT,
    body_preview TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create mock_event_attendees table for storing event attendees
CREATE TABLE IF NOT EXISTS mock_event_attendees (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL REFERENCES mock_events(id) ON DELETE CASCADE,
    attendee_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, attendee_email)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mock_events_organizer ON mock_events(organizer);
CREATE INDEX IF NOT EXISTS idx_mock_events_start_time ON mock_events(start_time);
CREATE INDEX IF NOT EXISTS idx_mock_events_end_time ON mock_events(end_time);
CREATE INDEX IF NOT EXISTS idx_mock_event_attendees_email ON mock_event_attendees(attendee_email);
CREATE INDEX IF NOT EXISTS idx_mock_event_attendees_event_id ON mock_event_attendees(event_id);

-- Insert some sample data for testing
INSERT INTO mock_events (id, subject, start_time, end_time, organizer, location, is_online, online_url)
VALUES 
    ('mock-event-1', 'Team Standup', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours 30 minutes', 'user@example.com', 'Conference Room A', false, null),
    ('mock-event-2', 'Project Review', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '14 hours', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '15 hours', 'user@example.com', null, true, 'https://teams.microsoft.com/l/meetup-join/mock/event-2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO mock_event_attendees (event_id, attendee_email)
VALUES 
    ('mock-event-1', 'attendee1@example.com'),
    ('mock-event-1', 'attendee2@example.com'),
    ('mock-event-2', 'attendee1@example.com')
ON CONFLICT (event_id, attendee_email) DO NOTHING;
