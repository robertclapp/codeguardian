import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as db from "../db";
import { SkillsAssessmentService } from "../_core/skillsAssessmentService";

// Initialize service (in production, load API keys from env)
const assessmentService = new SkillsAssessmentService({
  indeedApiKey: process.env.INDEED_API_KEY,
  criteriaApiKey: process.env.CRITERIA_API_KEY,
});

export const skillsAssessmentRouter = router({
  // Get all available assessments from all providers
  getAvailableAssessments: protectedProcedure.query(async () => {
    return await assessmentService.getAllAssessments();
  }),

  // Send assessment invitation to candidate
  sendInvitation: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        assessmentId: z.string(),
        assessmentTitle: z.string(),
        provider: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Get candidate details
      const candidate = await db.getCandidateById(input.candidateId);
      if (!candidate) {
        throw new Error("Candidate not found");
      }

      // Send invitation via provider
      const invitation = await assessmentService.sendInvitation(
        candidate.email,
        candidate.name,
        input.assessmentId,
        input.provider
      );

      // Store invitation in database
      const result = await db.createAssessmentInvitation({
        candidateId: input.candidateId,
        assessmentId: input.assessmentId,
        assessmentTitle: input.assessmentTitle,
        provider: input.provider,
        invitationLink: invitation.invitationLink,
        status: 'pending',
        expiresAt: invitation.expiresAt,
      });

      return {
        success: true,
        invitationId: result.id,
        invitationLink: invitation.invitationLink,
      };
    }),

  // Get candidate's assessment history
  getCandidateAssessments: protectedProcedure
    .input(z.object({ candidateId: z.number() }))
    .query(async ({ input }) => {
      return await db.getCandidateAssessments(input.candidateId);
    }),

  // Update assessment results (called when candidate completes assessment)
  updateAssessmentResults: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
        score: z.number().min(0).max(100),
        percentile: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateAssessmentResults(
        input.invitationId,
        input.score,
        input.percentile
      );

      return { success: true };
    }),

  // Get assessment statistics
  getAssessmentStats: protectedProcedure.query(async () => {
    const allAssessments = await db.getAllAssessmentInvitations();

    const total = allAssessments.length;
    const completed = allAssessments.filter((a) => a.status === 'completed').length;
    const pending = allAssessments.filter((a) => a.status === 'pending').length;
    const expired = allAssessments.filter((a) => a.status === 'expired').length;

    const completedAssessments = allAssessments.filter((a) => a.score !== null);
    const avgScore =
      completedAssessments.length > 0
        ? completedAssessments.reduce((sum, a) => sum + (a.score || 0), 0) /
          completedAssessments.length
        : 0;

    return {
      total,
      completed,
      pending,
      expired,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgScore: Math.round(avgScore),
    };
  }),
});
