import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { auditCreate } from "../_core/auditMiddleware";

/**
 * Employer Portal Router
 * Dedicated interface for employer users to post jobs and review candidates
 */

// Employer-only procedure
const employerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "employer" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Employer role required.",
    });
  }
  return next({ ctx });
});

export const employerPortalRouter = router({
  /**
   * Get employer dashboard stats
   */
  getStats: employerProcedure.query(async ({ ctx }) => {
    // Get all jobs for this employer
    const allJobs = await db.getAllJobs();
    const employerJobs = allJobs.filter((j) => j.createdBy === ctx.user.id);
    
    // Get candidates for employer's jobs
    const allCandidates = await db.getAllCandidates();
    const employerCandidates = allCandidates.filter((c) =>
      employerJobs.some((j) => j.id === c.jobId)
    );
    
    return {
      activeJobs: employerJobs.filter((j) => j.status === "open").length,
      totalCandidates: employerCandidates.length,
      newApplications: employerCandidates.filter(
        (c) => c.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length,
      placements: employerCandidates.filter((c) => (c as any).stage === "hired").length,
    };
  }),

  /**
   * Get employer's jobs
   */
  getMyJobs: employerProcedure.query(async ({ ctx }) => {
    const allJobs = await db.getAllJobs();
    return allJobs.filter((j) => j.createdBy === ctx.user.id);
  }),

  /**
   * Create job posting
   */
  createJob: employerProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        requirements: z.string(),
        location: z.string(),
        type: z.enum(["full_time", "part_time", "contract", "internship"]),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        benefits: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await db.createJob({
        ...input,
        status: "open",
        postedDate: new Date(),
        createdBy: ctx.user.id,
      } as any);
      
      auditCreate(ctx, "jobs", job.id, { action: "employer_job_created" });
      
      return job;
    }),

  /**
   * Update job posting
   */
  updateJob: employerProcedure
    .input(
      z.object({
        jobId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        requirements: z.string().optional(),
        location: z.string().optional(),
        type: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        status: z.enum(["open", "closed", "filled"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { jobId, ...updates } = input;
      
      // Verify ownership
      const job = await db.getJobById(jobId);
      if (!job || (job.createdBy !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to edit this job",
        });
      }
      
      await db.updateJob(jobId, updates);
      
      auditCreate(ctx, "jobs", jobId, { action: "employer_job_updated", updates });
      
      return { success: true };
    }),

  /**
   * Get matched candidates for a job
   */
  getMatchedCandidates: employerProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const job = await db.getJobById(input.jobId);
      if (!job || (job.createdBy !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to view candidates for this job",
        });
      }
      
      // Get all candidates for this job
      const candidates = await db.getCandidatesByJobId(input.jobId);
      
      // TODO: Add AI matching scores
      return candidates.map((c) => ({
        ...c,
        matchScore: 85, // Placeholder - integrate with AI scoring
      }));
    }),

  /**
   * Request candidate interview
   */
  requestInterview: employerProcedure
    .input(
      z.object({
        candidateId: z.number(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }
      
      // Verify the candidate applied to employer's job
      const job = candidate.jobId ? await db.getJobById(candidate.jobId) : null;
      if (!job || (job.createdBy !== ctx.user.id && ctx.user.role !== "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to contact this candidate",
        });
      }
      
      // TODO: Send interview request notification
      console.log(`[Employer Portal] Interview request for candidate ${input.candidateId}`);
      
      auditCreate(ctx, "candidates", input.candidateId, {
        action: "interview_requested",
        message: input.message,
      });
      
      return { success: true };
    }),

  /**
   * Provide placement feedback
   */
  submitFeedback: employerProcedure
    .input(
      z.object({
        candidateId: z.number(),
        rating: z.number().min(1).max(5),
        feedback: z.string(),
        wouldHireAgain: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidate not found",
        });
      }
      
      // Create note with feedback
      await db.createNote({
        candidateId: input.candidateId,
        content: `Employer Feedback (Rating: ${input.rating}/5)\n\n${input.feedback}\n\nWould hire again: ${input.wouldHireAgain ? "Yes" : "No"}`,
        createdBy: ctx.user.id,
      });
      
      auditCreate(ctx, "candidates", input.candidateId, {
        action: "employer_feedback_submitted",
        rating: input.rating,
      });
      
      return { success: true };
    }),
});
