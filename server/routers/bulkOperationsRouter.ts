import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { sendEmail } from "../_core/emailService";
import { sendSMS } from "../_core/smsService";

export const bulkOperationsRouter = router({
  // Bulk update candidate status
  bulkUpdateCandidateStatus: protectedProcedure
    .input(
      z.object({
        candidateIds: z.array(z.number()),
        newStage: z.string(),
        sendNotification: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const candidateId of input.candidateIds) {
        try {
          const candidate = await db.getCandidateById(candidateId);
          if (!candidate) {
            results.failed++;
            results.errors.push(`Candidate ${candidateId} not found`);
            continue;
          }

          await db.updateCandidateStage(candidateId, input.newStage);

          // Send notification if requested
          if (input.sendNotification && candidate.email) {
            const job = candidate.jobId ? await db.getJobById(candidate.jobId) : null;
            const jobTitle = job?.title || "Position";

            await sendEmail({
              to: candidate.email,
              subject: `Application Status Update - ${jobTitle}`,
              html: `
                <h2>Application Status Update</h2>
                <p>Hi ${candidate.name},</p>
                <p>Your application status for <strong>${jobTitle}</strong> has been updated to: <strong>${input.newStage}</strong></p>
                <p>We'll be in touch with next steps soon.</p>
                <p>Best regards,<br>HR Team</p>
              `,
            });
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to update candidate ${candidateId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),

  // Bulk send emails
  bulkSendEmails: protectedProcedure
    .input(
      z.object({
        recipientType: z.enum(["candidates", "custom"]),
        candidateIds: z.array(z.number()).optional(),
        customEmails: z.array(z.string()).optional(),
        subject: z.string(),
        htmlContent: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      let recipients: string[] = [];

      if (input.recipientType === "candidates" && input.candidateIds) {
        for (const candidateId of input.candidateIds) {
          const candidate = await db.getCandidateById(candidateId);
          if (candidate?.email) {
            recipients.push(candidate.email);
          }
        }
      } else if (input.recipientType === "custom" && input.customEmails) {
        recipients = input.customEmails;
      }

      for (const email of recipients) {
        try {
          await sendEmail({
            to: email,
            subject: input.subject,
            html: input.htmlContent,
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to send to ${email}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),

  // Bulk send SMS
  bulkSendSMS: protectedProcedure
    .input(
      z.object({
        candidateIds: z.array(z.number()),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const candidateId of input.candidateIds) {
        try {
          const candidate = await db.getCandidateById(candidateId);
          if (!candidate) {
            results.failed++;
            results.errors.push(`Candidate ${candidateId} not found`);
            continue;
          }

          if (!candidate.phone) {
            results.failed++;
            results.errors.push(`Candidate ${candidateId} has no phone number`);
            continue;
          }

          const smsResult = await sendSMS({
            to: candidate.phone,
            message: input.message,
          });

          if (smsResult.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(
              `Failed to send SMS to ${candidate.phone}: ${smsResult.error}`
            );
          }
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to process candidate ${candidateId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),

  // Bulk approve documents
  bulkApproveDocuments: protectedProcedure
    .input(
      z.object({
        documentIds: z.array(z.number()),
        sendNotification: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const documentId of input.documentIds) {
        try {
          const document = await db.getDocumentById(documentId);
          if (!document) {
            results.failed++;
            results.errors.push(`Document ${documentId} not found`);
            continue;
          }

          await db.updateDocumentStatus(documentId, "approved");

          // Send notification if requested
          if (input.sendNotification && document.candidateId) {
            const candidate = await db.getCandidateById(document.candidateId);
            if (candidate?.email) {
              await sendEmail({
                to: candidate.email,
                subject: "Document Approved",
                html: `
                  <h2>Document Approved</h2>
                  <p>Hi ${candidate.name},</p>
                  <p>Your document <strong>${document.name}</strong> has been approved.</p>
                  <p>You can view your application status in the candidate portal.</p>
                  <p>Best regards,<br>HR Team</p>
                `,
              });
            }
          }

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to approve document ${documentId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),

  // Bulk export candidates
  bulkExportCandidates: protectedProcedure
    .input(
      z.object({
        candidateIds: z.array(z.number()).optional(),
        filters: z
          .object({
            stage: z.string().optional(),
            jobId: z.number().optional(),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      let candidates;

      if (input.candidateIds && input.candidateIds.length > 0) {
        candidates = await Promise.all(
          input.candidateIds.map((id) => db.getCandidateById(id))
        );
        candidates = candidates.filter((c) => c !== null);
      } else {
        candidates = await db.getAllCandidates();

        // Apply filters
        if (input.filters?.stage) {
          candidates = candidates.filter((c) => (c as any).stage === input.filters?.stage);
        }
        if (input.filters?.jobId) {
          candidates = candidates.filter((c) => c.jobId === input.filters?.jobId);
        }
      }

      // Format for CSV export
      return candidates.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone || "",
        stage: (c as any).stage || "",
        appliedAt: c.createdAt,
      }));
    }),

  // Bulk close jobs
  bulkCloseJobs: protectedProcedure
    .input(
      z.object({
        jobIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input }) => {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const jobId of input.jobIds) {
        try {
          const job = await db.getJobById(jobId);
          if (!job) {
            results.failed++;
            results.errors.push(`Job ${jobId} not found`);
            continue;
          }

          await db.updateJobStatus(jobId, "closed");
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to close job ${jobId}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      return results;
    }),
});
