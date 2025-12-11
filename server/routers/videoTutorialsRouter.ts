import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

export const videoTutorialsRouter = router({
  /**
   * Get all video tutorials
   */
  getAll: publicProcedure.query(async () => {
    return await db.getAllVideoTutorials();
  }),

  /**
   * Get tutorials by category
   */
  getByCategory: publicProcedure
    .input(
      z.object({
        category: z.enum([
          "getting-started",
          "document-upload",
          "progress-tracking",
          "program-completion",
          "troubleshooting",
          "other",
        ]),
      })
    )
    .query(async ({ input }) => {
      return await db.getVideoTutorialsByCategory(input.category);
    }),

  /**
   * Get tutorial by ID
   */
  getById: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const tutorial = await db.getVideoTutorialById(input.id);
      if (!tutorial) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tutorial not found",
        });
      }
      return tutorial;
    }),

  /**
   * Create new tutorial (admin only)
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.enum([
          "getting-started",
          "document-upload",
          "progress-tracking",
          "program-completion",
          "troubleshooting",
          "other",
        ]),
        videoUrl: z.string().url(),
        thumbnailUrl: z.string().url().optional(),
        duration: z.number().optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tutorialId = await db.createVideoTutorial({
        ...input,
        createdBy: ctx.user.id,
        isActive: 1,
        viewCount: 0,
      });

      return { success: true, tutorialId };
    }),

  /**
   * Update tutorial
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z
          .enum([
            "getting-started",
            "document-upload",
            "progress-tracking",
            "program-completion",
            "troubleshooting",
            "other",
          ])
          .optional(),
        videoUrl: z.string().url().optional(),
        thumbnailUrl: z.string().url().optional(),
        duration: z.number().optional(),
        order: z.number().optional(),
        isActive: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      await db.updateVideoTutorial(id, updates);
      return { success: true };
    }),

  /**
   * Delete tutorial
   */
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.deleteVideoTutorial(input.id);
      return { success: true };
    }),

  /**
   * Track video view
   */
  trackView: publicProcedure
    .input(
      z.object({
        videoId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await db.incrementVideoViewCount(input.videoId);
      return { success: true };
    }),

  /**
   * Update video progress
   */
  updateProgress: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        watchedSeconds: z.number(),
        completed: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.createOrUpdateVideoProgress({
        userId: ctx.user.id,
        videoId: input.videoId,
        watchedSeconds: input.watchedSeconds,
        completed: input.completed ? 1 : 0,
      });

      return { success: true };
    }),

  /**
   * Get user's video progress
   */
  getMyProgress: protectedProcedure.query(async ({ ctx }) => {
    return await db.getVideoProgressByUser(ctx.user.id);
  }),
});
