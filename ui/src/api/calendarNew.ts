/**
 * New Calendar API Integration
 * Matches backend endpoints from handlers/calendar.go and handlers/meeting.go
 */

import { addDays, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

// ============================================================================
// Types matching backend models
// ============================================================================

export interface Event {
  id: string;
  subject: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  organizer: string;
  attendees: string[];
  onlineUrl?: string;
  location?: string;
  bodyPreview?: string;
  isOnline: boolean;
}

export interface TimeSlot {
  start: string; // ISO 8601
  end: string; // ISO 8601;
}

export interface AvailabilityResponse {
  userEmail: string;
  freeSlots: TimeSlot[];
  busySlots: TimeSlot[];
  workingHours: TimeSlot;
  totalFreeTimeMinutes: number;
  totalBusyTimeMinutes: number;
}

export interface MeetingSuggestion {
  start: string; // ISO 8601
  end: string; // ISO 8601
  confidence?: number;
  score?: number;
}

export interface CreateMeetingRequest {
  subject: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  attendees: string[];
  description?: string;
  location?: string;
  isOnline: boolean;
}

export interface FindMeetingTimesRequest {
  attendees: string[];
  duration: number; // in minutes
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  timeZone?: string;
  maxSuggestions?: number;
}

export interface MeetingTimesResponse {
  suggestions: MeetingSuggestion[];
  message?: string;
}

// ============================================================================
// API Functions
// ============================================================================

const API_BASE = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080'}/api`;

/**
 * GET /api/calendar/events
 * Fetch calendar events for a user
 */
export async function getCalendarEvents(
  email: string,
  startTime?: Date,
  endTime?: Date
): Promise<{ events: Event[]; count: number }> {
  const params = new URLSearchParams({ email });
  
  if (startTime) {
    params.append('startTime', startTime.toISOString());
  }
  if (endTime) {
    params.append('endTime', endTime.toISOString());
  }

  const response = await fetch(`${API_BASE}/calendar/events?${params}`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch calendar events');
  }

  return response.json();
}

/**
 * POST /api/calendar/availability
 * Check availability for a user
 */
export async function checkAvailability(
  email: string,
  startTime: Date,
  endTime: Date
): Promise<AvailabilityResponse> {
  const response = await fetch(`${API_BASE}/calendar/availability`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check availability');
  }

  return response.json();
}

/**
 * POST /api/calendar/meetings
 * Create a new meeting
 */
export async function createMeeting(
  request: CreateMeetingRequest,
  organizer?: string
): Promise<{ message: string; event: Event }> {
  const url = organizer 
    ? `${API_BASE}/calendar/meetings?organizer=${encodeURIComponent(organizer)}`
    : `${API_BASE}/calendar/meetings`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'Failed to create meeting');
  }

  return response.json();
}

/**
 * POST /api/calendar/findTimes
 * Find available meeting times for attendees
 */
export async function findMeetingTimes(
  request: FindMeetingTimesRequest,
  organizer?: string
): Promise<MeetingTimesResponse> {
  const url = organizer 
    ? `${API_BASE}/calendar/findTimes?organizer=${encodeURIComponent(organizer)}`
    : `${API_BASE}/calendar/findTimes`;

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || error.details || 'Failed to find meeting times');
  }

  return response.json();
}

// ============================================================================
// Helper Functions for Quick Actions
// ============================================================================

/**
 * Quick availability check for common time ranges
 */
