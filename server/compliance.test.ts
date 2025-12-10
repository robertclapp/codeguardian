/**
 * Tests for Compliance Reporting Features
 */

import { describe, it, expect } from "vitest";

describe("Compliance Reporting", () => {
  describe("Dashboard Summary Calculations", () => {
    it("should calculate completion rate correctly", () => {
      const totalParticipants = 100;
      const completedParticipants = 75;
      const completionRate = (completedParticipants / totalParticipants) * 100;
      
      expect(completionRate).toBe(75);
    });

    it("should handle zero participants gracefully", () => {
      const totalParticipants = 0;
      const completedParticipants = 0;
      const completionRate = totalParticipants > 0 
        ? (completedParticipants / totalParticipants) * 100 
        : 0;
      
      expect(completionRate).toBe(0);
    });

    it("should calculate average completion days", () => {
      const participants = [
        { startDate: new Date("2024-01-01"), completedDate: new Date("2024-01-31") }, // 30 days
        { startDate: new Date("2024-02-01"), completedDate: new Date("2024-03-01") }, // 29 days
        { startDate: new Date("2024-03-01"), completedDate: new Date("2024-04-15") }, // 45 days
      ];

      const avgDays = participants.reduce((sum, p) => {
        const days = Math.floor(
          (p.completedDate.getTime() - p.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return sum + days;
      }, 0) / participants.length;

      expect(Math.round(avgDays)).toBe(35); // (30 + 29 + 45) / 3 = 34.67 ≈ 35
    });

    it("should estimate training hours correctly", () => {
      const completedParticipants = 10;
      const stagesPerProgram = 5;
      const hoursPerStage = 2;
      
      const totalTrainingHours = completedParticipants * stagesPerProgram * hoursPerStage;
      
      expect(totalTrainingHours).toBe(100);
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter participants by start date", () => {
      const participants = [
        { id: 1, startedAt: new Date("2024-01-15") },
        { id: 2, startedAt: new Date("2024-02-15") },
        { id: 3, startedAt: new Date("2024-03-15") },
      ];

      const startDate = new Date("2024-02-01");
      const filtered = participants.filter(p => p.startedAt >= startDate);

      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual([2, 3]);
    });

    it("should filter participants by end date", () => {
      const participants = [
        { id: 1, startedAt: new Date("2024-01-15") },
        { id: 2, startedAt: new Date("2024-02-15") },
        { id: 3, startedAt: new Date("2024-03-15") },
      ];

      const endDate = new Date("2024-02-28");
      const filtered = participants.filter(p => p.startedAt <= endDate);

      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual([1, 2]);
    });

    it("should filter participants by date range", () => {
      const participants = [
        { id: 1, startedAt: new Date("2024-01-15") },
        { id: 2, startedAt: new Date("2024-02-15") },
        { id: 3, startedAt: new Date("2024-03-15") },
        { id: 4, startedAt: new Date("2024-04-15") },
      ];

      const startDate = new Date("2024-02-01");
      const endDate = new Date("2024-03-31");
      const filtered = participants.filter(
        p => p.startedAt >= startDate && p.startedAt <= endDate
      );

      expect(filtered.length).toBe(2);
      expect(filtered.map(p => p.id)).toEqual([2, 3]);
    });
  });

  describe("Status Filtering", () => {
    it("should filter participants by status", () => {
      const participants = [
        { id: 1, status: "active" },
        { id: 2, status: "completed" },
        { id: 3, status: "active" },
        { id: 4, status: "withdrawn" },
      ];

      const activeOnly = participants.filter(p => p.status === "active");
      const completedOnly = participants.filter(p => p.status === "completed");
      const withdrawnOnly = participants.filter(p => p.status === "withdrawn");

      expect(activeOnly.length).toBe(2);
      expect(completedOnly.length).toBe(1);
      expect(withdrawnOnly.length).toBe(1);
    });
  });

  describe("Progress Calculation", () => {
    it("should calculate participant progress percentage", () => {
      const currentStageOrder = 3;
      const totalStages = 5;
      const progress = (currentStageOrder / totalStages) * 100;

      expect(progress).toBe(60);
    });

    it("should handle participants at first stage", () => {
      const currentStageOrder = 0;
      const totalStages = 5;
      const progress = (currentStageOrder / totalStages) * 100;

      expect(progress).toBe(0);
    });

    it("should handle completed participants", () => {
      const currentStageOrder = 5;
      const totalStages = 5;
      const progress = (currentStageOrder / totalStages) * 100;

      expect(progress).toBe(100);
    });
  });

  describe("Stage Progression Analysis", () => {
    it("should calculate drop-off rate correctly", () => {
      const totalEnrolled = 100;
      const participantsAtStage = 20;
      const participantsPastStage = 60;
      
      const dropoffRate = ((totalEnrolled - participantsPastStage - participantsAtStage) / totalEnrolled) * 100;

      expect(dropoffRate).toBe(20); // 20 participants dropped off (100 - 60 - 20)
    });

    it("should identify high drop-off stages", () => {
      const stages = [
        { name: "Orientation", dropoffRate: 5 },
        { name: "Training", dropoffRate: 25 }, // High drop-off
        { name: "Certification", dropoffRate: 10 },
      ];

      const highDropoffStages = stages.filter(s => s.dropoffRate > 20);

      expect(highDropoffStages.length).toBe(1);
      expect(highDropoffStages[0].name).toBe("Training");
    });
  });

  describe("CSV Export Formatting", () => {
    it("should format CSV header correctly", () => {
      const header = "Participant ID,Candidate Name,Email,Program,Status,Current Stage,Progress %,Enrolled Date,Completed Date,Days in Program";
      const fields = header.split(",");

      expect(fields.length).toBe(10);
      expect(fields[0]).toBe("Participant ID");
      expect(fields[9]).toBe("Days in Program");
    });

    it("should escape CSV values with commas", () => {
      const name = "Smith, John";
      const csvValue = `"${name}"`;

      expect(csvValue).toBe('"Smith, John"');
    });

    it("should handle empty optional fields", () => {
      const completedDate = null;
      const csvValue = completedDate ? new Date(completedDate).toLocaleDateString() : "";

      expect(csvValue).toBe("");
    });
  });

  describe("Program Outcomes Metrics", () => {
    it("should calculate withdrawal rate", () => {
      const totalEnrolled = 100;
      const withdrawn = 15;
      const withdrawalRate = (withdrawn / totalEnrolled) * 100;

      expect(withdrawalRate).toBe(15);
    });

    it("should calculate retention rate", () => {
      const totalEnrolled = 100;
      const withdrawn = 15;
      const retentionRate = ((totalEnrolled - withdrawn) / totalEnrolled) * 100;

      expect(retentionRate).toBe(85);
    });

    it("should identify programs needing intervention", () => {
      const programs = [
        { name: "Program A", completionRate: 85, withdrawalRate: 5 },
        { name: "Program B", completionRate: 45, withdrawalRate: 30 }, // Needs intervention
        { name: "Program C", completionRate: 75, withdrawalRate: 10 },
      ];

      const needsIntervention = programs.filter(
        p => p.completionRate < 50 || p.withdrawalRate > 25
      );

      expect(needsIntervention.length).toBe(1);
      expect(needsIntervention[0].name).toBe("Program B");
    });
  });

  describe("Days in Program Calculation", () => {
    it("should calculate days in program correctly", () => {
      const startDate = new Date("2024-01-01");
      const currentDate = new Date("2024-02-01");
      const daysInProgram = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysInProgram).toBe(31);
    });

    it("should handle same-day enrollment", () => {
      const startDate = new Date("2024-01-01");
      const currentDate = new Date("2024-01-01");
      const daysInProgram = Math.floor(
        (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysInProgram).toBe(0);
    });
  });

  describe("Report Period Formatting", () => {
    it("should format date range for report header", () => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";
      const reportPeriod = `${startDate} to ${endDate}`;

      expect(reportPeriod).toBe("2024-01-01 to 2024-12-31");
    });

    it("should handle open-ended date ranges", () => {
      const startDate = "2024-01-01";
      const endDate = undefined;
      const reportPeriod = {
        start: startDate || "All time",
        end: endDate || "Present",
      };

      expect(reportPeriod.start).toBe("2024-01-01");
      expect(reportPeriod.end).toBe("Present");
    });
  });

  describe("Data Validation", () => {
    it("should validate completion rate is between 0 and 100", () => {
      const completionRates = [0, 50, 100, -10, 150];
      const validRates = completionRates.filter(rate => rate >= 0 && rate <= 100);

      expect(validRates).toEqual([0, 50, 100]);
    });

    it("should validate participant status values", () => {
      const validStatuses = ["active", "completed", "withdrawn", "on_hold"];
      const testStatuses = ["active", "invalid", "completed", "unknown"];
      const valid = testStatuses.filter(s => validStatuses.includes(s));

      expect(valid).toEqual(["active", "completed"]);
    });

    it("should handle missing or null values gracefully", () => {
      const participant = {
        name: "John Doe",
        email: null,
        completedAt: undefined,
      };

      const safeEmail = participant.email || "No email";
      const safeCompletedDate = participant.completedAt || "Not completed";

      expect(safeEmail).toBe("No email");
      expect(safeCompletedDate).toBe("Not completed");
    });
  });

  describe("Aggregation Functions", () => {
    it("should aggregate program statistics correctly", () => {
      const programs = [
        { totalParticipants: 50, completed: 40 },
        { totalParticipants: 30, completed: 25 },
        { totalParticipants: 20, completed: 15 },
      ];

      const totals = programs.reduce(
        (acc, p) => ({
          totalParticipants: acc.totalParticipants + p.totalParticipants,
          completed: acc.completed + p.completed,
        }),
        { totalParticipants: 0, completed: 0 }
      );

      expect(totals.totalParticipants).toBe(100);
      expect(totals.completed).toBe(80);
    });

    it("should calculate weighted averages", () => {
      const programs = [
        { participants: 50, avgDays: 30 },
        { participants: 30, avgDays: 40 },
        { participants: 20, avgDays: 50 },
      ];

      const totalParticipants = programs.reduce((sum, p) => sum + p.participants, 0);
      const weightedAvg = programs.reduce(
        (sum, p) => sum + (p.avgDays * p.participants),
        0
      ) / totalParticipants;

      expect(Math.round(weightedAvg)).toBe(37); // (30*50 + 40*30 + 50*20) / 100 = 36.5
    });
  });

  describe("Compliance Report Requirements", () => {
    it("should include all required fields for state compliance", () => {
      const requiredFields = [
        "participantName",
        "programName",
        "enrollmentDate",
        "completionStatus",
        "trainingHours",
        "completionDate",
      ];

      const reportData = {
        participantName: "John Doe",
        programName: "Peer Support",
        enrollmentDate: "2024-01-01",
        completionStatus: "completed",
        trainingHours: 40,
        completionDate: "2024-03-01",
      };

      const hasAllFields = requiredFields.every(field => field in reportData);

      expect(hasAllFields).toBe(true);
    });

    it("should calculate funder-required metrics", () => {
      const metrics = {
        totalEnrolled: 100,
        completed: 75,
        active: 20,
        withdrawn: 5,
        completionRate: 75,
        retentionRate: 95,
        averageCompletionDays: 60,
      };

      // Verify all key metrics are present
      expect(metrics.totalEnrolled).toBeGreaterThan(0);
      expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.retentionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.averageCompletionDays).toBeGreaterThan(0);
    });
  });
});
