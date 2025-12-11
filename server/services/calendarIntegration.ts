/**
 * Calendar Integration Service
 * 
 * Integrates with Google Calendar and Outlook Calendar for scheduling
 */

import { google } from "googleapis";

export interface CalendarEvent {
  id?: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "email" | "popup";
      minutes: number;
    }>;
  };
}

export interface CalendarProvider {
  type: "google" | "outlook";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Google Calendar Integration
 */
export class GoogleCalendarService {
  private oauth2Client: any;

  constructor(credentials: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
  }

  /**
   * Get authorization URL for OAuth flow
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
    };
  }

  /**
   * Set credentials for API calls
   */
  setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: "America/New_York",
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: "America/New_York",
        },
        attendees: event.attendees.map(email => ({ email })),
        location: event.location,
        reminders: event.reminders || {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
      },
    });

    return response.data.id!;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    await calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: event.title,
        description: event.description,
        start: event.startTime ? {
          dateTime: event.startTime.toISOString(),
          timeZone: "America/New_York",
        } : undefined,
        end: event.endTime ? {
          dateTime: event.endTime.toISOString(),
          timeZone: "America/New_York",
        } : undefined,
        attendees: event.attendees?.map(email => ({ email })),
        location: event.location,
      },
    });
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  }

  /**
   * List upcoming events
   */
  async listEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    const calendar = google.calendar({ version: "v3", auth: this.oauth2Client });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (response.data.items || []).map((item: any) => ({
      id: item.id!,
      title: item.summary || "",
      description: item.description || "",
      startTime: new Date(item.start?.dateTime || item.start?.date || ""),
      endTime: new Date(item.end?.dateTime || item.end?.date || ""),
      attendees: (item.attendees || []).map((a: any) => a.email!),
      location: item.location,
    }));
  }
}

/**
 * Outlook Calendar Integration
 */
export class OutlookCalendarService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: CalendarEvent): Promise<string> {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: event.title,
        body: {
          contentType: "HTML",
          content: event.description,
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: "Eastern Standard Time",
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: "Eastern Standard Time",
        },
        location: {
          displayName: event.location || "",
        },
        attendees: event.attendees.map(email => ({
          emailAddress: {
            address: email,
          },
          type: "required",
        })),
        reminderMinutesBeforeStart: 30,
        isReminderOn: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  }

  /**
   * Update a calendar event
   */
  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: event.title,
        body: event.description ? {
          contentType: "HTML",
          content: event.description,
        } : undefined,
        start: event.startTime ? {
          dateTime: event.startTime.toISOString(),
          timeZone: "Eastern Standard Time",
        } : undefined,
        end: event.endTime ? {
          dateTime: event.endTime.toISOString(),
          timeZone: "Eastern Standard Time",
        } : undefined,
        location: event.location ? {
          displayName: event.location,
        } : undefined,
        attendees: event.attendees?.map(email => ({
          emailAddress: {
            address: email,
          },
          type: "required",
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${eventId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }
  }

  /**
   * List upcoming events
   */
  async listEvents(maxResults: number = 10): Promise<CalendarEvent[]> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendar/events?$top=${maxResults}&$orderby=start/dateTime`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Outlook API error: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.value || []).map((item: any) => ({
      id: item.id,
      title: item.subject,
      description: item.body?.content || "",
      startTime: new Date(item.start.dateTime),
      endTime: new Date(item.end.dateTime),
      attendees: (item.attendees || []).map((a: any) => a.emailAddress.address),
      location: item.location?.displayName,
    }));
  }
}

/**
 * Helper functions for common calendar operations
 */

/**
 * Schedule a participant appointment
 */
export async function scheduleAppointment(
  provider: CalendarProvider,
  participantEmail: string,
  appointmentType: string,
  startTime: Date,
  durationMinutes: number,
  location?: string
): Promise<string> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const event: CalendarEvent = {
    title: `${appointmentType} Appointment`,
    description: `Scheduled ${appointmentType.toLowerCase()} appointment for participant.`,
    startTime,
    endTime,
    attendees: [participantEmail],
    location,
  };

  if (provider.type === "google") {
    const service = new GoogleCalendarService({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
    });
    service.setCredentials(provider.accessToken, provider.refreshToken);
    return await service.createEvent(event);
  } else {
    const service = new OutlookCalendarService(provider.accessToken);
    return await service.createEvent(event);
  }
}

/**
 * Schedule a training session
 */
export async function scheduleTrainingSession(
  provider: CalendarProvider,
  participantEmails: string[],
  trainingName: string,
  startTime: Date,
  durationMinutes: number,
  location?: string
): Promise<string> {
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  const event: CalendarEvent = {
    title: `Training: ${trainingName}`,
    description: `Group training session for ${trainingName}.`,
    startTime,
    endTime,
    attendees: participantEmails,
    location,
  };

  if (provider.type === "google") {
    const service = new GoogleCalendarService({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
    });
    service.setCredentials(provider.accessToken, provider.refreshToken);
    return await service.createEvent(event);
  } else {
    const service = new OutlookCalendarService(provider.accessToken);
    return await service.createEvent(event);
  }
}

/**
 * Schedule a deadline reminder
 */
export async function scheduleDeadlineReminder(
  provider: CalendarProvider,
  participantEmail: string,
  taskName: string,
  deadlineDate: Date
): Promise<string> {
  // Create an all-day event on the deadline date
  const startTime = new Date(deadlineDate);
  startTime.setHours(9, 0, 0, 0); // 9 AM
  const endTime = new Date(deadlineDate);
  endTime.setHours(10, 0, 0, 0); // 10 AM

  const event: CalendarEvent = {
    title: `Deadline: ${taskName}`,
    description: `Reminder: ${taskName} is due today.`,
    startTime,
    endTime,
    attendees: [participantEmail],
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 24 * 60 }, // 1 day before
        { method: "popup", minutes: 60 }, // 1 hour before
      ],
    },
  };

  if (provider.type === "google") {
    const service = new GoogleCalendarService({
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
      redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
    });
    service.setCredentials(provider.accessToken, provider.refreshToken);
    return await service.createEvent(event);
  } else {
    const service = new OutlookCalendarService(provider.accessToken);
    return await service.createEvent(event);
  }
}
