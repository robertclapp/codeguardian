import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Dashboard customization router
 * Handles saving and loading user's dashboard layout preferences
 */
export const dashboardRouter = router({
  /**
   * Get user's saved dashboard layout
   */
  getLayout: protectedProcedure.query(async ({ ctx }) => {
    const layout = await db.getDashboardLayout(ctx.user.id);
    return layout;
  }),

  /**
   * Save user's dashboard layout
   */
  saveLayout: protectedProcedure
    .input(
      z.object({
        layoutData: z.string(),
        widgetVisibility: z.string(),
        dateRangePreset: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.saveDashboardLayout({
        userId: ctx.user.id,
        layoutData: input.layoutData,
        widgetVisibility: input.widgetVisibility,
        dateRangePreset: input.dateRangePreset,
      });
      return { success: true };
    }),
});
