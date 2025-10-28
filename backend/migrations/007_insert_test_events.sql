-- Insert test events for Tarun.Gusain@gruve.ai
-- This creates realistic calendar data for testing the mock mode

-- Clear existing test data (optional)
DELETE FROM mock_event_attendees WHERE event_id LIKE 'test-%';
DELETE FROM mock_events WHERE id LIKE 'test-%';

-- Insert events for today and next few days
INSERT INTO mock_events (id, subject, start_time, end_time, organizer, location, is_online, online_url, body_preview)
VALUES 
  -- Today's events
  (
    'test-event-today-1',
    'Morning Standup',
    CURRENT_DATE + INTERVAL '9 hours',
    CURRENT_DATE + INTERVAL '9 hours 30 minutes',
    'Tarun.Gusain@gruve.ai',
    'Conference Room A',
    false,
    null,
    'Daily team standup meeting'
  ),
  (
    'test-event-today-2',
    'Client Demo',
    CURRENT_DATE + INTERVAL '14 hours',
    CURRENT_DATE + INTERVAL '15 hours',
    'Tarun.Gusain@gruve.ai',
    null,
    true,
    'https://teams.microsoft.com/l/meetup-join/mock/test-event-today-2',
    'Product demo for new client'
  ),
  
  -- Tomorrow's events
  (
    'test-event-tomorrow-1',
    'Sprint Planning',
    CURRENT_DATE + INTERVAL '1 day' + INTERVAL '10 hours',
    CURRENT_DATE + INTERVAL '1 day' + INTERVAL '12 hours',
    'Tarun.Gusain@gruve.ai',
    null,
    true,
    'https://teams.microsoft.com/l/meetup-join/mock/test-event-tomorrow-1',
    'Sprint planning for next iteration'
  ),
  (
    'test-event-tomorrow-2',
    'One-on-One with Manager',
    CURRENT_DATE + INTERVAL '1 day' + INTERVAL '15 hours',
    CURRENT_DATE + INTERVAL '1 day' + INTERVAL '16 hours',
    'Tarun.Gusain@gruve.ai',
    'Manager Office',
    false,
    null,
    'Weekly 1:1 meeting'
  ),
  
  -- Next week events
  (
    'test-event-nextweek-1',
    'Architecture Review',
    CURRENT_DATE + INTERVAL '7 days' + INTERVAL '11 hours',
    CURRENT_DATE + INTERVAL '7 days' + INTERVAL '12 hours 30 minutes',
    'Tarun.Gusain@gruve.ai',
    null,
    true,
    'https://teams.microsoft.com/l/meetup-join/mock/test-event-nextweek-1',
    'Review of system architecture changes'
  ),
  (
    'test-event-nextweek-2',
    'Team Lunch',
    CURRENT_DATE + INTERVAL '8 days' + INTERVAL '12 hours',
    CURRENT_DATE + INTERVAL '8 days' + INTERVAL '13 hours',
    'Tarun.Gusain@gruve.ai',
    'Downtown Restaurant',
    false,
    null,
    'Team building lunch'
  )
ON CONFLICT (id) DO UPDATE SET
  subject = EXCLUDED.subject,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  organizer = EXCLUDED.organizer,
  location = EXCLUDED.location,
  is_online = EXCLUDED.is_online,
  online_url = EXCLUDED.online_url,
  body_preview = EXCLUDED.body_preview,
  updated_at = CURRENT_TIMESTAMP;

-- Insert attendees for the events
INSERT INTO mock_event_attendees (event_id, attendee_email)
VALUES 
  -- Morning Standup attendees
  ('test-event-today-1', 'user1@example.com'),
  ('test-event-today-1', 'user2@example.com'),
  ('test-event-today-1', 'user3@example.com'),
  
  -- Client Demo attendees
  ('test-event-today-2', 'client@example.com'),
  ('test-event-today-2', 'sales@example.com'),
  
  -- Sprint Planning attendees
  ('test-event-tomorrow-1', 'user1@example.com'),
  ('test-event-tomorrow-1', 'user2@example.com'),
  ('test-event-tomorrow-1', 'user3@example.com'),
  ('test-event-tomorrow-1', 'user4@example.com'),
  
  -- One-on-One (just manager)
  ('test-event-tomorrow-2', 'manager@example.com'),
  
  -- Architecture Review attendees
  ('test-event-nextweek-1', 'architect@example.com'),
  ('test-event-nextweek-1', 'user1@example.com'),
  ('test-event-nextweek-1', 'user2@example.com'),
  
  -- Team Lunch attendees
  ('test-event-nextweek-2', 'user1@example.com'),
  ('test-event-nextweek-2', 'user2@example.com'),
  ('test-event-nextweek-2', 'user3@example.com'),
  ('test-event-nextweek-2', 'user4@example.com')
ON CONFLICT (event_id, attendee_email) DO NOTHING;

-- Verify the data
SELECT 
  e.id,
  e.subject,
  e.start_time,
  e.end_time,
  e.is_online,
  COUNT(a.attendee_email) as attendee_count
FROM mock_events e
LEFT JOIN mock_event_attendees a ON e.id = a.event_id
WHERE e.organizer = 'Tarun.Gusain@gruve.ai'
GROUP BY e.id, e.subject, e.start_time, e.end_time, e.is_online
ORDER BY e.start_time;
