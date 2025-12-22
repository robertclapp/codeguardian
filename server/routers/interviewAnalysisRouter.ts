import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
// Temporarily disabled - need to fix import paths
// import { processInterview, analyzeInterviewTranscription } from "../services/interviewAnalysis";
import * as db from "../db";
import { interviewRecordings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const interviewAnalysisRouter = router({
  /**
   * Process uploaded interview video
   */
  processVideo: protectedProcedure
    .input(
      z.object({
        videoBase64: z.string(),
        candidateId: z.string(),
        interviewId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Temporarily disabled - need to fix service imports
      throw new Error("Interview processing temporarily unavailable");
    }),

  /**
   * Analyze existing transcription
   */
  analyzeTranscription: protectedProcedure
    .input(
      z.object({
        transcription: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Temporarily disabled - need to fix service imports
      throw new Error("Transcription analysis temporarily unavailable");
    }),

  /**
   * Get interview analysis by ID
   */
  getAnalysis: protectedProcedure
    .input(
      z.object({
        interviewId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const recording = await db.query.interviewRecordings.findFirst({
        where: eq(interviewRecordings.interviewId, input.interviewId),
      });

      if (!recording) {
        return null;
      }

      return {
        ...recording,
        keyMoments: JSON.parse(recording.keyMoments as string),
        strengths: JSON.parse(recording.strengths as string),
        concerns: JSON.parse(recording.concerns as string),
      };
    }),

  /**
   * List all interview recordings
   */
  listRecordings: protectedProcedure.query(async () => {
    const recordings = await db.query.interviewRecordings.findMany({
      orderBy: (interviewRecordings, { desc }) => [desc(interviewRecordings.createdAt)],
      limit: 50,
    });

    return recordings.map((recording) => ({
      ...recording,
      keyMoments: JSON.parse(recording.keyMoments as string),
      strengths: JSON.parse(recording.strengths as string),
      concerns: JSON.parse(recording.concerns as string),
    }));
  }),
});
