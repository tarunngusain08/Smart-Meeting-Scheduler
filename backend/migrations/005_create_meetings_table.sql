-- Create meetings table for storing local/test meetings
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    location TEXT,
    is_online BOOLEAN DEFAULT false,
    organizer_id TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create meeting_attendees junction table
CREATE TABLE IF NOT EXISTS meeting_attendees (
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    response_status TEXT DEFAULT 'none', -- none, accepted, tentative, declined
    PRIMARY KEY (meeting_id, user_id)
);
