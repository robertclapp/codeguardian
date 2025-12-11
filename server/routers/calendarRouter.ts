import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import {
  GoogleCalendarService,
  OutlookCalendarService,
  scheduleAppointment,
  scheduleTrainingSession,
  scheduleDeadlineReminder,
} from "../services/calendarIntegration";

export const calendarRouter = router({
  /**
   * Connect Google Calendar
   */
  connectGoogle: protectedProcedure
    .input(
      z.object({
        authCode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = new GoogleCalendarService({
        clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
        redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
      });

      try {
        const tokens = await service.getTokensFromCode(input.authCode);

        // Check if provider already exists
        const existing = await db.getActiveCalendarProvider(ctx.user.id, "google");
        
        if (existing) {
          // Update existing provider
          await db.updateCalendarProvider(existing.id, {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          });
        } else {
          // Create new provider
          await db.createCalendarProvider({
            userId: ctx.user.id,
            providerType: "google",
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            isActive: 1,
          });
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect Google Calendar",
        });
      }
    }),

  /**
   * Connect Outlook Calendar
   */
  connectOutlook: protectedProcedure
    .input(
      z.object({
        accessToken: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if provider already exists
      const existing = await db.getActiveCalendarProvider(ctx.user.id, "outlook");
      
      if (existing) {
        // Update existing provider
        await db.updateCalendarProvider(existing.id, {
          accessToken: input.accessToken,
        });
      } else {
        // Create new provider
        await db.createCalendarProvider({
          userId: ctx.user.id,
          providerType: "outlook",
          accessToken: input.accessToken,
          isActive: 1,
        });
      }

      return { success: true };
    }),

  /**
   * Get connected calendar providers
   */
  getProviders: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCalendarProvidersByUserId(ctx.user.id);
  }),

  /**
   * Disconnect a calendar provider
   */
  disconnectProvider: protectedProcedure
    .input(
      z.object({
        providerId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.deleteCalendarProvider(input.providerId);
      return { success: true };
    }),

  /**
   * Schedule an appointment
   */
  scheduleAppointment: protectedProcedure
    .input(
      z.object({
        providerType: z.enum(["google", "outlook"]),
        participantEmail: z.string().email(),
        appointmentType: z.string(),
        startTime: z.string(),
        durationMinutes: z.number(),
        location: z.string().optional(),
        participantId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getActiveCalendarProvider(ctx.user.id, input.providerType);
      
      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.providerType} calendar not connected`,
        });
      }

      try {
        const externalEventId = await scheduleAppointment(
          {
            type: input.providerType,
            accessToken: provider.accessToken,
            refreshToken: provider.refreshToken || undefined,
            expiresAt: provider.expiresAt || undefined,
          },
          input.participantEmail,
          input.appointmentType,
          new Date(input.startTime),
          input.durationMinutes,
          input.location
        );

        // Save to database
        const eventId = await db.createCalendarEvent({
          userId: ctx.user.id,
          providerId: provider.id,
          externalEventId,
          eventType: "appointment",
          title: `${input.appointmentType} Appointment`,
          description: `Scheduled ${input.appointmentType.toLowerCase()} appointment`,
          startTime: new Date(input.startTime),
          endTime: new Date(new Date(input.startTime).getTime() + input.durationMinutes * 60000),
          location: input.location,
          attendees: JSON.stringify([input.participantEmail]),
          participantId: input.participantId,
        });

        return { success: true, eventId, externalEventId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule appointment",
        });
      }
    }),

  /**
   * Schedule a training session
   */
  scheduleTraining: protectedProcedure
    .input(
      z.object({
        providerType: z.enum(["google", "outlook"]),
        participantEmails: z.array(z.string().email()),
        trainingName: z.string(),
        startTime: z.string(),
        durationMinutes: z.number(),
        location: z.string().optional(),
        programId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getActiveCalendarProvider(ctx.user.id, input.providerType);
      
      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.providerType} calendar not connected`,
        });
      }

      try {
        const externalEventId = await scheduleTrainingSession(
          {
            type: input.providerType,
            accessToken: provider.accessToken,
            refreshToken: provider.refreshToken || undefined,
            expiresAt: provider.expiresAt || undefined,
          },
          input.participantEmails,
          input.trainingName,
          new Date(input.startTime),
          input.durationMinutes,
          input.location
        );

        // Save to database
        const eventId = await db.createCalendarEvent({
          userId: ctx.user.id,
          providerId: provider.id,
          externalEventId,
          eventType: "training",
          title: `Training: ${input.trainingName}`,
          description: `Group training session for ${input.trainingName}`,
          startTime: new Date(input.startTime),
          endTime: new Date(new Date(input.startTime).getTime() + input.durationMinutes * 60000),
          location: input.location,
          attendees: JSON.stringify(input.participantEmails),
          programId: input.programId,
        });

        return { success: true, eventId, externalEventId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule training",
        });
      }
    }),

  /**
   * Schedule a deadline reminder
   */
  scheduleDeadline: protectedProcedure
    .input(
      z.object({
        providerType: z.enum(["google", "outlook"]),
        participantEmail: z.string().email(),
        taskName: z.string(),
        deadlineDate: z.string(),
        participantId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getActiveCalendarProvider(ctx.user.id, input.providerType);
      
      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.providerType} calendar not connected`,
        });
      }

      try {
        const externalEventId = await scheduleDeadlineReminder(
          {
            type: input.providerType,
            accessToken: provider.accessToken,
            refreshToken: provider.refreshToken || undefined,
            expiresAt: provider.expiresAt || undefined,
          },
          input.participantEmail,
          input.taskName,
          new Date(input.deadlineDate)
        );

        // Save to database
        const deadlineDate = new Date(input.deadlineDate);
        const startTime = new Date(deadlineDate);
        startTime.setHours(9, 0, 0, 0);
        const endTime = new Date(deadlineDate);
        endTime.setHours(10, 0, 0, 0);

        const eventId = await db.createCalendarEvent({
          userId: ctx.user.id,
          providerId: provider.id,
          externalEventId,
          eventType: "deadline",
          title: `Deadline: ${input.taskName}`,
          description: `Reminder: ${input.taskName} is due today`,
          startTime,
          endTime,
          attendees: JSON.stringify([input.participantEmail]),
          participantId: input.participantId,
        });

        return { success: true, eventId, externalEventId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to schedule deadline reminder",
        });
      }
    }),

  /**
   * Get upcoming events
   */
  getUpcomingEvents: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db.getUpcomingCalendarEvents(ctx.user.id, input.limit || 10);
    }),

  /**
   * Get all events
   */
  getAllEvents: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCalendarEventsByUserId(ctx.user.id);
  }),

  /**
   * Delete an event
   */
  deleteEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await db.getCalendarEventById(input.eventId);
      
      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      const provider = await db.getActiveCalendarProvider(ctx.user.id, event.providerId as any);
      
      if (provider) {
        try {
          if (provider.providerType === "google") {
            const service = new GoogleCalendarService({
              clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
              clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || "",
              redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || "",
            });
            service.setCredentials(provider.accessToken, provider.refreshToken || undefined);
            await service.deleteEvent(event.externalEventId);
          } else {
            const service = new OutlookCalendarService(provider.accessToken);
            await service.deleteEvent(event.externalEventId);
          }
        } catch (error) {
          // Continue even if external deletion fails
        }
      }

      await db.deleteCalendarEvent(input.eventId);
      return { success: true };
    }),
});
