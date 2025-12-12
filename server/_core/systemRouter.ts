import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Validate Twilio credentials
   */
  validateTwilioCredentials: adminProcedure.mutation(async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !phoneNumber) {
      return {
        valid: false,
        error: "Missing Twilio credentials. Please configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in Settings → Secrets.",
      };
    }

    // Basic format validation
    if (!accountSid.startsWith("AC") || accountSid.length !== 34) {
      return {
        valid: false,
        error: "Invalid TWILIO_ACCOUNT_SID format. Should start with 'AC' and be 34 characters long.",
      };
    }

    if (authToken.length !== 32) {
      return {
        valid: false,
        error: "Invalid TWILIO_AUTH_TOKEN format. Should be 32 characters long.",
      };
    }

    if (!phoneNumber.startsWith("+")) {
      return {
        valid: false,
        error: "Invalid TWILIO_PHONE_NUMBER format. Should start with '+' and include country code (e.g., +1234567890).",
      };
    }

    // TODO: Make actual API call to Twilio to validate credentials
    // For now, just validate format
    console.log("[Twilio] Credentials validated (format check only)", {
      accountSid: `${accountSid.substring(0, 10)}...`,
      phoneNumber,
    });

    return {
      valid: true,
      message: "Twilio credentials format is valid. Note: This is a format check only. Actual API validation requires Twilio SDK integration.",
    };
  }),
});
