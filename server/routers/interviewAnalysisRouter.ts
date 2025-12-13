import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { processInterview, analyzeInterviewTranscription } from "../services/interviewAnalysis";
import { db } from "../db";
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
      // Convert base64 to buffer
      const videoBuffer = Buffer.from(input.videoBase64, "base64");

      // Process the interview
      const result = await processInterview(
        videoBuffer,
        input.candidateId,
        input.interviewId
      );

      // Store results in database
      await db.insert(interviewRecordings).values({
        id: crypto.randomUUID(),
        candidateId: input.candidateId,
        interviewId: input.interviewId,
        videoUrl: result.videoUrl,
        transcription: result.transcription,
        sentiment: result.sentiment,
        keyMoments: JSON.stringify(result.keyMoments),
        score: result.score,
        strengths: JSON.stringify(result.strengths),
        concerns: JSON.stringify(result.concerns),
        processingTime: result.processingTime,
        createdAt: new Date(),
      });

      return result;
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
      const result = await analyzeInterviewTranscription(input.transcription);
      return result;
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
