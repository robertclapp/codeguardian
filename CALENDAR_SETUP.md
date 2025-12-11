# Calendar Integration Setup Guide

This guide explains how to set up Google Calendar and Outlook Calendar integration for the AI-Powered HR Platform.

---

## Features

- **Appointment Scheduling**: Schedule one-on-one appointments with participants
- **Training Sessions**: Schedule group training sessions with multiple attendees
- **Deadline Reminders**: Create calendar events for important deadlines
- **Automatic Sync**: Events are automatically synced to Google Calendar or Outlook Calendar
- **Email Notifications**: Attendees receive email notifications for scheduled events

---

## Google Calendar Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Calendar API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Select "Web application"
4. Add authorized redirect URIs:
   - `https://your-domain.com/api/calendar/google/callback`
   - `http://localhost:3000/api/calendar/google/callback` (for development)
5. Copy the **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Add the following to your environment variables (Settings → Secrets in Management UI):

```
GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
GOOGLE_CALENDAR_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALENDAR_REDIRECT_URI=https://your-domain.com/api/calendar/google/callback
```

### 4. Connect Google Calendar

1. Navigate to Settings → Calendar Integration
2. Click "Connect Google Calendar"
3. Authorize the application to access your Google Calendar
4. You're ready to schedule events!

---

## Outlook Calendar Setup

### 1. Register Application in Azure

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Enter application name and select supported account types
5. Add redirect URI: `https://your-domain.com/api/calendar/outlook/callback`
6. Click "Register"

### 2. Configure API Permissions

1. In your app registration, go to "API permissions"
2. Click "Add a permission" → "Microsoft Graph"
3. Select "Delegated permissions"
4. Add the following permissions:
   - `Calendars.ReadWrite`
   - `User.Read`
5. Click "Grant admin consent"

### 3. Create Client Secret

1. Go to "Certificates & secrets"
2. Click "New client secret"
3. Add a description and select expiration
4. Copy the **Value** (this is your client secret)

### 4. Configure Environment Variables

Add the following to your environment variables:

```
OUTLOOK_CALENDAR_CLIENT_ID=your_application_id_here
OUTLOOK_CALENDAR_CLIENT_SECRET=your_client_secret_here
OUTLOOK_CALENDAR_REDIRECT_URI=https://your-domain.com/api/calendar/outlook/callback
```

### 5. Connect Outlook Calendar

1. Navigate to Settings → Calendar Integration
2. Click "Connect Outlook Calendar"
3. Sign in with your Microsoft account
4. Grant the requested permissions
5. You're ready to schedule events!

---

## Usage

### Schedule an Appointment

```typescript
const result = await trpc.calendar.scheduleAppointment.mutate({
  providerType: "google", // or "outlook"
  participantEmail: "participant@example.com",
  appointmentType: "Orientation",
  startTime: "2025-01-15T10:00:00Z",
  durationMinutes: 60,
  location: "Office Building, Room 101",
  participantId: 123,
});
```

### Schedule a Training Session

```typescript
const result = await trpc.calendar.scheduleTraining.mutate({
  providerType: "google",
  participantEmails: [
    "participant1@example.com",
    "participant2@example.com",
  ],
  trainingName: "Safety Training",
  startTime: "2025-01-20T14:00:00Z",
  durationMinutes: 120,
  location: "Training Room A",
  programId: 5,
});
```

### Schedule a Deadline Reminder

```typescript
const result = await trpc.calendar.scheduleDeadline.mutate({
  providerType: "outlook",
  participantEmail: "participant@example.com",
  taskName: "Submit W-4 Form",
  deadlineDate: "2025-01-25T00:00:00Z",
  participantId: 123,
});
```

### Get Upcoming Events

```typescript
const events = await trpc.calendar.getUpcomingEvents.useQuery({
  limit: 10,
});
```

### Disconnect Calendar

```typescript
await trpc.calendar.disconnectProvider.mutate({
  providerId: 1,
});
```

---

## Security Best Practices

1. **Keep credentials secure**: Never commit API keys or secrets to version control
2. **Use HTTPS**: Always use HTTPS in production for redirect URIs
3. **Token refresh**: Google Calendar tokens expire; the system automatically refreshes them
4. **Scope limitation**: Only request the minimum required calendar permissions
5. **User consent**: Always inform users what calendar access is used for

---

## Troubleshooting

### "Calendar not connected" Error

- Verify that you've connected the calendar provider in Settings
- Check that environment variables are correctly configured
- Ensure OAuth credentials are valid and not expired

### Events Not Appearing

- Check that the correct calendar is selected (primary calendar is used by default)
- Verify that the user has granted calendar permissions
- Check the calendar provider's event logs for errors

### Token Expiration

- Google Calendar tokens are automatically refreshed using the refresh token
- Outlook Calendar tokens may need to be reconnected periodically
- If you see authentication errors, try disconnecting and reconnecting the calendar

---

## API Reference

### Calendar Router Endpoints

- `calendar.connectGoogle` - Connect Google Calendar
- `calendar.connectOutlook` - Connect Outlook Calendar
- `calendar.getProviders` - Get connected calendar providers
- `calendar.disconnectProvider` - Disconnect a calendar provider
- `calendar.scheduleAppointment` - Schedule an appointment
- `calendar.scheduleTraining` - Schedule a training session
- `calendar.scheduleDeadline` - Schedule a deadline reminder
- `calendar.getUpcomingEvents` - Get upcoming calendar events
- `calendar.getAllEvents` - Get all calendar events
- `calendar.deleteEvent` - Delete a calendar event

---

## Support

For additional help:
- Check the [Google Calendar API documentation](https://developers.google.com/calendar)
- Check the [Microsoft Graph Calendar API documentation](https://docs.microsoft.com/en-us/graph/api/resources/calendar)
- Contact support at https://help.manus.im
