-- Seed Mock Events Script
-- Creates 200+ events with various users, times, and dates through Dec 31, 2025
-- Run with: psql -U postgres -d meeting_scheduler -f seed_mock_events.sql

-- First, let's clear existing mock events if needed (optional)
-- TRUNCATE TABLE mock_event_attendees CASCADE;
-- TRUNCATE TABLE mock_events CASCADE;

-- Define some common users
DO $$
DECLARE
    users TEXT[] := ARRAY[
        'tarun.gusain@gruve.ai',
        'prerna.mishra@gruve.ai',
        'john.doe@gruve.ai',
        'jane.smith@gruve.ai',
        'alex.johnson@gruve.ai',
        'sarah.williams@gruve.ai',
        'michael.brown@gruve.ai',
        'emily.davis@gruve.ai',
        'david.miller@gruve.ai',
        'lisa.anderson@gruve.ai'
    ];
    
    event_types TEXT[] := ARRAY[
        'Team Standup',
        'Sprint Planning',
        'Sprint Review',
        'One-on-One',
        'Client Meeting',
        'Design Review',
        'Code Review',
        'Product Demo',
        'All Hands',
        'Training Session',
        'Brainstorming',
        'Retrospective',
        'Budget Review',
        'Strategy Session',
        'Technical Discussion'
    ];
    
    locations TEXT[] := ARRAY[
        'Conference Room A',
        'Conference Room B',
        'Meeting Room 1',
        'Meeting Room 2',
        'Zoom',
        'Teams',
        'Office Cabin',
        'Open Space',
        NULL
    ];
    
    start_date DATE := '2025-11-08'::DATE;  -- Start from tomorrow
    end_date DATE := '2025-12-31'::DATE;    -- Through end of year
    curr_date DATE;
    event_count INT := 0;
    
    event_id TEXT;
    organizer TEXT;
    subject TEXT;
    location TEXT;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_minutes INT;
    hour INT;
    is_online BOOLEAN;
    online_url TEXT;
    num_attendees INT;
    i INT;
    attendee TEXT;
    
BEGIN
    -- Loop through dates
    curr_date := start_date;
    
    WHILE curr_date <= end_date AND event_count < 250 LOOP
        -- Skip weekends
        IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN  -- 0=Sunday, 6=Saturday
            
            -- Create 2-5 events per weekday
            FOR day_event IN 1..(2 + floor(random() * 4))::INT LOOP
                
                -- Random hour between 9 AM and 5 PM
                hour := 9 + floor(random() * 9)::INT;
                
                -- Random duration: 30min, 1hr, 1.5hr, or 2hr
                duration_minutes := (ARRAY[30, 60, 90, 120])[1 + floor(random() * 4)::INT];
                
                -- Create timestamp
                start_time := curr_date + (hour || ' hours')::INTERVAL + (floor(random() * 2) * 30 || ' minutes')::INTERVAL;
                end_time := start_time + (duration_minutes || ' minutes')::INTERVAL;
                
                -- Skip if end time goes beyond 6 PM
                IF EXTRACT(HOUR FROM end_time) > 18 THEN
                    CONTINUE;
                END IF;
                
                -- Random organizer
                organizer := users[1 + floor(random() * array_length(users, 1))::INT];
                
                -- Random event type
                subject := event_types[1 + floor(random() * array_length(event_types, 1))::INT];
                
                -- Add date context to subject
                IF EXTRACT(WEEK FROM curr_date) % 2 = 0 THEN
                    subject := subject || ' - Week ' || EXTRACT(WEEK FROM curr_date)::TEXT;
                END IF;
                
                -- Random location and online status
                is_online := random() > 0.5;
                IF is_online THEN
                    location := 'Online';
                    online_url := 'https://teams.microsoft.com/l/meetup-join/' || substr(md5(random()::text), 1, 20);
                ELSE
                    location := locations[1 + floor(random() * array_length(locations, 1))::INT];
                    online_url := NULL;
                END IF;
                
                -- Generate unique event ID
                event_id := 'mock_' || to_char(start_time, 'YYYYMMDD_HH24MI') || '_' || substr(md5(random()::text), 1, 8);
                
                -- Insert event
                BEGIN
                    INSERT INTO mock_events (
                        id, subject, start_time, end_time, organizer, 
                        location, is_online, online_url, body_preview
                    ) VALUES (
                        event_id,
                        subject,
                        start_time,
                        end_time,
                        organizer,
                        location,
                        is_online,
                        online_url,
                        'This is a ' || subject || ' scheduled for ' || to_char(start_time, 'Day, Mon DD at HH24:MI')
                    );
                    
                    event_count := event_count + 1;
                    
                    -- Add attendees (1-5 attendees per meeting, excluding organizer)
                    num_attendees := 1 + floor(random() * 5)::INT;
                    
                    FOR i IN 1..num_attendees LOOP
                        attendee := users[1 + floor(random() * array_length(users, 1))::INT];
                        
                        -- Make sure attendee is not the organizer
                        WHILE attendee = organizer LOOP
                            attendee := users[1 + floor(random() * array_length(users, 1))::INT];
                        END LOOP;
                        
                        -- Insert attendee (ignore duplicates)
                        BEGIN
                            INSERT INTO mock_event_attendees (event_id, attendee_email)
                            VALUES (event_id, attendee);
                        EXCEPTION WHEN unique_violation THEN
                            -- Skip duplicate attendee
                        END;
                    END LOOP;
                    
                EXCEPTION WHEN unique_violation THEN
                    -- Skip duplicate event
                END;
                
            END LOOP;
        END IF;
        
        -- Move to next day
        curr_date := curr_date + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % mock events', event_count;
END $$;

-- Verify the data
SELECT 
    COUNT(*) as total_events,
    MIN(start_time) as earliest_event,
    MAX(start_time) as latest_event,
    COUNT(DISTINCT organizer) as unique_organizers
FROM mock_events;

SELECT 
    COUNT(*) as total_attendee_associations
FROM mock_event_attendees;

-- Show sample events
SELECT 
    subject,
    start_time,
    end_time,
    organizer,
    location,
    is_online
FROM mock_events
ORDER BY start_time
LIMIT 10;

