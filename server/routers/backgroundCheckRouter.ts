import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { BackgroundCheckService } from "../_core/backgroundCheckService";

// Initialize service (in production, load API keys from env)
const backgroundCheckService = new BackgroundCheckService({
  checkrApiKey: process.env.CHECKR_API_KEY,
  sterlingApiKey: process.env.STERLING_API_KEY,
});

export const backgroundCheckRouter = router({
  // Get all available background check packages
  getAvailablePackages: protectedProcedure.query(async () => {
    return await backgroundCheckService.getAllPackages();
  }),

  // Initiate background check for candidate
  initiateCheck: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        packageId: z.string(),
        packageName: z.string(),
        provider: z.string(),
        price: z.number(),
        consentGiven: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      if (!input.consentGiven) {
        throw new Error("Candidate consent is required");
      }

      // Initiate check with provider
      const result = await backgroundCheckService.initiateCheck({
        candidateId: input.candidateId,
        packageId: input.packageId,
        provider: input.provider,
        consentGiven: input.consentGiven,
        consentDate: new Date(),
      });

      // Store in database
      await db.createBackgroundCheck({
        candidateId: input.candidateId,
        checkId: result.id,
        packageId: input.packageId,
        packageName: input.packageName,
        provider: input.provider,
        status: 'pending',
        price: input.price,
        consentGiven: input.consentGiven,
        consentDate: new Date(),
      });

      return { success: true, checkId: result.id };
    }),

  // Get candidate's background check history
  getCandidateChecks: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCandidateBackgroundChecks(input.candidateId);
    }),

  // Get all background checks
  getAllChecks: protectedProcedure.query(async () => {
    return await db.getAllBackgroundChecks();
  }),

  // Get background check statistics
  getCheckStats: protectedProcedure.query(async () => {
    const allChecks = await db.getAllBackgroundChecks();

    const total = allChecks.length;
    const pending = allChecks.filter((c) => c.status === 'pending').length;
    const inProgress = allChecks.filter((c) => c.status === 'in_progress').length;
    const completed = allChecks.filter((c) => c.status === 'completed').length;

    const completedChecks = allChecks.filter((c) => c.result !== null);
    const clear = completedChecks.filter((c) => c.result === 'clear').length;
    const consider = completedChecks.filter((c) => c.result === 'consider').length;

    return {
      total,
      pending,
      inProgress,
      completed,
      clear,
      consider,
      clearRate: completedChecks.length > 0 ? Math.round((clear / completedChecks.length) * 100) : 0,
    };
  }),
});
