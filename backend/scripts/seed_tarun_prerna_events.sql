-- Add 25+ events specifically for Tarun.Gusain@gruve.ai and Prerna.Mishra@gruve.ai
-- Run with: docker exec -i smart-meeting-scheduler-postgres-1 psql -U scheduler -d meeting_scheduler < seed_tarun_prerna_events.sql

DO $$
DECLARE
    users TEXT[] := ARRAY[
        'Tarun.Gusain@gruve.ai',
        'Prerna.Mishra@gruve.ai'
    ];
    
    other_users TEXT[] := ARRAY[
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
        'Sprint Planning',
        'Sprint Review',
        'Sprint Retrospective',
        'Daily Standup',
        'One-on-One with Manager',
        'Team Sync',
        'Client Presentation',
        'Product Demo',
        'Technical Discussion',
        'Code Review Session',
        'Architecture Review',
        'Design Workshop',
        'Quarterly Planning',
        'Budget Review',
        'Strategy Meeting',
        'Training Session',
        'Knowledge Sharing',
        'Project Kickoff',
        'Status Update',
        'Team Building'
    ];
    
    locations TEXT[] := ARRAY[
        'Conference Room A',
        'Conference Room B',
        'Meeting Room 1',
        'Meeting Room 2',
        'Executive Room',
        'Team Space',
        'Online',
        NULL
    ];
    
    start_date DATE := '2025-11-11'::DATE;  -- Start from Monday, Nov 11
    end_date DATE := '2025-11-30'::DATE;    -- Through end of November
    curr_date DATE;
    event_count INT := 0;
    target_events INT := 25;
    
    event_id TEXT;
    organizer TEXT;
    subject TEXT;
    location TEXT;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration_minutes INT;
    hour INT;
    minute INT;
    is_online BOOLEAN;
    online_url TEXT;
    num_attendees INT;
    i INT;
    attendee TEXT;
    user_idx INT;
    
BEGIN
    -- Loop through dates
    curr_date := start_date;
    user_idx := 1;  -- Start with Tarun
    
    WHILE curr_date <= end_date AND event_count < target_events LOOP
        -- Skip weekends
        IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN  -- 0=Sunday, 6=Saturday
            
            -- Create 1-2 events per user per weekday
            FOR day_event IN 1..2 LOOP
                
                -- Alternate between Tarun and Prerna
                organizer := users[user_idx];
                user_idx := CASE WHEN user_idx = 1 THEN 2 ELSE 1 END;
                
                -- Random hour between 9 AM and 5 PM
                hour := 9 + floor(random() * 8)::INT;
                minute := (ARRAY[0, 30])[1 + floor(random() * 2)::INT];
                
                -- Random duration: 30min, 1hr, 1.5hr
                duration_minutes := (ARRAY[30, 60, 90])[1 + floor(random() * 3)::INT];
                
                -- Create timestamp
                start_time := curr_date + (hour || ' hours')::INTERVAL + (minute || ' minutes')::INTERVAL;
                end_time := start_time + (duration_minutes || ' minutes')::INTERVAL;
                
                -- Skip if end time goes beyond 6 PM
                IF EXTRACT(HOUR FROM end_time) >= 18 THEN
                    CONTINUE;
                END IF;
                
                -- Random event type
                subject := event_types[1 + floor(random() * array_length(event_types, 1))::INT];
                
                -- Random location and online status
                is_online := random() > 0.4;  -- 60% online meetings
                IF is_online THEN
                    location := 'Online';
                    online_url := 'https://teams.microsoft.com/l/meetup-join/' || substr(md5(random()::text), 1, 20);
                ELSE
                    location := locations[1 + floor(random() * (array_length(locations, 1) - 1))::INT];
                    online_url := NULL;
                END IF;
                
                -- Generate unique event ID
                event_id := 'tp_' || to_char(start_time, 'YYYYMMDD_HH24MI') || '_' || substr(md5(random()::text), 1, 8);
                
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
                        'Meeting organized by ' || organizer || ' - ' || subject
                    );
                    
                    event_count := event_count + 1;
                    
                    -- Add the other person (Tarun or Prerna) as an attendee
                    IF organizer = 'Tarun.Gusain@gruve.ai' THEN
                        -- Prerna attends 70% of Tarun's meetings
                        IF random() > 0.3 THEN
                            INSERT INTO mock_event_attendees (event_id, attendee_email)
                            VALUES (event_id, 'Prerna.Mishra@gruve.ai');
                        END IF;
                    ELSE
                        -- Tarun attends 70% of Prerna's meetings
                        IF random() > 0.3 THEN
                            INSERT INTO mock_event_attendees (event_id, attendee_email)
                            VALUES (event_id, 'Tarun.Gusain@gruve.ai');
                        END IF;
                    END IF;
                    
                    -- Add 1-3 other attendees
                    num_attendees := 1 + floor(random() * 3)::INT;
                    
                    FOR i IN 1..num_attendees LOOP
                        attendee := other_users[1 + floor(random() * array_length(other_users, 1))::INT];
                        
                        -- Insert attendee (ignore duplicates)
                        BEGIN
                            INSERT INTO mock_event_attendees (event_id, attendee_email)
                            VALUES (event_id, attendee);
                        EXCEPTION WHEN unique_violation THEN
                            -- Skip duplicate attendee
                        END;
                    END LOOP;
                    
                    -- Exit if we reached target
                    IF event_count >= target_events THEN
                        EXIT;
                    END IF;
                    
                EXCEPTION WHEN unique_violation THEN
                    -- Skip duplicate event, continue
                END;
                
            END LOOP;
        END IF;
        
        -- Move to next day
        curr_date := curr_date + 1;
    END LOOP;
    
    RAISE NOTICE 'Successfully created % events for Tarun and Prerna', event_count;
END $$;

-- Verify the data
SELECT 
    'Tarun Events:' as info,
    COUNT(*) as count
FROM mock_events
WHERE organizer = 'Tarun.Gusain@gruve.ai' AND start_time >= '2025-11-11'
UNION ALL
SELECT 
    'Prerna Events:' as info,
    COUNT(*) as count
FROM mock_events
WHERE organizer = 'Prerna.Mishra@gruve.ai' AND start_time >= '2025-11-11';

-- Show sample events
SELECT 
    subject,
    to_char(start_time, 'Day DD Mon HH24:MI') as datetime,
    organizer,
    CASE WHEN is_online THEN 'Online' ELSE location END as venue
FROM mock_events
WHERE (organizer = 'Tarun.Gusain@gruve.ai' OR organizer = 'Prerna.Mishra@gruve.ai')
  AND start_time >= '2025-11-11'
ORDER BY start_time
LIMIT 15;

-- Show total stats
SELECT 
    COUNT(*) as total_events,
    COUNT(DISTINCT organizer) as unique_organizers
FROM mock_events;

