import { addDays, startOfDay, endOfDay } from 'date-fns';

export interface CalendarEvent {
  id: string;
  subject: string;
  start: Date;
  end: Date;
  location?: string;
  isOnline: boolean;
  joinUrl?: string;
  organizer: {
    email: string;
    name?: string;
  };
  attendees: Array<{
    email: string;
    name?: string;
  }>;
  isCancelled: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  score?: number;
}

export interface AvailabilityResponse {
  availableSlots: TimeSlot[];
  suggestions: TimeSlot[];
  reason?: string;
}

export async function fetchCalendarEvents(days: number = 7): Promise<CalendarEvent[]> {
  const response = await fetch(`http://localhost:8080/api/calendar/events?days=${days}`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch calendar events');
  }
  const events = await response.json();
  return events.map((event: any) => ({
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  }));
}

export async function checkAvailability(
  days: number = 7,
  duration: number = 60,
  attendees: Array<{ email: string; name?: string }> = []
): Promise<AvailabilityResponse> {
  const startTime = startOfDay(new Date());
  const endTime = endOfDay(addDays(startTime, days));
  
  const response = await fetch('http://localhost:8080/api/calendar/availability', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      durationInMinutes: duration,
      participants: [
        ...attendees.map(a => ({ 
          email: a.email, 
          name: a.name
        }))
      ]
    }),
  });

  console.log('Availability API Response:', response.status);
  const data = await response.json();
  console.log('Availability Data:', data);

  if (!response.ok) {
    throw new Error(`Failed to check availability: ${data.error || 'Unknown error'}`);
  }
  return {
    ...data,
    availableSlots: data.availableSlots?.map((slot: any) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    })) || [],
    suggestions: data.suggestions?.map((slot: any) => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
    })) || [],
  };
}

export interface User {
  id: string;
  displayName: string;
  email: string;
}

export async function searchUsers(query: string): Promise<User[]> {
  const response = await fetch(`http://localhost:8080/graph/users/search?q=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error('Failed to search users');
  }

  const users = await response.json();
  return users.map((user: any) => ({
    id: user.id,
    displayName: user.displayName,
    email: user.mail || user.userPrincipalName
  }));
}

interface CreateMeetingRequest {
  subject: string;
  start: string; // ISO8601 format
  end: string; // ISO8601 format
  attendees: Array<{ email: string; name?: string }>;
  isOnline?: boolean;
  description?: string;
  location?: string;
}

interface CreateMeetingResponse {
  id: string;
  subject: string;
  webLink: string;
  joinUrl?: string;
}

export async function createMeeting(request: CreateMeetingRequest): Promise<CreateMeetingResponse> {
  const response = await fetch('http://localhost:8080/api/calendar/meetings', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Failed to create meeting');
  }

  return response.json();
}