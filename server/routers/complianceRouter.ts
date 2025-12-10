/**
 * Compliance Reporting Router
 * 
 * Provides reporting endpoints for state compliance requirements and funder reporting.
 * Generates reports on participant completion rates, training hours, and program outcomes.
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const complianceRouter = router({
  /**
   * Get compliance dashboard summary
   */
  getDashboardSummary: protectedProcedure
    .input(
      z.object({
        programId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { programId, startDate, endDate } = input;

        // Get all programs or specific program
        const programs = programId
          ? [await db.getProgramById(programId)]
          : await db.getPrograms();

        if (programs.some(p => !p)) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Program not found",
          });
        }

        // Calculate summary statistics
        const summary = {
          totalParticipants: 0,
          activeParticipants: 0,
          completedParticipants: 0,
          averageCompletionDays: 0,
          completionRate: 0,
          totalTrainingHours: 0,
          programBreakdown: [] as any[],
        };

        for (const program of programs.filter(Boolean)) {
          const participants = await db.getParticipantsByProgramId(program!.id);
          const stages = await db.getStagesByProgramId(program!.id);

          // Filter by date range if provided
          let filteredParticipants = participants;
          if (startDate || endDate) {
            filteredParticipants = participants.filter(p => {
              const enrolledDate = new Date(p.startedAt);
              if (startDate && enrolledDate < new Date(startDate)) return false;
              if (endDate && enrolledDate > new Date(endDate)) return false;
              return true;
            });
          }

          const active = filteredParticipants.filter(p => p.status === "active").length;
          const completed = filteredParticipants.filter(p => p.status === "completed").length;
          const completionRate = filteredParticipants.length > 0
            ? (completed / filteredParticipants.length) * 100
            : 0;

          // Calculate average completion time
          const completedWithDates = filteredParticipants.filter(
            p => p.status === "completed" && p.completedAt
          );
          const avgDays = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, p) => {
                const days = Math.floor(
                  (new Date(p.completedAt!).getTime() - new Date(p.startedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }, 0) / completedWithDates.length
            : 0;

          // Estimate training hours (assuming 2 hours per stage)
          const trainingHours = completed * stages.length * 2;

          summary.totalParticipants += filteredParticipants.length;
          summary.activeParticipants += active;
          summary.completedParticipants += completed;
          summary.totalTrainingHours += trainingHours;

          summary.programBreakdown.push({
            programId: program!.id,
            programName: program!.name,
            totalParticipants: filteredParticipants.length,
            activeParticipants: active,
            completedParticipants: completed,
            completionRate: Math.round(completionRate * 10) / 10,
            averageCompletionDays: Math.round(avgDays),
            totalTrainingHours: trainingHours,
            stageCount: stages.length,
          });
        }

        // Calculate overall averages
        if (summary.programBreakdown.length > 0) {
          summary.averageCompletionDays = Math.round(
            summary.programBreakdown.reduce((sum, p) => sum + p.averageCompletionDays, 0) /
              summary.programBreakdown.length
          );
          summary.completionRate = summary.totalParticipants > 0
            ? Math.round((summary.completedParticipants / summary.totalParticipants) * 1000) / 10
            : 0;
        }

        return summary;
      } catch (error) {
        console.error("[Compliance] Error getting dashboard summary:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get compliance dashboard summary",
        });
      }
    }),

  /**
   * Get detailed participant report
   */
  getParticipantReport: protectedProcedure
    .input(
      z.object({
        programId: z.number().optional(),
        status: z.enum(["active", "completed", "withdrawn"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { programId, status, startDate, endDate } = input;

        // Get participants
        const allParticipants = programId
          ? await db.getParticipantsByProgramId(programId)
          : await db.getAllParticipants();

        // Filter by status and date range
        let filteredParticipants = allParticipants;
        
        if (status) {
          filteredParticipants = filteredParticipants.filter(p => p.status === status);
        }

        if (startDate || endDate) {
          filteredParticipants = filteredParticipants.filter(p => {
            const enrolledDate = new Date(p.startedAt);
            if (startDate && enrolledDate < new Date(startDate)) return false;
            if (endDate && enrolledDate > new Date(endDate)) return false;
            return true;
          });
        }

        // Get detailed information for each participant
        const participantDetails = await Promise.all(
          filteredParticipants.map(async (participant) => {
            const candidate = await db.getCandidateById(participant.candidateId);
            const program = await db.getProgramById(participant.programId);
            const stages = await db.getStagesByProgramId(participant.programId);
            const currentStage = stages.find(s => s.id === participant.currentStageId);

            // Calculate progress
            const stageOrder = currentStage?.order || 0;
            const progress = stages.length > 0 ? (stageOrder / stages.length) * 100 : 0;

            // Calculate days in program
            const daysInProgram = Math.floor(
              (new Date().getTime() - new Date(participant.startedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );

            // Calculate days in current stage
            const daysInStage = participant.currentStageId
              ? Math.floor(
                  (new Date().getTime() - new Date(participant.startedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;

            return {
              participantId: participant.id,
              candidateId: candidate?.id,
              candidateName: candidate?.name || "Unknown",
              candidateEmail: candidate?.email,
              programId: program?.id,
              programName: program?.name,
              status: participant.status,
              currentStage: currentStage?.name || "Not started",
              progress: Math.round(progress),
              enrolledAt: participant.startedAt,
              completedAt: participant.completedAt,
              daysInProgram,
              daysInStage,
              stageCount: stages.length,
              completedStages: stageOrder,
            };
          })
        );

        return participantDetails;
      } catch (error) {
        console.error("[Compliance] Error getting participant report:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get participant report",
        });
      }
    }),

  /**
   * Get program outcomes report
   */
  getProgramOutcomesReport: protectedProcedure
    .input(
      z.object({
        programId: z.number(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { programId, startDate, endDate } = input;

        const program = await db.getProgramById(programId);
        if (!program) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Program not found",
          });
        }

        const participants = await db.getParticipantsByProgramId(programId);
        const stages = await db.getStagesByProgramId(programId);

        // Filter by date range
        let filteredParticipants = participants;
        if (startDate || endDate) {
          filteredParticipants = participants.filter(p => {
            const enrolledDate = new Date(p.startedAt);
            if (startDate && enrolledDate < new Date(startDate)) return false;
            if (endDate && enrolledDate > new Date(endDate)) return false;
            return true;
          });
        }

        // Calculate outcomes
        const totalEnrolled = filteredParticipants.length;
        const completed = filteredParticipants.filter(p => p.status === "completed").length;
        const active = filteredParticipants.filter(p => p.status === "active").length;
        const withdrawn = filteredParticipants.filter(p => p.status === "withdrawn").length;

        // Calculate stage-by-stage progression
        const stageProgression = stages.map(stage => {
          const participantsAtStage = filteredParticipants.filter(
            p => p.currentStageId === stage.id
          ).length;
          const participantsPastStage = filteredParticipants.filter(p => {
            const currentStage = stages.find(s => s.id === p.currentStageId);
            return currentStage && currentStage.order > stage.order;
          }).length;

          return {
            stageId: stage.id,
            stageName: stage.name,
            stageOrder: stage.order,
            currentlyAtStage: participantsAtStage,
            completedStage: participantsPastStage + (stage.order === stages.length ? completed : 0),
            dropoffRate: totalEnrolled > 0
              ? Math.round(((totalEnrolled - participantsPastStage - participantsAtStage) / totalEnrolled) * 1000) / 10
              : 0,
          };
        });

        // Calculate completion metrics
        const completedWithDates = filteredParticipants.filter(
          p => p.status === "completed" && p.completedAt
        );
        const avgCompletionDays = completedWithDates.length > 0
          ? Math.round(
              completedWithDates.reduce((sum, p) => {
                const days = Math.floor(
                  (new Date(p.completedAt!).getTime() - new Date(p.startedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }, 0) / completedWithDates.length
            )
          : 0;

        return {
          programId: program.id,
          programName: program.name,
          reportPeriod: {
            startDate: startDate || "All time",
            endDate: endDate || "Present",
          },
          summary: {
            totalEnrolled,
            completed,
            active,
            withdrawn,
            completionRate: totalEnrolled > 0 ? Math.round((completed / totalEnrolled) * 1000) / 10 : 0,
            withdrawalRate: totalEnrolled > 0 ? Math.round((withdrawn / totalEnrolled) * 1000) / 10 : 0,
            averageCompletionDays: avgCompletionDays,
            totalStages: stages.length,
          },
          stageProgression,
        };
      } catch (error) {
        console.error("[Compliance] Error getting program outcomes:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get program outcomes report",
        });
      }
    }),

  /**
   * Export report as CSV
   */
  exportReportCSV: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["participants", "programs", "outcomes"]),
        programId: z.number().optional(),
        status: z.enum(["active", "completed", "withdrawn"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { reportType, programId, status, startDate, endDate } = input;

        let csvContent = "";

        if (reportType === "participants") {
          // Get participant report data
          const allParticipants = programId
            ? await db.getParticipantsByProgramId(programId)
            : await db.getAllParticipants();

          let filteredParticipants = allParticipants;
          if (status) {
            filteredParticipants = filteredParticipants.filter(p => p.status === status);
          }

          // CSV header
          csvContent = "Participant ID,Candidate Name,Email,Program,Status,Current Stage,Progress %,Enrolled Date,Completed Date,Days in Program\n";

          // CSV rows
          for (const participant of filteredParticipants) {
            const candidate = await db.getCandidateById(participant.candidateId);
            const program = await db.getProgramById(participant.programId);
            const stages = await db.getStagesByProgramId(participant.programId);
            const currentStage = stages.find(s => s.id === participant.currentStageId);

            const progress = currentStage && stages.length > 0
              ? Math.round((currentStage.order / stages.length) * 100)
              : 0;

            const daysInProgram = Math.floor(
              (new Date().getTime() - new Date(participant.startedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            );

            csvContent += `${participant.id},"${candidate?.name || "Unknown"}",${candidate?.email},${program?.name},${participant.status},${currentStage?.name || "Not started"},${progress},${new Date(participant.startedAt).toLocaleDateString()},${participant.completedAt ? new Date(participant.completedAt).toLocaleDateString() : ""},${daysInProgram}\n`;
          }
        }

        return {
          filename: `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`,
          content: csvContent,
          mimeType: "text/csv",
        };
      } catch (error) {
        console.error("[Compliance] Error exporting report:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to export report",
        });
      }
    }),
});
