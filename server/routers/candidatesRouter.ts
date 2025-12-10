import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { ErrorMessages } from "../errors";
import { requireAuthorization } from "../authorization";
import { 
  sanitizeCandidateApplication, 
  validateFileSize, 
  validateFileType, 
  ALLOWED_RESUME_TYPES, 
  MAX_FILE_SIZES,
  validateId 
} from "../validation";

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
      try {
        // Validate job ID
        validateId(input.jobId, "Job ID");

        // Verify job exists and is open
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        if (job.status !== "open") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ErrorMessages.BUSINESS.JOB_NOT_OPEN,
          });
        }

        // Sanitize application data
        const sanitized = sanitizeCandidateApplication({
          name: input.name,
          email: input.email,
          phone: input.phone,
          linkedinUrl: input.linkedinUrl,
          portfolioUrl: input.portfolioUrl,
          coverLetter: input.coverLetter,
        });

        // Handle resume upload if provided
        let resumeUrl: string | undefined;
        if (input.resumeData && input.resumeFilename) {
          try {
            const buffer = Buffer.from(input.resumeData, "base64");
            
            // Validate file size (5MB limit)
            if (!validateFileSize(buffer.length, MAX_FILE_SIZES.RESUME)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: ErrorMessages.BUSINESS.FILE_TOO_LARGE(`${MAX_FILE_SIZES.RESUME}MB`),
              });
            }

            // Validate file type
            const mimeType = "application/pdf"; // Assume PDF for now
            if (!validateFileType(mimeType, ALLOWED_RESUME_TYPES)) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: ErrorMessages.BUSINESS.UNSUPPORTED_FILE_TYPE(mimeType),
              });
            }

            // Generate secure file key with random suffix
            const randomSuffix = Math.random().toString(36).substring(7);
            const fileKey = `resumes/${input.jobId}/${Date.now()}-${randomSuffix}-${input.resumeFilename}`;
            const { url } = await storagePut(fileKey, buffer, mimeType);
            resumeUrl = url;
          } catch (error) {
            if (error instanceof TRPCError) throw error;
            console.error("Failed to upload resume:", error);
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: ErrorMessages.SERVER.FILE_UPLOAD_ERROR,
            });
          }
        }

        // Check for duplicate application (same email + job)
        const existingApplication = await db.getCandidateByEmailAndJob(
          sanitized.email,
          input.jobId
        );
        if (existingApplication) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ErrorMessages.BUSINESS.DUPLICATE_APPLICATION,
          });
        }

        // Create candidate record
        const candidateId = await db.createCandidate({
          jobId: input.jobId,
          ...sanitized,
          resumeUrl,
          pipelineStage: "applied",
          source: "direct",
        });

        // Create activity log
        await db.createActivity({
          candidateId,
          userId: null, // System-generated
          activityType: "applied",
          description: `${sanitized.name} applied for the position`,
        });

        return { 
          success: true, 
          candidateId,
          message: "Application submitted successfully!" 
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Application submission error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Get all candidates for a specific job
   */
  listByJob: protectedProcedure
    .input(z.object({ jobId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.jobId, "Job ID");

        // Verify user has access to this job
        const job = await db.getJobById(input.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireAuthorization(ctx.user, job.createdBy, "job");

        const candidates = await db.getCandidatesByJob(input.jobId);
        return candidates;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Candidate list error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Get a single candidate's details
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Candidate ID");

        const candidate = await db.getCandidateById(input.id);
        
        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.CANDIDATE,
          });
        }

        // Verify user has access to this candidate's job
        const job = await db.getJobById(candidate.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireAuthorization(ctx.user, job.createdBy, "candidate");

        // Get associated notes and activities
        const notes = await db.getNotesByCandidate(input.id, ctx.user.id);
        const activities = await db.getActivitiesByCandidate(input.id);

        return {
          ...candidate,
          notes,
          activities,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Candidate retrieval error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Update candidate pipeline stage
   */
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
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
      try {
        validateId(input.id, "Candidate ID");

        const candidate = await db.getCandidateById(input.id);
        
        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.CANDIDATE,
          });
        }

        // Verify user has access to this candidate's job
        const job = await db.getJobById(candidate.jobId);
        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        requireAuthorization(ctx.user, job.createdBy, "candidate");

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
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Stage update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Add a note to a candidate
   */
  addNote: protectedProcedure
    .input(
      z.object({
        candidateId: z.number().positive(),
        content: z.string().min(1, "Note content is required").max(5000),
        isPrivate: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.candidateId, "Candidate ID");

        // Verify candidate exists and user has access
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

        requireAuthorization(ctx.user, job.createdBy, "candidate");

        // Sanitize note content
        const sanitizedContent = input.content.trim();

        const noteId = await db.createNote({
          candidateId: input.candidateId,
          userId: ctx.user.id,
          content: sanitizedContent,
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
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Note creation error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Get notes for a candidate
   */
  getNotes: protectedProcedure
    .input(z.object({ candidateId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        validateId(input.candidateId, "Candidate ID");

        // Verify candidate exists and user has access
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

        requireAuthorization(ctx.user, job.createdBy, "candidate");

        const notes = await db.getNotesByCandidate(input.candidateId, ctx.user.id);
        return notes;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Notes retrieval error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Update candidate match score (typically called by AI service)
   */
  updateMatchScore: protectedProcedure
    .input(
      z.object({
        id: z.number().positive(),
        matchScore: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.id, "Candidate ID");

        // Verify candidate exists and user has access
        const candidate = await db.getCandidateById(input.id);
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

        requireAuthorization(ctx.user, job.createdBy, "candidate");

        await db.updateCandidate(input.id, {
          matchScore: input.matchScore,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Match score update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),

  /**
   * Bulk update match scores for multiple candidates
   */
  bulkUpdateMatchScores: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number().positive(),
          matchScore: z.number().min(0).max(100),
        })
      ).max(100) // Limit bulk operations to 100 items
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.length === 0) {
          return { success: true, updated: 0 };
        }

        // Verify all candidates exist and user has access
        const candidateIds = input.map(item => item.id);
        const candidates = await Promise.all(
          candidateIds.map(id => db.getCandidateById(id))
        );

        // Check for missing candidates
        const missingIds = candidateIds.filter((id, index) => !candidates[index]);
        if (missingIds.length > 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Candidates not found: ${missingIds.join(", ")}`,
          });
        }

        // Verify user has access to all candidates' jobs
        const jobIdsSet = new Set(candidates.map(c => c!.jobId));
        const jobIds = Array.from(jobIdsSet);
        const jobs = await Promise.all(
          jobIds.map(id => db.getJobById(id))
        );

        for (const job of jobs) {
          if (!job) continue;
          requireAuthorization(ctx.user, job.createdBy, "candidates");
        }

        // Update each candidate's match score
        await Promise.all(
          input.map((item) =>
            db.updateCandidate(item.id, { matchScore: item.matchScore })
          )
        );

        return { success: true, updated: input.length };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("Bulk match score update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: ErrorMessages.SERVER.DATABASE_ERROR,
        });
      }
    }),
});
