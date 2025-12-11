import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as perf from "../services/performanceMonitoring";

export const performanceRouter = router({
  /**
   * Get all performance statistics
   */
  getStats: protectedProcedure.query(async () => {
    return perf.getAllPerformanceStats();
  }),

  /**
   * Get metrics by type
   */
  getMetrics: protectedProcedure
    .input(
      z.object({
        type: z.enum(["api", "database", "job", "websocket"]),
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      return perf.getMetricsByType(input.type, input.limit);
    }),

  /**
   * Get slow database queries
   */
  getSlowQueries: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return perf.getSlowQueries(input.limit);
    }),

  /**
   * Get slow API calls
   */
  getSlowAPICalls: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input }) => {
      return perf.getSlowAPICalls(input.limit);
    }),

  /**
   * Get performance alerts
   */
  getAlerts: protectedProcedure.query(async () => {
    return perf.getPerformanceAlerts();
  }),
});
