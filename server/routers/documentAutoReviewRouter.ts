import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { parseResume, validateDocument } from "../_core/documentReview";
import { auditCreate } from "../_core/auditMiddleware";

/**
 * Smart Document Auto-Review Router
 * AI-powered document parsing and validation
 */
export const documentAutoReviewRouter = router({
  /**
   * Parse resume and extract structured data
   */
  parseResume: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        resumeText: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Parse resume using AI
        const parseResult = await parseResume(input.resumeText);
        
        // Update candidate with parsed data
        await db.updateCandidate(input.candidateId, {
          resumeText: input.resumeText,
          // Store parsed skills as JSON string
          skills: JSON.stringify(parseResult.skills),
        } as any);
        
        // Audit log
        auditCreate(ctx, "candidates", input.candidateId, {
          action: "resume_parsed",
          confidence: parseResult.confidence,
        });
        
        return parseResult;
      } catch (error) {
        console.error("Resume parsing error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to parse resume",
        });
      }
    }),

  /**
   * Auto-review document
   */
  reviewDocument: protectedProcedure
    .input(
      z.object({
        documentId: z.number(),
        documentText: z.string(),
        requirements: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Get document
        const document = await db.getDocumentById(input.documentId);
        if (!document) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Document not found",
          });
        }
        
        // Validate using AI
        const validation = await validateDocument(
          document.type,
          input.documentText,
          input.requirements
        );
        
        // Auto-approve if confidence is high and validation passed
        if (validation.autoApprove && validation.confidence >= 0.8) {
          await db.updateDocumentStatus(
            input.documentId,
            "approved",
            ctx.user.id,
            `Auto-approved (AI confidence: ${(validation.confidence * 100).toFixed(0)}%)`
          );
          
          // Audit log
          auditCreate(ctx, "documents", input.documentId, {
            action: "auto_approved",
            confidence: validation.confidence,
            validation,
          });
        } else {
          // Flag for manual review
          await db.updateDocumentStatus(
            input.documentId,
            "pending",
            ctx.user.id,
            `Flagged for manual review. Issues: ${validation.issues.join(", ")}`
          );
          
          // Audit log
          auditCreate(ctx, "documents", input.documentId, {
            action: "flagged_for_review",
            confidence: validation.confidence,
            validation,
          });
        }
        
        return validation;
      } catch (error) {
        console.error("Document review error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to review document",
        });
      }
    }),

  /**
   * Get documents pending auto-review
   */
  getPendingReviews: protectedProcedure.query(async () => {
    const pendingDocs = await db.getPendingDocuments();
    return pendingDocs;
  }),

  /**
   * Batch auto-review all pending documents
   */
  batchReview: protectedProcedure.mutation(async ({ ctx }) => {
    const pendingDocs = await db.getPendingDocuments();
    const results = [];
    
    for (const doc of pendingDocs) {
      try {
        // For now, skip if no text content
        // In production, extract text from document URL
        if (!doc.url) continue;
        
        const validation = await validateDocument(doc.type, "");
        
        if (validation.autoApprove && validation.confidence >= 0.8) {
          await db.updateDocumentStatus(
            doc.id,
            "approved",
            ctx.user.id,
            `Auto-approved (AI confidence: ${(validation.confidence * 100).toFixed(0)}%)`
          );
          results.push({ documentId: doc.id, status: "approved" });
        } else {
          results.push({ documentId: doc.id, status: "flagged" });
        }
      } catch (error) {
        console.error(`Error reviewing document ${doc.id}:`, error);
        results.push({ documentId: doc.id, status: "error" });
      }
    }
    
    return {
      total: pendingDocs.length,
      results,
    };
  }),
});
