import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

/**
 * Advanced Analytics Router
 * Cohort analysis, retention metrics, and program effectiveness tracking
 */

interface CohortData {
  cohortId: string;
  cohortName: string;
  startDate: Date;
  totalCandidates: number;
  completedCandidates: number;
  withdrawnCandidates: number;
  activeCandidates: number;
  avgCompletionTime: number; // in days
  successRate: number; // percentage
  placementRate: number; // percentage
}

interface RetentionMetrics {
  period: string;
  totalStarted: number;
  retained30Days: number;
  retained60Days: number;
  retained90Days: number;
  retentionRate30: number;
  retentionRate60: number;
  retentionRate90: number;
}

export const advancedAnalyticsRouter = router({
  /**
   * Get cohort analysis data
   */
  getCohortAnalysis: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        programId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const allProgress = await db.getAllParticipantProgress();
      const allCandidates = await db.getAllCandidates();
      
      // Group by month as cohorts
      const cohortMap = new Map<string, CohortData>();
      
      for (const progress of allProgress) {
        const cohortKey = new Date(progress.startedAt).toISOString().slice(0, 7); // YYYY-MM
        
        if (!cohortMap.has(cohortKey)) {
          cohortMap.set(cohortKey, {
            cohortId: cohortKey,
            cohortName: new Date(progress.startedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            }),
            startDate: new Date(progress.startedAt),
            totalCandidates: 0,
            completedCandidates: 0,
            withdrawnCandidates: 0,
            activeCandidates: 0,
            avgCompletionTime: 0,
            successRate: 0,
            placementRate: 0,
          });
        }
        
        const cohort = cohortMap.get(cohortKey)!;
        cohort.totalCandidates++;
        
        if (progress.status === "completed") {
          cohort.completedCandidates++;
          if (progress.completedAt) {
            const completionTime =
              (new Date(progress.completedAt).getTime() -
                new Date(progress.startedAt).getTime()) /
              (1000 * 60 * 60 * 24);
            cohort.avgCompletionTime += completionTime;
          }
        } else if (progress.status === "withdrawn") {
          cohort.withdrawnCandidates++;
        } else if (progress.status === "active") {
          cohort.activeCandidates++;
        }
      }
      
      // Calculate averages and rates
      const cohorts = Array.from(cohortMap.values()).map((cohort) => {
        if (cohort.completedCandidates > 0) {
          cohort.avgCompletionTime /= cohort.completedCandidates;
        }
        cohort.successRate =
          cohort.totalCandidates > 0
            ? (cohort.completedCandidates / cohort.totalCandidates) * 100
            : 0;
        
        // Calculate placement rate (candidates who got hired)
        const cohortCandidates = allCandidates.filter((c) => {
          const createdMonth = new Date(c.createdAt).toISOString().slice(0, 7);
          return createdMonth === cohort.cohortId;
        });
        const placedCandidates = cohortCandidates.filter(
          (c) => (c as any).stage === "hired"
        ).length;
        cohort.placementRate =
          cohortCandidates.length > 0
            ? (placedCandidates / cohortCandidates.length) * 100
            : 0;
        
        return cohort;
      });
      
      // Sort by date descending
      cohorts.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
      
      return cohorts;
    }),

  /**
   * Get retention metrics
   */
  getRetentionMetrics: protectedProcedure.query(async () => {
    const allProgress = await db.getAllParticipantProgress();
    const now = new Date();
    
    // Calculate retention for different time periods
    const periods = ["Last 3 Months", "Last 6 Months", "Last Year"];
    const retentionData: RetentionMetrics[] = [];
    
    for (const period of periods) {
      let monthsBack = 3;
      if (period === "Last 6 Months") monthsBack = 6;
      if (period === "Last Year") monthsBack = 12;
      
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
      
      const periodProgress = allProgress.filter(
        (p) => new Date(p.startedAt) >= cutoffDate
      );
      
      const totalStarted = periodProgress.length;
      
      // Calculate retention at 30, 60, 90 days
      let retained30 = 0;
      let retained60 = 0;
      let retained90 = 0;
      
      for (const progress of periodProgress) {
        const daysSinceStart =
          (now.getTime() - new Date(progress.startedAt).getTime()) /
          (1000 * 60 * 60 * 24);
        
        if (daysSinceStart >= 30) {
          if (progress.status === "active" || progress.status === "completed") {
            retained30++;
          }
        }
        
        if (daysSinceStart >= 60) {
          if (progress.status === "active" || progress.status === "completed") {
            retained60++;
          }
        }
        
        if (daysSinceStart >= 90) {
          if (progress.status === "active" || progress.status === "completed") {
            retained90++;
          }
        }
      }
      
      retentionData.push({
        period,
        totalStarted,
        retained30Days: retained30,
        retained60Days: retained60,
        retained90Days: retained90,
        retentionRate30: totalStarted > 0 ? (retained30 / totalStarted) * 100 : 0,
        retentionRate60: totalStarted > 0 ? (retained60 / totalStarted) * 100 : 0,
        retentionRate90: totalStarted > 0 ? (retained90 / totalStarted) * 100 : 0,
      });
    }
    
    return retentionData;
  }),

  /**
   * Get program effectiveness metrics
   */
  getProgramEffectiveness: protectedProcedure.query(async () => {
    const allPrograms = await db.getAllPrograms();
    const allProgress = await db.getAllParticipantProgress();
    const allCandidates = await db.getAllCandidates();
    
    const programMetrics = allPrograms.map((program) => {
      const programProgress = allProgress.filter(
        (p) => p.programId === program.id
      );
      
      const totalParticipants = programProgress.length;
      const completed = programProgress.filter((p) => p.status === "completed").length;
      const active = programProgress.filter((p) => p.status === "active").length;
      const withdrawn = programProgress.filter((p) => p.status === "withdrawn").length;
      
      // Calculate average completion time
      const completedProgress = programProgress.filter(
        (p) => p.status === "completed" && p.completedAt
      );
      let avgCompletionDays = 0;
      if (completedProgress.length > 0) {
        const totalDays = completedProgress.reduce((sum, p) => {
          const days =
            (new Date(p.completedAt!).getTime() -
              new Date(p.startedAt).getTime()) /
            (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgCompletionDays = totalDays / completedProgress.length;
      }
      
      // Calculate placement rate
      const programCandidates = allCandidates.filter((c) => c.programId === program.id);
      const placedCandidates = programCandidates.filter(
        (c) => (c as any).stage === "hired"
      ).length;
      const placementRate =
        programCandidates.length > 0
          ? (placedCandidates / programCandidates.length) * 100
          : 0;
      
      return {
        programId: program.id,
        programName: program.name,
        totalParticipants,
        activeParticipants: active,
        completedParticipants: completed,
        withdrawnParticipants: withdrawn,
        completionRate: totalParticipants > 0 ? (completed / totalParticipants) * 100 : 0,
        avgCompletionDays: Math.round(avgCompletionDays),
        placementRate,
      };
    });
    
    return programMetrics;
  }),

  /**
   * Get candidate success rate trends
   */
  getSuccessRateTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input }) => {
      const allCandidates = await db.getAllCandidates();
      const now = new Date();
      const trends = [];
      
      for (let i = input.months - 1; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = monthDate.toISOString().slice(0, 7);
        const monthName = monthDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        });
        
        const monthCandidates = allCandidates.filter((c) => {
          const candidateMonth = new Date(c.createdAt).toISOString().slice(0, 7);
          return candidateMonth === monthKey;
        });
        
        const totalCandidates = monthCandidates.length;
        const hiredCandidates = monthCandidates.filter(
          (c) => (c as any).stage === "hired"
        ).length;
        const successRate =
          totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0;
        
        trends.push({
          month: monthName,
          totalCandidates,
          hiredCandidates,
          successRate,
        });
      }
      
      return trends;
    }),
});
