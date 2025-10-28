#!/bin/bash

# Database configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="meeting_scheduler"
DB_USER="scheduler"
DB_PASSWORD="scheduler"

export PGPASSWORD="$DB_PASSWORD"

# Function to generate random datetime within next 30 days
generate_random_datetime() {
    local days=$((RANDOM % 30 + 1))
    local hours=$((RANDOM % 24))
    local minutes=$((RANDOM % 60))
    date -v +${days}d -v +${hours}H -v +${minutes}M "+%Y-%m-%d %H:%M:%S"
}

# Function to extract clean UUID from psql output
extract_uuid() {
    echo "$1" | grep -Eo '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
}

# Function to get random user IDs
get_random_users() {
    local count=$1
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t \
        -c "SELECT id FROM users ORDER BY RANDOM() LIMIT $count"
}

# Main script
for i in {1..50}; do
    echo "Creating meeting $i/50"
    
    # Generate meeting details
    subject="Meeting $i"
    start_time=$(generate_random_datetime)
    end_time=$(date -j -f "%Y-%m-%d %H:%M:%S" -v +$((30 + RANDOM % 180))M "$start_time" "+%Y-%m-%d %H:%M:%S")
    description="Description for $subject"
    location="Conference Room $((RANDOM % 10 + 1))"
    is_online=$([ $((RANDOM % 2)) -eq 1 ] && echo "true" || echo "false")
    
    # Get random organizer
    organizer_raw=$(get_random_users 1)
    organizer=$(extract_uuid "$organizer_raw")
    
    # Insert meeting
    meeting_id_raw=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t \
        -c "INSERT INTO meetings (subject, start_time, end_time, description, location, is_online, organizer_id) 
            VALUES ('$subject', '$start_time', '$end_time', '$description', '$location', $is_online, '$organizer') 
            RETURNING id")
    meeting_id=$(extract_uuid "$meeting_id_raw")
    
    # If meeting creation failed, skip participants
    if [ -z "$meeting_id" ]; then
        echo "ERROR: Failed to create meeting. Skipping participants."
        echo "----------------------------------------"
        continue
    fi
    
    # Get participants (3-10)
    participant_count=$((3 + RANDOM % 8))
    participants=$(get_random_users "$participant_count")
    
    # Insert participants
    for user_id_raw in $participants; do
        # Clean user ID
        user_id=$(extract_uuid "$user_id_raw")
        
        # Skip if empty or organizer
        if [ -z "$user_id" ] || [ "$user_id" == "$organizer" ]; then
            continue
        fi
        
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -c "INSERT INTO meeting_attendees (meeting_id, user_id, response_status) 
                VALUES ('$meeting_id', '$user_id', 'accepted')" >/dev/null
    done
    
    # Print summary
    echo "Created meeting $meeting_id:"
    echo "  Subject: $subject"
    echo "  Time: $start_time to $end_time"
    echo "  Organizer: $organizer"
    echo "  Participants: $participant_count users"
    echo "----------------------------------------"
done

echo "All 50 meetings created successfully!"