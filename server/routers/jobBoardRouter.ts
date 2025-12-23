import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { publicJobListings, publicApplications, jobBoardSettings, jobs } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export const jobBoardRouter = router({
  /**
   * List all published jobs (public endpoint)
   */
  listPublishedJobs: publicProcedure.query(async () => {
    const listings = await db.getDb().query.publicJobListings.findMany({
      where: eq(publicJobListings.isPublished, 1),
      orderBy: [desc(publicJobListings.publishedAt)],
    });

    // Get full job details for each listing
    const jobsWithDetails = await Promise.all(
      listings.map(async (listing) => {
        const job = await db.getDb().query.jobs.findFirst({
          where: eq(jobs.id, listing.jobId),
        });
        return {
          ...listing,
          job,
        };
      })
    );

    return jobsWithDetails;
  }),

  /**
   * Get job by slug (public endpoint)
   */
  getJobBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const listing = await db.getDb().query.publicJobListings.findFirst({
        where: and(
          eq(publicJobListings.slug, input.slug),
          eq(publicJobListings.isPublished, 1)
        ),
      });

      if (!listing) return null;

      // Increment view count
      await db.getDb()
        .update(publicJobListings)
        .set({ views: (listing.views || 0) + 1 })
        .where(eq(publicJobListings.id, listing.id));

      const job = await db.getDb().query.jobs.findFirst({
        where: eq(jobs.id, listing.jobId),
      });

      return {
        ...listing,
        job,
      };
    }),

  /**
   * Submit public application (public endpoint)
   */
  submitApplication: publicProcedure
    .input(
      z.object({
        jobId: z.number(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        resumeUrl: z.string().optional(),
        coverLetter: z.string().optional(),
        linkedinUrl: z.string().optional(),
        portfolioUrl: z.string().optional(),
        answers: z.record(z.string()).optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [application] = await db.getDb().insert(publicApplications).values({
        jobId: input.jobId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        resumeUrl: input.resumeUrl,
        coverLetter: input.coverLetter,
        linkedinUrl: input.linkedinUrl,
        portfolioUrl: input.portfolioUrl,
        answers: input.answers ? JSON.stringify(input.answers) : null,
        source: input.source,
        status: "new",
      });

      // Increment application count
      const listing = await db.getDb().query.publicJobListings.findFirst({
        where: eq(publicJobListings.jobId, input.jobId),
      });

      if (listing) {
        await db.getDb()
          .update(publicJobListings)
          .set({ applications: (listing.applications || 0) + 1 })
          .where(eq(publicJobListings.id, listing.id));
      }

      return { id: application.insertId };
    }),

  /**
   * Publish a job to the public board
   */
  publishJob: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        slug: z.string(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const [listing] = await db.getDb().insert(publicJobListings).values({
        jobId: input.jobId,
        slug: input.slug,
        isPublished: 1,
        publishedAt: new Date(),
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
      });

      return { id: listing.insertId };
    }),

  /**
   * Unpublish a job
   */
  unpublishJob: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      await db.getDb()
        .update(publicJobListings)
        .set({ isPublished: 0 })
        .where(eq(publicJobListings.jobId, input.jobId));

      return { success: true };
    }),

  /**
   * List all public applications
   */
  listApplications: protectedProcedure.query(async () => {
    const applications = await db.getDb().query.publicApplications.findMany({
      orderBy: [desc(publicApplications.submittedAt)],
    });

    return applications.map((app) => ({
      ...app,
      answers: app.answers ? JSON.parse(app.answers as string) : {},
    }));
  }),

  /**
   * Update application status
   */
  updateApplicationStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "reviewing", "shortlisted", "rejected", "hired"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.getDb()
        .update(publicApplications)
        .set({
          status: input.status,
          reviewedAt: new Date(),
          reviewedBy: ctx.user.id,
        })
        .where(eq(publicApplications.id, input.id));

      return { success: true };
    }),

  /**
   * Get job board settings
   */
  getSettings: publicProcedure.query(async () => {
    const settings = await db.getDb().query.jobBoardSettings.findFirst();
    
    if (!settings) {
      // Return default settings
      return {
        companyName: "Our Company",
        companyDescription: "Join our team!",
        primaryColor: "#667eea",
        enableApplications: 1,
        requireResume: 1,
        requireCoverLetter: 0,
      };
    }

    return {
      ...settings,
      customQuestions: settings.customQuestions ? JSON.parse(settings.customQuestions as string) : [],
    };
  }),

  /**
   * Update job board settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        companyName: z.string(),
        companyLogo: z.string().optional(),
        companyDescription: z.string().optional(),
        primaryColor: z.string(),
        customDomain: z.string().optional(),
        enableApplications: z.number(),
        requireResume: z.number(),
        requireCoverLetter: z.number(),
        customQuestions: z.array(z.object({
          question: z.string(),
          type: z.enum(["text", "textarea", "select"]),
          required: z.boolean(),
          options: z.array(z.string()).optional(),
        })).optional(),
        footerText: z.string().optional(),
        privacyPolicyUrl: z.string().optional(),
        termsOfServiceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check if settings exist
      const existing = await db.getDb().query.jobBoardSettings.findFirst();

      if (existing) {
        await db.getDb()
          .update(jobBoardSettings)
          .set({
            ...input,
            customQuestions: input.customQuestions ? JSON.stringify(input.customQuestions) : null,
          })
          .where(eq(jobBoardSettings.id, existing.id));
      } else {
        await db.getDb().insert(jobBoardSettings).values({
          ...input,
          customQuestions: input.customQuestions ? JSON.stringify(input.customQuestions) : null,
        });
      }

      return { success: true };
    }),

  /**
   * Get job board statistics
   */
  getStats: protectedProcedure.query(async () => {
    const listings = await db.getDb().query.publicJobListings.findMany();
    const applications = await db.getDb().query.publicApplications.findMany();

    const stats = {
      totalJobs: listings.length,
      publishedJobs: listings.filter((l) => l.isPublished === 1).length,
      totalViews: listings.reduce((sum, l) => sum + (l.views || 0), 0),
      totalApplications: applications.length,
      newApplications: applications.filter((a) => a.status === "new").length,
      shortlistedApplications: applications.filter((a) => a.status === "shortlisted").length,
    };

    return stats;
  }),
});
