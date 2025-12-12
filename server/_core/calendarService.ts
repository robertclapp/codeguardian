import { google } from 'googleapis';

// Google Calendar credentials from environment
const GOOGLE_CALENDAR_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CALENDAR_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  location?: string;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

/**
 * Create Google Calendar OAuth2 client
 */
function createGoogleCalendarClient(accessToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

/**
 * Create calendar event in Google Calendar
 */
export async function createGoogleCalendarEvent(
  accessToken: string,
  event: CalendarEvent
): Promise<CalendarEventResult> {
  try {
    if (!GOOGLE_CALENDAR_CLIENT_ID || !GOOGLE_CALENDAR_CLIENT_SECRET) {
      return {
        success: false,
        error: 'Google Calendar not configured. Please set GOOGLE_CALENDAR_CLIENT_ID and GOOGLE_CALENDAR_CLIENT_SECRET.',
      };
    }

    const calendar = createGoogleCalendarClient(accessToken);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: event.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 24 hours before
            { method: 'popup', minutes: 30 }, // 30 minutes before
          ],
        },
      },
      sendUpdates: 'all', // Send email notifications to attendees
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
    };
  } catch (error) {
    console.error('[Calendar] Failed to create Google Calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update calendar event in Google Calendar
 */
export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<CalendarEvent>
): Promise<CalendarEventResult> {
  try {
    if (!GOOGLE_CALENDAR_CLIENT_ID || !GOOGLE_CALENDAR_CLIENT_SECRET) {
      return {
        success: false,
        error: 'Google Calendar not configured.',
      };
    }

    const calendar = createGoogleCalendarClient(accessToken);

    const updateData: any = {};
    if (event.title) updateData.summary = event.title;
    if (event.description) updateData.description = event.description;
    if (event.location) updateData.location = event.location;
    if (event.startTime) {
      updateData.start = {
        dateTime: event.startTime.toISOString(),
        timeZone: 'America/New_York',
      };
    }
    if (event.endTime) {
      updateData.end = {
        dateTime: event.endTime.toISOString(),
        timeZone: 'America/New_York',
      };
    }
    if (event.attendees) {
      updateData.attendees = event.attendees.map((email) => ({ email }));
    }

    const response = await calendar.events.patch({
      calendarId: 'primary',
      eventId,
      requestBody: updateData,
      sendUpdates: 'all',
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
    };
  } catch (error) {
    console.error('[Calendar] Failed to update Google Calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete calendar event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<CalendarEventResult> {
  try {
    if (!GOOGLE_CALENDAR_CLIENT_ID || !GOOGLE_CALENDAR_CLIENT_SECRET) {
      return {
        success: false,
        error: 'Google Calendar not configured.',
      };
    }

    const calendar = createGoogleCalendarClient(accessToken);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'all',
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('[Calendar] Failed to delete Google Calendar event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check availability in Google Calendar
 */
export async function checkGoogleCalendarAvailability(
  accessToken: string,
  startTime: Date,
  endTime: Date
): Promise<{ available: boolean; conflictingEvents?: any[] }> {
  try {
    if (!GOOGLE_CALENDAR_CLIENT_ID || !GOOGLE_CALENDAR_CLIENT_SECRET) {
      return { available: false };
    }

    const calendar = createGoogleCalendarClient(accessToken);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    return {
      available: events.length === 0,
      conflictingEvents: events.length > 0 ? events : undefined,
    };
  } catch (error) {
    console.error('[Calendar] Failed to check availability:', error);
    return { available: false };
  }
}

/**
 * Create interview event with automatic email invites
 */
export async function createInterviewEvent(
  accessToken: string,
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
  interviewDate: Date,
  duration: number = 60 // minutes
): Promise<CalendarEventResult> {
  const endTime = new Date(interviewDate.getTime() + duration * 60000);

  return createGoogleCalendarEvent(accessToken, {
    title: `Interview: ${candidateName} - ${jobTitle}`,
    description: `Interview with ${candidateName} for the position of ${jobTitle}.\n\nPlease review the candidate's application before the interview.`,
    startTime: interviewDate,
    endTime,
    attendees: [candidateEmail],
    location: 'Video Conference (link to be shared)',
  });
}

/**
 * Check if Google Calendar is configured
 */
export function isGoogleCalendarConfigured(): boolean {
  return !!(GOOGLE_CALENDAR_CLIENT_ID && GOOGLE_CALENDAR_CLIENT_SECRET);
}

/**
 * Get calendar configuration status
 */
export function getCalendarStatus() {
  return {
    googleConfigured: isGoogleCalendarConfigured(),
    clientId: GOOGLE_CALENDAR_CLIENT_ID ? `${GOOGLE_CALENDAR_CLIENT_ID.substring(0, 20)}...` : 'Not set',
  };
}
