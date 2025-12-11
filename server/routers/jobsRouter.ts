import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { ErrorMessages } from "../errors";
import { requireAuthorization, requireModifyPermission, requireDeletePermission } from "../authorization";
import { sanitizeJobData, validateId } from "../validation";
import { auditCreate, auditUpdate, auditDelete } from "../_core/auditMiddleware";

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
        title: z.string().min(1, "Title is required").max(200),
        description: z.string().min(1, "Description is required"),
        requirements: z.string().optional(),
        location: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).default("full-time"),
        salaryMin: z.number().nonnegative().optional(),
        salaryMax: z.number().nonnegative().optional(),
        status: z.enum(["draft", "open", "closed", "archived"]).default("draft"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Sanitize input data
        const sanitized = sanitizeJobData({
          title: input.title,
          description: input.description,
          requirements: input.requirements,
          location: input.location,
        });

        // Validate salary range if both provided
        if (input.salaryMin !== undefined && input.salaryMax !== undefined) {
          if (input.salaryMin > input.salaryMax) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Minimum salary cannot be greater than maximum salary",
            });
          }
        }

        // Get or create company for user
        let companyId: number;
        try {
          const userCompany = await db.getCompanyByUserId(ctx.user.id);
          if (userCompany) {
            companyId = userCompany.id;
          } else {
            // Create company from user's organization
            const userEmail = ctx.user.email || "";
            const domain = userEmail.split("@")[1] || "organization.org";
            const companyName = domain.split(".")[0];
            
            companyId = await db.createCompany({
              name: companyName.charAt(0).toUpperCase() + companyName.slice(1),
              createdBy: ctx.user.id,
            });
          }
        } catch (error) {
          console.error("Company creation error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: ErrorMessages.SERVER.DATABASE_ERROR,
          });
        }

        const jobId = await db.createJob({
          ...input,
          ...sanitized,
          companyId,
          createdBy: ctx.user.id,
          postedAt: input.status === "open" ? new Date() : null,
        });

        // Audit log for job creation
        const createdJob = await db.getJobById(jobId);
        if (createdJob) {
          auditCreate(ctx, "jobs", jobId, createdJob);
        }

        return { id: jobId };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Job creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Get all jobs for the current user's company
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get user's company
      const userCompany = await db.getCompanyByUserId(ctx.user.id);
      if (!userCompany) {
        return [];
      }
      
      const jobs = await db.getJobsByCompany(userCompany.id);
      return jobs;
    } catch (error) {
      console.error("Job list error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: ErrorMessages.SERVER.DATABASE_ERROR,
      });
    }
  }),

  /**
   * Get a single job by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Job ID");
        
        const job = await db.getJobById(input.id);
        
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        // Verify user has access to this job
        requireAuthorization(ctx.user, job.createdBy, "job");

        return job;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Job retrieval error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Update a job posting
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        title: z.string().min(1).max(200).optional(),
        description: z.string().min(1).optional(),
        requirements: z.string().optional(),
        location: z.string().optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        salaryMin: z.number().nonnegative().optional(),
        salaryMax: z.number().nonnegative().optional(),
        status: z.enum(["draft", "open", "closed", "archived"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...updates } = input;
        validateId(id, "Job ID");

        // Check if job exists and user has permission
        const job = await db.getJobById(id);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireModifyPermission(ctx.user, job.createdBy, "job");

        // Sanitize text fields if provided
        const sanitized: Record<string, unknown> = {};
        if (updates.title) sanitized.title = sanitizeJobData({ title: updates.title, description: "" }).title;
        if (updates.description) sanitized.description = sanitizeJobData({ title: "", description: updates.description }).description;
        if (updates.requirements) sanitized.requirements = sanitizeJobData({ title: "", description: "", requirements: updates.requirements }).requirements;
        if (updates.location) sanitized.location = sanitizeJobData({ title: "", description: "", location: updates.location }).location;

        // Validate salary range if both provided
        if (updates.salaryMin !== undefined && updates.salaryMax !== undefined) {
          if (updates.salaryMin > updates.salaryMax) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Minimum salary cannot be greater than maximum salary",
            });
          }
        }

        const finalUpdates = { ...updates, ...sanitized };

        // If status is changing to "open", set postedAt
        if (updates.status === "open" && job.status !== "open") {
          await db.updateJob(id, { ...finalUpdates, postedAt: new Date() });
        } else if (updates.status === "closed" && job.status !== "closed") {
          await db.updateJob(id, { ...finalUpdates, closedAt: new Date() });
        } else {
          await db.updateJob(id, finalUpdates);
        }

        // Audit log for job update
        const updatedJob = await db.getJobById(id);
        if (updatedJob) {
          auditUpdate(ctx, "jobs", id, job, updatedJob);
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Job update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Delete a job posting
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Job ID");

        // Check if job exists and user has permission
        const job = await db.getJobById(input.id);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireDeletePermission(ctx.user, job.createdBy, "job");

        // Audit log for job deletion
        auditDelete(ctx, "jobs", input.id, job);

        await db.deleteJob(input.id);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Job deletion error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Get job statistics
   */
  getStats: protectedProcedure
    .input(z.object({ jobId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.jobId, "Job ID");

        // Check if job exists and user has permission
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireAuthorization(ctx.user, job.createdBy, "job");

        // Use optimized database query for stats
        const stats = await db.getJobStats(input.jobId);
        return stats;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Job stats error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),
});
