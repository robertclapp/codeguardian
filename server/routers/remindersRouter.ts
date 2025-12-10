import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  sendDailyReminders,
  sendMissingDocumentReminders,
  sendPendingApprovalReminders,
  getReminderStats,
  type ReminderSettings,
} from "../services/automatedReminders";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const remindersRouter = router({
  /**
   * Get reminder statistics
   */
  getStats: adminProcedure.query(async () => {
    return await getReminderStats();
  }),

  /**
   * Manually trigger all daily reminders
   */
  sendAllReminders: adminProcedure
    .input(
      z.object({
        settings: z
          .object({
            enabled: z.boolean(),
            frequency: z.enum(["daily", "weekly", "biweekly"]),
            missingDocumentsEnabled: z.boolean(),
            pendingApprovalsEnabled: z.boolean(),
            stageDeadlinesEnabled: z.boolean(),
            reminderThresholdDays: z.number().min(1).max(30),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const settings = input.settings as ReminderSettings | undefined;
      const results = await sendDailyReminders(settings);
      return results;
    }),

  /**
   * Manually trigger missing document reminders only
   */
  sendMissingDocumentReminders: adminProcedure
    .input(
      z.object({
        settings: z
          .object({
            enabled: z.boolean(),
            frequency: z.enum(["daily", "weekly", "biweekly"]),
            missingDocumentsEnabled: z.boolean(),
            pendingApprovalsEnabled: z.boolean(),
            stageDeadlinesEnabled: z.boolean(),
            reminderThresholdDays: z.number().min(1).max(30),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const settings = input.settings as ReminderSettings | undefined;
      const results = await sendMissingDocumentReminders(settings);
      return results;
    }),

  /**
   * Manually trigger pending approval reminders only
   */
  sendPendingApprovalReminders: adminProcedure
    .input(
      z.object({
        settings: z
          .object({
            enabled: z.boolean(),
            frequency: z.enum(["daily", "weekly", "biweekly"]),
            missingDocumentsEnabled: z.boolean(),
            pendingApprovalsEnabled: z.boolean(),
            stageDeadlinesEnabled: z.boolean(),
            reminderThresholdDays: z.number().min(1).max(30),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const settings = input.settings as ReminderSettings | undefined;
      const results = await sendPendingApprovalReminders(settings);
      return results;
    }),
});
