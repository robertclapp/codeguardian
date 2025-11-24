import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

/**
 * Candidate management router
 * Handles candidate applications and pipeline management
 */
export const candidatesRouter = router({
  /**
   * Public endpoint for job applications
   * Allows candidates to apply without authentication
   */
  submitApplication: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        name: z.string().min(1, "Name is required"),
        email: z.string().email("Valid email is required"),
        phone: z.string().optional(),
        linkedinUrl: z.string().url().optional().or(z.literal("")),
        portfolioUrl: z.string().url().optional().or(z.literal("")),
        coverLetter: z.string().optional(),
        resumeData: z.string().optional(), // Base64 encoded resume file
        resumeFilename: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Verify job exists
      const job = await db.getJobById(input.jobId);
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      if (job.status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This job is not currently accepting applications",
        });
      }

      // Handle resume upload if provided
      let resumeUrl: string | undefined;
      if (input.resumeData && input.resumeFilename) {
        try {
          const buffer = Buffer.from(input.resumeData, "base64");
          const fileKey = `resumes/${input.jobId}/${Date.now()}-${input.resumeFilename}`;
          const { url } = await storagePut(fileKey, buffer, "application/pdf");
          resumeUrl = url;
        } catch (error) {
          console.error("Failed to upload resume:", error);
          // Continue without resume URL
        }
      }

      // Create candidate record
      const candidateId = await db.createCandidate({
        jobId: input.jobId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        linkedinUrl: input.linkedinUrl || null,
        portfolioUrl: input.portfolioUrl || null,
        coverLetter: input.coverLetter,
        resumeUrl,
        pipelineStage: "applied",
        source: "direct",
      });

      // Create activity log
      await db.createActivity({
        candidateId,
        userId: null, // System-generated
        activityType: "applied",
        description: `${input.name} applied for the position`,
      });

      return { 
        success: true, 
        candidateId,
        message: "Application submitted successfully!" 
      };
    }),

  /**
   * Get all candidates for a specific job
   */
  listByJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const candidates = await db.getCandidatesByJob(input.jobId);
      return candidates;
    }),

  /**
   * Get a single candidate's details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const candidate = await db.getCandidateById(input.id);
      
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }

      // Get associated notes and activities
      const notes = await db.getNotesByCandidate(input.id);
      const activities = await db.getActivitiesByCandidate(input.id);

      return {
        ...candidate,
        notes,
        activities,
      };
    }),

  /**
   * Update candidate pipeline stage
   */
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        stage: z.enum([
          "applied",
          "screening",
          "phone-screen",
          "interview",
          "technical",
          "offer",
          "hired",
          "rejected",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateById(input.id);
      
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }

      // Update candidate stage
      await db.updateCandidate(input.id, {
        pipelineStage: input.stage,
        lastActivityAt: new Date(),
      });

      // Create activity log
      await db.createActivity({
        candidateId: input.id,
        userId: ctx.user.id,
        activityType: "stage-changed",
        description: `Moved to ${input.stage.replace("-", " ")} stage`,
      });

      return { success: true };
    }),

  /**
   * Add a note to a candidate
   */
  addNote: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        content: z.string().min(1, "Note content is required"),
        isPrivate: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const noteId = await db.createNote({
        candidateId: input.candidateId,
        userId: ctx.user.id,
        content: input.content,
        isPrivate: input.isPrivate ? 1 : 0,
      });

      // Update candidate's last activity
      await db.updateCandidate(input.candidateId, {
        lastActivityAt: new Date(),
      });

      // Create activity log
      await db.createActivity({
        candidateId: input.candidateId,
        userId: ctx.user.id,
        activityType: "note-added",
        description: `Added a ${input.isPrivate ? "private" : "team"} note`,
      });

      return { noteId };
    }),

  /**
   * Get notes for a candidate
   */
  getNotes: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ ctx, input }) => {
      const notes = await db.getNotesByCandidate(input.candidateId, ctx.user.id);
      return notes;
    }),

  /**
   * Update candidate match score (typically called by AI service)
   */
  updateMatchScore: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        matchScore: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateCandidate(input.id, {
        matchScore: input.matchScore,
      });

      return { success: true };
    }),

  /**
   * Bulk update match scores for multiple candidates
   */
  bulkUpdateMatchScores: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          matchScore: z.number().min(0).max(100),
        })
      )
    )
    .mutation(async ({ input }) => {
      // Update each candidate's match score
      await Promise.all(
        input.map((item) =>
          db.updateCandidate(item.id, { matchScore: item.matchScore })
        )
      );

      return { success: true, updated: input.length };
    }),
});
