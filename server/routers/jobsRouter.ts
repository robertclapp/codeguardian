import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * Job management router
 * Handles all job posting CRUD operations
 */
export const jobsRouter = router({
  /**
   * Create a new job posting
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().min(1, "Description is required"),
        requirements: z.string().optional(),
        location: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).default("full-time"),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        status: z.enum(["draft", "open", "closed", "archived"]).default("draft"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get or create company for user
      // For MVP, we'll auto-create a company based on user's email domain
      const userEmail = ctx.user.email || "";
      const domain = userEmail.split("@")[1] || "company.com";
      const companyName = domain.split(".")[0];

      // Check if user already has a company (simple approach: first job creates company)
      const existingJobs = await db.getJobsByCompany(1); // Simplified: all users share company ID 1 for MVP
      let companyId = 1;

      if (existingJobs.length === 0) {
        // Create company if this is the first job
        try {
          companyId = await db.createCompany({
            name: companyName.charAt(0).toUpperCase() + companyName.slice(1),
          });
        } catch (error) {
          // Company might already exist, use default
          companyId = 1;
        }
      }

      const jobId = await db.createJob({
        ...input,
        companyId,
        createdBy: ctx.user.id,
        postedAt: input.status === "open" ? new Date() : null,
      });

      return { id: jobId };
    }),

  /**
   * Get all jobs for the current user's company
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    // Simplified: get all jobs for company ID 1 (MVP approach)
    const jobs = await db.getJobsByCompany(1);
    return jobs;
  }),

  /**
   * Get a single job by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const job = await db.getJobById(input.id);
      
      if (!job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return job;
    }),

  /**
   * Update a job posting
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        requirements: z.string().optional(),
        location: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        salaryMin: z.number().optional(),
        salaryMax: z.number().optional(),
        status: z.enum(["draft", "open", "closed", "archived"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;

      // If status is changing to "open", set postedAt
      if (updates.status === "open") {
        await db.updateJob(id, { ...updates, postedAt: new Date() });
      } else if (updates.status === "closed") {
        await db.updateJob(id, { ...updates, closedAt: new Date() });
      } else {
        await db.updateJob(id, updates);
      }

      return { success: true };
    }),

  /**
   * Delete a job posting
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteJob(input.id);
      return { success: true };
    }),

  /**
   * Get job statistics
   */
  getStats: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ input }) => {
      const candidates = await db.getCandidatesByJob(input.jobId);
      
      const stats = {
        totalApplicants: candidates.length,
        byStage: {
          applied: candidates.filter(c => c.pipelineStage === "applied").length,
          screening: candidates.filter(c => c.pipelineStage === "screening").length,
          "phone-screen": candidates.filter(c => c.pipelineStage === "phone-screen").length,
          interview: candidates.filter(c => c.pipelineStage === "interview").length,
          technical: candidates.filter(c => c.pipelineStage === "technical").length,
          offer: candidates.filter(c => c.pipelineStage === "offer").length,
          hired: candidates.filter(c => c.pipelineStage === "hired").length,
          rejected: candidates.filter(c => c.pipelineStage === "rejected").length,
        },
        averageMatchScore: candidates.length > 0
          ? candidates.reduce((sum, c) => sum + (c.matchScore || 0), 0) / candidates.length
          : 0,
      };

      return stats;
    }),
});
