import { describe, it, expect } from 'vitest';

describe('Progress Tracking Logic', () => {
  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', () => {
      const totalStages = 5;
      const currentStageOrder = 2;
      
      const progress = (currentStageOrder / totalStages) * 100;
      
      expect(progress).toBe(40);
    });

    it('should show 100% for completed participants', () => {
      const participantStatus = 'completed';
      const progress = participantStatus === 'completed' ? 100 : 0;
      
      expect(progress).toBe(100);
    });

    it('should calculate average progress across participants', () => {
      const progressValues = [25, 50, 75, 100];
      const avgProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
      
      expect(avgProgress).toBe(62.5);
    });

    it('should handle participants at different stages', () => {
      const participants = [
        { currentStage: 1, totalStages: 4 },
        { currentStage: 2, totalStages: 4 },
        { currentStage: 4, totalStages: 4 },
      ];
      
      const progressValues = participants.map(p => (p.currentStage / p.totalStages) * 100);
      const avgProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;
      
      // (25 + 50 + 100) / 3 = 58.33
      expect(avgProgress).toBeCloseTo(58.33, 1);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should identify stages with most participants', () => {
      const participants = [
        { currentStageId: 1 },
        { currentStageId: 2 },
        { currentStageId: 2 },
        { currentStageId: 2 },
        { currentStageId: 3 },
      ];
      
      const stageCount = participants.reduce((acc, p) => {
        acc[p.currentStageId] = (acc[p.currentStageId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      expect(stageCount[1]).toBe(1);
      expect(stageCount[2]).toBe(3); // Bottleneck
      expect(stageCount[3]).toBe(1);
    });

    it('should calculate average time per stage', () => {
      const stageRecords = [
        { enteredAt: new Date('2024-01-01'), completedAt: new Date('2024-01-08') }, // 7 days
        { enteredAt: new Date('2024-01-01'), completedAt: new Date('2024-01-15') }, // 14 days
        { enteredAt: new Date('2024-01-01'), completedAt: new Date('2024-01-11') }, // 10 days
      ];
      
      const totalDays = stageRecords.reduce((sum, record) => {
        const days = (record.completedAt.getTime() - record.enteredAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      
      const avgDays = totalDays / stageRecords.length;
      
      // (7 + 14 + 10) / 3 = 10.33 days
      expect(avgDays).toBeCloseTo(10.33, 1);
    });
  });

  describe('Stage Transitions', () => {
    it('should validate stage order progression', () => {
      const stages = [
        { id: 1, order: 1 },
        { id: 2, order: 2 },
        { id: 3, order: 3 },
      ];
      
      const currentStageOrder = 1;
      const nextStageOrder = 2;
      
      expect(nextStageOrder).toBeGreaterThan(currentStageOrder);
      expect(stages.find(s => s.order === nextStageOrder)).toBeTruthy();
    });

    it('should identify final stage completion', () => {
      const stages = [
        { id: 1, order: 1 },
        { id: 2, order: 2 },
        { id: 3, order: 3 },
      ];
      
      const currentStageOrder = 3;
      const maxStageOrder = Math.max(...stages.map(s => s.order));
      const isFinalStage = currentStageOrder === maxStageOrder;
      
      expect(isFinalStage).toBe(true);
    });
  });

  describe('Program Statistics', () => {
    it('should calculate completion rate', () => {
      const participants = [
        { status: 'completed' },
        { status: 'completed' },
        { status: 'active' },
        { status: 'active' },
        { status: 'active' },
      ];
      
      const completedCount = participants.filter(p => p.status === 'completed').length;
      const completionRate = (completedCount / participants.length) * 100;
      
      // 2 out of 5 = 40%
      expect(completionRate).toBe(40);
    });

    it('should count active participants', () => {
      const participants = [
        { status: 'active' },
        { status: 'active' },
        { status: 'completed' },
        { status: 'withdrawn' },
      ];
      
      const activeCount = participants.filter(p => p.status === 'active').length;
      expect(activeCount).toBe(2);
    });

    it('should calculate average completion time', () => {
      const completedParticipants = [
        { enrolledAt: new Date('2024-01-01'), completedAt: new Date('2024-02-01') }, // 31 days
        { enrolledAt: new Date('2024-01-01'), completedAt: new Date('2024-03-01') }, // 60 days
        { enrolledAt: new Date('2024-01-01'), completedAt: new Date('2024-02-15') }, // 45 days
      ];
      
      const totalDays = completedParticipants.reduce((sum, p) => {
        const days = (p.completedAt.getTime() - p.enrolledAt.getTime()) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      
      const avgDays = totalDays / completedParticipants.length;
      
      // (31 + 60 + 45) / 3 = 45.33 days
      expect(avgDays).toBeCloseTo(45.33, 1);
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter by status', () => {
      const participants = [
        { id: 1, status: 'active' },
        { id: 2, status: 'completed' },
        { id: 3, status: 'active' },
      ];
      
      const active = participants.filter(p => p.status === 'active');
      expect(active).toHaveLength(2);
      expect(active.map(p => p.id)).toEqual([1, 3]);
    });

    it('should filter by stage', () => {
      const participants = [
        { id: 1, currentStageId: 1 },
        { id: 2, currentStageId: 2 },
        { id: 3, currentStageId: 1 },
      ];
      
      const stage1 = participants.filter(p => p.currentStageId === 1);
      expect(stage1).toHaveLength(2);
    });

    it('should sort by enrollment date', () => {
      const participants = [
        { id: 1, enrolledAt: new Date('2024-03-01') },
        { id: 2, enrolledAt: new Date('2024-01-01') },
        { id: 3, enrolledAt: new Date('2024-02-01') },
      ];
      
      const sorted = [...participants].sort((a, b) => 
        a.enrolledAt.getTime() - b.enrolledAt.getTime()
      );
      
      expect(sorted[0].id).toBe(2); // Earliest
      expect(sorted[2].id).toBe(1); // Latest
    });

    it('should sort by progress percentage', () => {
      const participants = [
        { id: 1, currentStage: 1, totalStages: 4 }, // 25%
        { id: 2, currentStage: 3, totalStages: 4 }, // 75%
        { id: 3, currentStage: 2, totalStages: 4 }, // 50%
      ];
      
      const sorted = [...participants].sort((a, b) => {
        const progressA = (a.currentStage / a.totalStages) * 100;
        const progressB = (b.currentStage / b.totalStages) * 100;
        return progressB - progressA;
      });
      
      expect(sorted[0].id).toBe(2); // 75%
      expect(sorted[1].id).toBe(3); // 50%
      expect(sorted[2].id).toBe(1); // 25%
    });
  });
});
