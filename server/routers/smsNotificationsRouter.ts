import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  sendSMS,
  sendInterviewReminderSMS,
  sendDocumentApprovalSMS,
  sendStatusChangeSMS,
  getTwilioStatus,
} from "../_core/smsService";

export const smsNotificationsRouter = router({
  // Send generic SMS
  send: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendSMS({
        to: input.to,
        message: input.message,
      });
    }),

  // Send interview reminder
  sendInterviewReminder: protectedProcedure
    .input(
      z.object({
        candidateName: z.string(),
        candidatePhone: z.string(),
        interviewDate: z.date(),
        jobTitle: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendInterviewReminderSMS(
        input.candidateName,
        input.candidatePhone,
        input.interviewDate,
        input.jobTitle
      );
    }),

  // Send document approval notification
  sendDocumentApproval: protectedProcedure
    .input(
      z.object({
        candidateName: z.string(),
        candidatePhone: z.string(),
        documentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendDocumentApprovalSMS(
        input.candidateName,
        input.candidatePhone,
        input.documentType
      );
    }),

  // Send status change notification
  sendStatusChange: protectedProcedure
    .input(
      z.object({
        candidateName: z.string(),
        candidatePhone: z.string(),
        newStatus: z.string(),
        jobTitle: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await sendStatusChangeSMS(
        input.candidateName,
        input.candidatePhone,
        input.newStatus,
        input.jobTitle
      );
    }),

  // Get Twilio configuration status
  getStatus: protectedProcedure.query(() => {
    return getTwilioStatus();
  }),
});