export async function checkQuickAvailability(
  email: string,
  timeRange: 'today' | 'tomorrow' | 'this-week' | 'next-week',
  attendees?: string[]
): Promise<{
  timeRange: string;
  availability: AvailabilityResponse;
  suggestions?: MeetingSuggestion[];
}> {
  const now = new Date();
  let startTime: Date;
  let endTime: Date;
  let rangeLabel: string;

  switch (timeRange) {
    case 'today':
      startTime = startOfDay(now);
      endTime = endOfDay(now);
      rangeLabel = 'Today';
      break;
    case 'tomorrow':
      startTime = startOfDay(addDays(now, 1));
      endTime = endOfDay(addDays(now, 1));
      rangeLabel = 'Tomorrow';
      break;
    case 'this-week':
      startTime = startOfWeek(now, { weekStartsOn: 1 });
      endTime = endOfWeek(now, { weekStartsOn: 1 });
      rangeLabel = 'This Week';
      break;
    case 'next-week':
      const nextWeekStart = addDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
      startTime = nextWeekStart;
      endTime = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
      rangeLabel = 'Next Week';
      break;
    default:
      startTime = startOfDay(now);
      endTime = endOfDay(addDays(now, 7));
      rangeLabel = 'Next 7 Days';
  }

  // Check availability for the user
  const availability = await checkAvailability(email, startTime, endTime);

  // If attendees provided, find meeting times
  let suggestions: MeetingSuggestion[] | undefined;
  if (attendees && attendees.length > 0) {
    const meetingTimesResponse = await findMeetingTimes({
      attendees,
      duration: 60, // Default 1 hour
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      maxSuggestions: 5,
    }, email);
    suggestions = meetingTimesResponse.suggestions;
  }

  return {
    timeRange: rangeLabel,
    availability,
    suggestions,
  };
}

/**
 * Schedule a meeting with smart time finding
 */
export async function smartScheduleMeeting(
  subject: string,
  attendees: string[],
  duration: number,
  preferredTimeRange: { start: Date; end: Date },
  organizer?: string,
  options?: {
    isOnline?: boolean;
    description?: string;
    location?: string;
  }
): Promise<{ message: string; event: Event; suggestions?: MeetingSuggestion[] }> {
  // First, find available meeting times
  const meetingTimesResponse = await findMeetingTimes({
    attendees,
    duration,
    startTime: preferredTimeRange.start.toISOString(),
    endTime: preferredTimeRange.end.toISOString(),
    maxSuggestions: 5,
  }, organizer);

  // If we have suggestions, use the first one (highest confidence)
  if (meetingTimesResponse.suggestions.length > 0) {
    const bestSlot = meetingTimesResponse.suggestions[0];
    
    const meetingRequest: CreateMeetingRequest = {
      subject,
      start: bestSlot.start,
      end: bestSlot.end,
      attendees,
      isOnline: options?.isOnline ?? true,
      description: options?.description,
      location: options?.location,
    };

    const result = await createMeeting(meetingRequest, organizer);
    
    return {
      ...result,
      suggestions: meetingTimesResponse.suggestions.slice(1), // Return other suggestions
    };
  }

  // No available slots found
  throw new Error(meetingTimesResponse.message || 'No available meeting times found');
}

/**
 * Get events for multiple users (for group availability)
 */
export async function getGroupAvailability(
  emails: string[],
  startTime: Date,
  endTime: Date
): Promise<Map<string, AvailabilityResponse>> {
  const availabilityMap = new Map<string, AvailabilityResponse>();

  // Fetch availability for each user in parallel
  const promises = emails.map(async (email) => {
    try {
      const availability = await checkAvailability(email, startTime, endTime);
      availabilityMap.set(email, availability);
    } catch (error) {
      console.error(`Failed to fetch availability for ${email}:`, error);
      // Continue with other users
    }
  });

  await Promise.all(promises);

  return availabilityMap;
}

/**
 * Parse backend Event to frontend-friendly format
 */
export function parseEvent(event: Event) {
  return {
    ...event,
    start: new Date(event.start),
    end: new Date(event.end),
  };
}

/**
 * Parse backend MeetingSuggestion to frontend-friendly format
 */
export function parseMeetingSuggestion(suggestion: MeetingSuggestion) {
  return {
    ...suggestion,
    start: new Date(suggestion.start),
    end: new Date(suggestion.end),
  };
}
