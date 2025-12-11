/**
 * Analytics Service
 * 
 * Provides program analytics and metrics for data-driven decision making
 */

import * as db from "../db";

export interface ProgramCompletionTrend {
  date: string;
  completed: number;
  active: number;
  dropped: number;
}

export interface TimeToCompletionMetrics {
  programId: number;
  programName: string;
  averageDays: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  totalCompleted: number;
}

export interface BottleneckAnalysis {
  stageId: number;
  stageName: string;
  programId: number;
  programName: string;
  averageTimeInStage: number; // days
  participantsStuck: number; // participants spending > 2x average time
  completionRate: number; // percentage completing this stage
}

export interface ParticipantSatisfactionMetrics {
  programId: number;
  programName: string;
  totalParticipants: number;
  completionRate: number;
  averageProgressPercentage: number;
  onTimeCompletionRate: number; // completed within expected timeframe
}

/**
 * Get program completion trends over time
 */
export async function getProgramCompletionTrends(
  programId?: number,
  startDate?: Date,
  endDate?: Date
): Promise<ProgramCompletionTrend[]> {
  const participants = await db.getAllParticipants();
  
  // Filter by program if specified
  let filtered = programId
    ? participants.filter(p => p.programId === programId)
    : participants;

  // Group by date
  const trendsMap = new Map<string, ProgramCompletionTrend>();

  for (const participant of filtered) {
    const date = new Date(participant.startedAt).toISOString().split('T')[0];
    
    // Skip if outside date range
    if (startDate && new Date(date) < startDate) continue;
    if (endDate && new Date(date) > endDate) continue;

    if (!trendsMap.has(date)) {
      trendsMap.set(date, {
        date,
        completed: 0,
        active: 0,
        dropped: 0,
      });
    }

    const trend = trendsMap.get(date)!;
    if (participant.status === "completed") {
      trend.completed++;
    } else if (participant.status === "active") {
      trend.active++;
    } else if (participant.status === "withdrawn") {
      trend.dropped++;
    }
  }

  return Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate time-to-completion metrics for programs
 */
export async function getTimeToCompletionMetrics(): Promise<TimeToCompletionMetrics[]> {
  const programs = await db.getPrograms();
  const participants = await db.getAllParticipants();

  const metrics: TimeToCompletionMetrics[] = [];

  for (const program of programs) {
    const completedParticipants = participants.filter(
      p => p.programId === program.id && p.status === "completed"
    );

    if (completedParticipants.length === 0) {
      metrics.push({
        programId: program.id,
        programName: program.name,
        averageDays: 0,
        medianDays: 0,
        minDays: 0,
        maxDays: 0,
        totalCompleted: 0,
      });
      continue;
    }

    // Calculate days to completion for each participant
    const daysToCompletion = completedParticipants.map(p => {
      const start = new Date(p.startedAt).getTime();
      const end = new Date(p.updatedAt).getTime(); // Assuming updatedAt is completion date
      return Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }).sort((a, b) => a - b);

    const average = daysToCompletion.reduce((sum, days) => sum + days, 0) / daysToCompletion.length;
    const median = daysToCompletion[Math.floor(daysToCompletion.length / 2)];
    const min = daysToCompletion[0];
    const max = daysToCompletion[daysToCompletion.length - 1];

    metrics.push({
      programId: program.id,
      programName: program.name,
      averageDays: Math.round(average),
      medianDays: median,
      minDays: min,
      maxDays: max,
      totalCompleted: completedParticipants.length,
    });
  }

  return metrics;
}

/**
 * Identify bottlenecks in program stages
 */
export async function getBottleneckAnalysis(): Promise<BottleneckAnalysis[]> {
  const programs = await db.getPrograms();
  const participants = await db.getAllParticipants();
  const bottlenecks: BottleneckAnalysis[] = [];

  for (const program of programs) {
    const stages = await db.getStagesByProgramId(program.id);
    const programParticipants = participants.filter(p => p.programId === program.id);

    for (const stage of stages) {
      const participantsInStage = programParticipants.filter(p => p.currentStageId === stage.id);
      
      if (participantsInStage.length === 0) continue;

      // Calculate average time in this stage
      const timesInStage = participantsInStage.map(p => {
        const start = new Date(p.startedAt).getTime();
        const now = Date.now();
        return Math.floor((now - start) / (1000 * 60 * 60 * 24));
      });

      const averageTime = timesInStage.reduce((sum, days) => sum + days, 0) / timesInStage.length;

      // Count participants spending > 2x average time (stuck)
      const participantsStuck = timesInStage.filter(days => days > averageTime * 2).length;

      // Calculate completion rate (participants who moved past this stage)
      const totalStarted = programParticipants.filter(p => 
        p.currentStageId === stage.id || stages.findIndex(s => s.id === p.currentStageId) > stages.findIndex(s => s.id === stage.id)
      ).length;
      const completed = totalStarted - participantsInStage.length;
      const completionRate = totalStarted > 0 ? (completed / totalStarted) * 100 : 0;

      bottlenecks.push({
        stageId: stage.id,
        stageName: stage.name,
        programId: program.id,
        programName: program.name,
        averageTimeInStage: Math.round(averageTime),
        participantsStuck,
        completionRate: Math.round(completionRate),
      });
    }
  }

  // Sort by participants stuck (descending) to show biggest bottlenecks first
  return bottlenecks.sort((a, b) => b.participantsStuck - a.participantsStuck);
}

/**
 * Get participant satisfaction metrics
 */
export async function getParticipantSatisfactionMetrics(): Promise<ParticipantSatisfactionMetrics[]> {
  const programs = await db.getPrograms();
  const participants = await db.getAllParticipants();
  const metrics: ParticipantSatisfactionMetrics[] = [];

  for (const program of programs) {
    const programParticipants = participants.filter(p => p.programId === program.id);
    
    if (programParticipants.length === 0) {
      metrics.push({
        programId: program.id,
        programName: program.name,
        totalParticipants: 0,
        completionRate: 0,
        averageProgressPercentage: 0,
        onTimeCompletionRate: 0,
      });
      continue;
    }

    const completed = programParticipants.filter(p => p.status === "completed").length;
    const completionRate = (completed / programParticipants.length) * 100;

    // Calculate average progress (based on stage completion)
    const stages = await db.getStagesByProgramId(program.id);
    const totalStages = stages.length;
    const progressValues = await Promise.all(programParticipants.map(async (p) => {
      const currentStageIndex = stages.findIndex(s => s.id === p.currentStageId);
      return currentStageIndex >= 0 && totalStages > 0 ? (currentStageIndex / totalStages) * 100 : 0;
    }));
    const averageProgress = progressValues.reduce((sum, val) => sum + val, 0) / programParticipants.length;

    // Calculate on-time completion rate (assuming 90 days is expected timeframe)
    const expectedDays = 90;
    const onTimeCompletions = programParticipants.filter(p => {
      if (p.status !== "completed") return false;
      const start = new Date(p.startedAt).getTime();
      const end = new Date(p.updatedAt).getTime();
      const days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
      return days <= expectedDays;
    }).length;
    const onTimeRate = completed > 0 ? (onTimeCompletions / completed) * 100 : 0;

    metrics.push({
      programId: program.id,
      programName: program.name,
      totalParticipants: programParticipants.length,
      completionRate: Math.round(completionRate),
      averageProgressPercentage: Math.round(averageProgress),
      onTimeCompletionRate: Math.round(onTimeRate),
    });
  }

  return metrics;
}

/**
 * Get overall platform statistics
 */
export async function getPlatformStatistics() {
  const participants = await db.getAllParticipants();
  const programs = await db.getPrograms();
  // Active jobs count (would need getAllJobs function)
  const activeJobs = 0;

  const totalParticipants = participants.length;
  const activeParticipants = participants.filter(p => p.status === "active").length;
  const completedParticipants = participants.filter(p => p.status === "completed").length;
  const droppedParticipants = participants.filter(p => p.status === "withdrawn").length;

  const activePrograms = programs.filter(p => p.isActive === 1).length;

  return {
    totalParticipants,
    activeParticipants,
    completedParticipants,
    droppedParticipants,
    completionRate: totalParticipants > 0 ? Math.round((completedParticipants / totalParticipants) * 100) : 0,
    dropoutRate: totalParticipants > 0 ? Math.round((droppedParticipants / totalParticipants) * 100) : 0,
    activePrograms,
    activeJobs,
  };
}
