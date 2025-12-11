import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { sendEmail } from "../services/productionEmail";

export const referenceChecksRouter = router({
  /**
   * Create reference check request
   */
  create: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        referenceName: z.string(),
        referenceEmail: z.string().email(),
        referencePhone: z.string().optional(),
        relationship: z.string().optional(),
        company: z.string().optional(),
        questionnaireId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get questionnaire
      const questionnaire = input.questionnaireId
        ? await db.getReferenceQuestionnaireById(input.questionnaireId)
        : await db.getDefaultReferenceQuestionnaire();

      if (!questionnaire) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No questionnaire found",
        });
      }

      // Create reference check
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 14); // 14 days to complete

      const checkId = await db.createReferenceCheck({
        candidateId: input.candidateId,
        referenceName: input.referenceName,
        referenceEmail: input.referenceEmail,
        referencePhone: input.referencePhone,
        relationship: input.relationship,
        company: input.company,
        status: "pending",
        questionnaireId: questionnaire.id,
        expiresAt,
        reminderCount: 0,
        createdBy: ctx.user.id,
      });

      return { success: true, checkId };
    }),

  /**
   * Send reference check email
   */
  sendEmail: protectedProcedure
    .input(
      z.object({
        checkId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const check = await db.getReferenceCheckById(input.checkId);
      
      if (!check) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reference check not found",
        });
      }

      const candidate = await db.getCandidateById(check.candidateId);
      const questionnaire = check.questionnaireId
        ? await db.getReferenceQuestionnaireById(check.questionnaireId)
        : null;

      // Generate reference check link
      const baseUrl = process.env.VITE_APP_URL || "https://your-domain.com";
      const referenceLink = `${baseUrl}/reference-check/${check.id}`;

      // Send email
      const emailSubject = `Reference Check Request for ${candidate?.name || "Candidate"}`;
      const emailBody = `
        <h2>Reference Check Request</h2>
        <p>Hello ${check.referenceName},</p>
        <p>You have been listed as a reference for <strong>${candidate?.name || "a candidate"}</strong>.</p>
        <p>We would greatly appreciate it if you could complete a brief reference check questionnaire.</p>
        <p><strong>Please complete the questionnaire by ${check.expiresAt?.toLocaleDateString()}</strong></p>
        <p><a href="${referenceLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Complete Reference Check</a></p>
        <p>If the button doesn't work, copy and paste this link into your browser:<br/>${referenceLink}</p>
        <p>Thank you for your time and assistance!</p>
        <p>Best regards,<br/>HR Team</p>
      `;

      try {
        await sendEmail({
          to: check.referenceEmail,
          subject: emailSubject,
          html: emailBody,
        });

        // Update status
        await db.updateReferenceCheck(check.id, {
          status: "sent",
          sentAt: new Date(),
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email",
        });
      }
    }),

  /**
   * Submit reference check response (public - no auth required)
   */
  submitResponse: publicProcedure
    .input(
      z.object({
        checkId: z.number(),
        responses: z.record(z.any()),
        overallRating: z.number().min(1).max(5),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const check = await db.getReferenceCheckById(input.checkId);
      
      if (!check) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reference check not found",
        });
      }

      if (check.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reference check has already been completed",
        });
      }

      if (check.expiresAt && new Date() > check.expiresAt) {
        await db.updateReferenceCheck(check.id, { status: "expired" });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This reference check has expired",
        });
      }

      // Save responses
      await db.updateReferenceCheck(check.id, {
        responses: JSON.stringify(input.responses),
        overallRating: input.overallRating,
        comments: input.comments,
        status: "completed",
        completedAt: new Date(),
      });

      return { success: true };
    }),

  /**
   * Get reference checks for a candidate
   */
  getByCandidate: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.getReferenceChecksByCandidateId(input.candidateId);
    }),

  /**
   * Get reference check by ID (public for reference form)
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const check = await db.getReferenceCheckById(input.id);
      
      if (!check) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Reference check not found",
        });
      }

      const questionnaire = check.questionnaireId
        ? await db.getReferenceQuestionnaireById(check.questionnaireId)
        : null;

      const candidate = await db.getCandidateById(check.candidateId);

      return {
        check,
        questionnaire,
        candidateName: candidate?.name,
      };
    }),

  /**
   * Send reminder for pending reference check
   */
  sendReminder: protectedProcedure
    .input(
      z.object({
        checkId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const check = await db.getReferenceCheckById(input.checkId);
      
      if (!check || check.status !== "sent") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot send reminder for this reference check",
        });
      }

      const candidate = await db.getCandidateById(check.candidateId);
      const baseUrl = process.env.VITE_APP_URL || "https://your-domain.com";
      const referenceLink = `${baseUrl}/reference-check/${check.id}`;

      const emailSubject = `Reminder: Reference Check Request for ${candidate?.name || "Candidate"}`;
      const emailBody = `
        <h2>Reminder: Reference Check Request</h2>
        <p>Hello ${check.referenceName},</p>
        <p>This is a friendly reminder that you have a pending reference check request for <strong>${candidate?.name || "a candidate"}</strong>.</p>
        <p><strong>Please complete the questionnaire by ${check.expiresAt?.toLocaleDateString()}</strong></p>
        <p><a href="${referenceLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Complete Reference Check</a></p>
        <p>Thank you for your time!</p>
        <p>Best regards,<br/>HR Team</p>
      `;

      try {
        await sendEmail({
          to: check.referenceEmail,
          subject: emailSubject,
          html: emailBody,
        });

        await db.updateReferenceCheck(check.id, {
          reminderCount: (check.reminderCount || 0) + 1,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send reminder",
        });
      }
    }),

  /**
   * Get pending reference checks
   */
  getPending: protectedProcedure.query(async () => {
    return await db.getPendingReferenceChecks();
  }),

  // ==================== Questionnaires ====================

  /**
   * Create questionnaire template
   */
  createQuestionnaire: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        questions: z.array(
          z.object({
            id: z.string(),
            question: z.string(),
            type: z.enum(["text", "rating", "yes-no", "multiple-choice"]),
            options: z.array(z.string()).optional(),
            required: z.boolean(),
          })
        ),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const questionnaireId = await db.createReferenceQuestionnaire({
        name: input.name,
        description: input.description,
        questions: JSON.stringify(input.questions),
        isDefault: input.isDefault ? 1 : 0,
        isActive: 1,
        createdBy: ctx.user.id,
      });

      return { success: true, questionnaireId };
    }),

  /**
   * Get all questionnaires
   */
  getAllQuestionnaires: protectedProcedure.query(async () => {
    return await db.getAllReferenceQuestionnaires();
  }),

  /**
   * Get default questionnaire
   */
  getDefaultQuestionnaire: protectedProcedure.query(async () => {
    return await db.getDefaultReferenceQuestionnaire();
  }),
});
