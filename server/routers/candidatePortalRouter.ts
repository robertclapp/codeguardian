import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { sendMagicLinkEmail } from "../_core/emailService";

/**
 * Candidate Self-Service Portal Router
 * Public-facing API for candidates to check status and upload documents
 */
export const candidatePortalRouter = router({
  /**
   * Request access link - sends magic link to candidate's email
   */
  requestAccess: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        jobId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Find candidate by email
      const candidates = await db.getAllCandidates();
      const candidate = candidates.find((c) => c.email === input.email);
      
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No application found with this email address",
        });
      }
      
      // Generate access token
      const token = await db.createCandidatePortalToken(candidate.id);
      
      // Send magic link email
      const emailResult = await sendMagicLinkEmail(
        input.email,
        token,
        candidate.name
      );
      
      if (!emailResult.success) {
        console.error(`[Candidate Portal] Failed to send email: ${emailResult.error}`);
      }
      
      return {
        success: true,
        message: "Access link sent to your email",
        // Remove this in production:
        devToken: token,
      };
    }),

  /**
   * Validate token and get candidate info
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const candidateId = await db.validateCandidatePortalToken(input.token);
      
      if (!candidateId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid or expired access token",
        });
      }
      
      const info = await db.getCandidatePortalInfo(candidateId);
      
      if (!info) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }
      
      return info;
    }),

  /**
   * Get candidate status by ID (requires valid session)
   */
  getStatus: publicProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ input }) => {
      const info = await db.getCandidatePortalInfo(input.candidateId);
      
      if (!info) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }
      
      return info;
    }),

  /**
   * Update candidate contact information
   */
  updateContact: publicProcedure
    .input(
      z.object({
        candidateId: z.number(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        address: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { candidateId, ...updates } = input;
      
      await db.updateCandidate(candidateId, updates);
      
      return { success: true };
    }),

  /**
   * Upload document
   */
  uploadDocument: publicProcedure
    .input(
      z.object({
        candidateId: z.number(),
        documentType: z.enum(["resume", "cover_letter", "id", "certification", "other"]),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Decode base64 file data
      const fileBuffer = Buffer.from(input.fileData, "base64");
      
      // Generate unique file key
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(7);
      const fileKey = `candidate-${input.candidateId}/documents/${input.documentType}-${timestamp}-${randomSuffix}`;
      
      // Upload to S3
      const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);
      
      // Create document record
      await db.createDocument({
        candidateId: input.candidateId,
        type: input.documentType,
        name: input.fileName,
        url,
        status: "pending",
        uploadedAt: new Date(),
      });
      
      return {
        success: true,
        url,
      };
    }),
});
