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

export async function checkAvailability(days: number = 7, duration: number = 60): Promise<AvailabilityResponse> {
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
      duration,
      attendees: [] // Empty array means only check current user's availability
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to check availability');
  }

  const data = await response.json();
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
