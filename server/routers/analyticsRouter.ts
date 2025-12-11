import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as analytics from "../services/analytics";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const analyticsRouter = router({
  /**
   * Get platform-wide statistics
   */
  getPlatformStats: adminProcedure.query(async () => {
    return await analytics.getPlatformStatistics();
  }),

  /**
   * Get program completion trends
   */
  getCompletionTrends: adminProcedure
    .input(
      z.object({
        programId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const startDate = input.startDate ? new Date(input.startDate) : undefined;
      const endDate = input.endDate ? new Date(input.endDate) : undefined;

      return await analytics.getProgramCompletionTrends(
        input.programId,
        startDate,
        endDate
      );
    }),

  /**
   * Get time-to-completion metrics
   */
  getTimeToCompletion: adminProcedure.query(async () => {
    return await analytics.getTimeToCompletionMetrics();
  }),

  /**
   * Get bottleneck analysis
   */
  getBottlenecks: adminProcedure.query(async () => {
    return await analytics.getBottleneckAnalysis();
  }),

  /**
   * Get participant satisfaction metrics
   */
  getSatisfactionMetrics: adminProcedure.query(async () => {
    return await analytics.getParticipantSatisfactionMetrics();
  }),
});
