import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  sendSMS,
  sendNotificationSMS,
  validatePhoneNumber,
  formatPhoneNumber,
  smsTemplates,
} from "../services/smsNotifications";

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

export const smsRouter = router({
  /**
   * Send a test SMS
   */
  sendTest: adminProcedure
    .input(
      z.object({
        to: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!validatePhoneNumber(input.to)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid phone number format",
        });
      }

      const result = await sendSMS({
        to: input.to,
        body: input.message,
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error || "Failed to send SMS",
        });
      }

      return result;
    }),

  /**
   * Validate phone number
   */
  validatePhone: adminProcedure
    .input(
      z.object({
        phone: z.string(),
      })
    )
    .query(({ input }) => {
      const isValid = validatePhoneNumber(input.phone);
      const formatted = isValid ? formatPhoneNumber(input.phone) : null;

      return {
        isValid,
        formatted,
      };
    }),

  /**
   * Get SMS configuration status
   */
  getConfig: adminProcedure.query(() => {
    const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
    const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;
    const enabled = process.env.SMS_NOTIFICATIONS_ENABLED === "true";

    return {
      configured: hasAccountSid && hasAuthToken && hasPhoneNumber,
      enabled,
      fromNumber: hasPhoneNumber ? process.env.TWILIO_PHONE_NUMBER : null,
      missingCredentials: [
        !hasAccountSid && "TWILIO_ACCOUNT_SID",
        !hasAuthToken && "TWILIO_AUTH_TOKEN",
        !hasPhoneNumber && "TWILIO_PHONE_NUMBER",
      ].filter(Boolean),
    };
  }),

  /**
   * Get available SMS templates
   */
  getTemplates: adminProcedure.query(() => {
    return Object.keys(smsTemplates).map(key => ({
      id: key,
      name: key.replace(/([A-Z])/g, " $1").trim(),
    }));
  }),
});
