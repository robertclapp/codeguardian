import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getJobSchedulerStatus, getJobLogs } from "../services/jobScheduler";

export const jobSchedulerRouter = router({
  /**
   * Get job scheduler status and active jobs
   */
  getStatus: protectedProcedure.query(async () => {
    return getJobSchedulerStatus();
  }),

  /**
   * Get job execution logs
   */
  getLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(100),
      })
    )
    .query(async ({ input }) => {
      return getJobLogs(input.limit);
    }),
});
