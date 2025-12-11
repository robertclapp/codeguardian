import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { storagePut } from "../storage";
import { validateId, validateFileUpload, sanitizeHtml } from "../validation";
import { ErrorMessages, ErrorCodes } from "../errors";
import { canAccessResource } from "../authorization";
import { auditCreate, auditUpdate } from "../_core/auditMiddleware";

/**
 * Documents Router
 * Handles document upload, approval workflows, and tracking for pipeline stages
 */

export const documentsRouter = router({
  /**
   * Upload a document for a candidate/participant
   */
  upload: protectedProcedure
    .input(
      z.object({
        candidateId: z.number().positive(),
        requirementId: z.number().positive().optional(),
        fileName: z.string().min(1).max(255),
        fileData: z.string(), // Base64 encoded file data
        mimeType: z.string(),
        fileSize: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate file upload
      const fileValidation = validateFileUpload(input.fileSize, input.mimeType);
      if (!fileValidation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: fileValidation.error || "Invalid file upload",
        });
      }

      // Validate candidate exists
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.CANDIDATE,
        });
      }

      // Check authorization - user must own the job or be admin
      const job = await db.getJobById(candidate.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.JOB,
        });
      }

      if (!canAccessResource(ctx.user, job.createdBy)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ErrorMessages.AUTH.FORBIDDEN,
        });
      }

      // If requirementId is provided, validate it exists
      if (input.requirementId) {
        const requirement = await db.getStageRequirementById(input.requirementId);
        if (!requirement) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Stage requirement not found",
          });
        }
      }

      try {
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Generate unique file key
        const timestamp = Date.now();
        const sanitizedFileName = sanitizeHtml(input.fileName);
        const fileKey = `documents/${input.candidateId}/${timestamp}-${sanitizedFileName}`;

        // Upload to S3
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Save document record to database
        const document = await db.createDocument({
          candidateId: input.candidateId,
          requirementId: input.requirementId,
          name: sanitizedFileName,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
          fileSize: input.fileSize,
          status: "pending",
          uploadedBy: ctx.user.id,
        });
        
        const documentId = document.id;

        // Audit log for document creation
        auditCreate(ctx, "documents", documentId, document);

        return {
          success: true,
          documentId,
          fileUrl: url,
        };
      } catch (error) {
        console.error("[Documents] Upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload document",
        });
      }
    }),

  /**
   * List documents for a candidate
   */
  listByCandidate: protectedProcedure
    .input(
      z.object({
        candidateId: z.number().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      validateId(input.candidateId, "Candidate");

      // Validate candidate exists and check authorization
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.CANDIDATE,
        });
      }

      const job = await db.getJobById(candidate.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.JOB,
        });
      }

      if (!canAccessResource(ctx.user, job.createdBy)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ErrorMessages.AUTH.FORBIDDEN,
        });
      }

      const documents = await db.getDocumentsByCandidate(input.candidateId);
      return documents;
    }),

  /**
   * Approve a document
   */
  approve: protectedProcedure
    .input(
      z.object({
        documentId: z.number().positive(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      validateId(input.documentId, "Document");

      // Get document and validate ownership
      const document = await db.getDocumentById(input.documentId);
      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const candidate = await db.getCandidateById(document.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.CANDIDATE,
        });
      }

      const job = await db.getJobById(candidate.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.JOB,
        });
      }

      if (!canAccessResource(ctx.user, job.createdBy)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ErrorMessages.AUTH.FORBIDDEN,
        });
      }

      // Get before snapshot
      const beforeDoc = await db.getDocumentById(input.documentId);
      
      await db.updateDocumentStatus(input.documentId, "approved", ctx.user.id, input.notes);
      
      // Audit log for document approval
      const afterDoc = await db.getDocumentById(input.documentId);
      if (beforeDoc && afterDoc) {
        auditUpdate(ctx, "documents", input.documentId, beforeDoc, afterDoc);
      }

      // If document is linked to a requirement, mark requirement as complete
      if (document.requirementId) {
        // Find participant progress for this candidate
        // Note: This assumes candidate is also a participant in a program
        // You may need to adjust this logic based on your specific workflow
        await db.markRequirementComplete(document.candidateId, document.requirementId);
      }

      return { success: true };
    }),

  /**
   * Reject a document
   */
  reject: protectedProcedure
    .input(
      z.object({
        documentId: z.number().positive(),
        reason: z.string().min(1).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      validateId(input.documentId, "Document");

      // Get document and validate ownership
      const document = await db.getDocumentById(input.documentId);
      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const candidate = await db.getCandidateById(document.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.CANDIDATE,
        });
      }

      const job = await db.getJobById(candidate.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: ErrorMessages.NOT_FOUND.JOB,
        });
      }

      if (!canAccessResource(ctx.user, job.createdBy)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: ErrorMessages.AUTH.FORBIDDEN,
        });
      }

      const sanitizedReason = sanitizeHtml(input.reason);
      // Get before snapshot
      const beforeDoc = await db.getDocumentById(input.documentId);
      
      await db.updateDocumentStatus(input.documentId, "rejected", ctx.user.id, sanitizedReason);
      
      // Audit log for document rejection
      const afterDoc = await db.getDocumentById(input.documentId);
      if (beforeDoc && afterDoc) {
        auditUpdate(ctx, "documents", input.documentId, beforeDoc, afterDoc);
      }

      return { success: true };
    }),

  /**
   * Get pending documents for review
   */
  getPending: protectedProcedure.query(async ({ ctx }) => {
    // Get all pending documents for jobs owned by this user
    const documents = await db.getPendingDocumentsByUser(ctx.user.id);
    return documents;
  }),

  /**
   * Bulk approve documents
   */
  bulkApprove: protectedProcedure
    .input(
      z.object({
        documentIds: z.array(z.number().positive()).min(1).max(50),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];

      for (const documentId of input.documentIds) {
        try {
          // Get document and validate ownership
          const document = await db.getDocumentById(documentId);
          if (!document) {
            results.push({ documentId, success: false, error: "Document not found" });
            continue;
          }

          const candidate = await db.getCandidateById(document.candidateId);
          if (!candidate) {
            results.push({ documentId, success: false, error: "Candidate not found" });
            continue;
          }

          const job = await db.getJobById(candidate.jobId);
          if (!job) {
            results.push({ documentId, success: false, error: "Job not found" });
            continue;
          }

          if (!canAccessResource(ctx.user, job.createdBy)) {
            results.push({ documentId, success: false, error: "Unauthorized" });
            continue;
          }

          await db.updateDocumentStatus(documentId, "approved", ctx.user.id, input.notes);

          // Mark requirement complete if applicable
          if (document.requirementId) {
            await db.markRequirementComplete(document.candidateId, document.requirementId);
          }

          results.push({ documentId, success: true });
        } catch (error) {
          console.error(`[Documents] Bulk approve error for document ${documentId}:`, error);
          results.push({ documentId, success: false, error: "Internal error" });
        }
      }

      return { results };
    }),
});
