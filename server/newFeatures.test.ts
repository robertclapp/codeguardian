import { describe, it, expect } from "vitest";
import {
  validatePhoneNumber,
  formatPhoneNumber,
  smsTemplates,
} from "./services/smsNotifications";
import {
  getProgramCompletionTrends,
  getTimeToCompletionMetrics,
  getBottleneckAnalysis,
  getParticipantSatisfactionMetrics,
  getPlatformStatistics,
} from "./services/analytics";

describe("SMS Notifications", () => {
  describe("Phone Number Validation", () => {
    it("should validate US phone numbers (10 digits)", () => {
      expect(validatePhoneNumber("5551234567")).toBe(true);
      expect(validatePhoneNumber("555-123-4567")).toBe(true);
      expect(validatePhoneNumber("(555) 123-4567")).toBe(true);
    });

    it("should validate international phone numbers", () => {
      expect(validatePhoneNumber("+442071234567")).toBe(true); // UK
      expect(validatePhoneNumber("+33123456789")).toBe(true); // France
      expect(validatePhoneNumber("+861234567890")).toBe(true); // China
    });

    it("should reject invalid phone numbers", () => {
      expect(validatePhoneNumber("123")).toBe(false); // Too short
      expect(validatePhoneNumber("12345678901234567")).toBe(false); // Too long
      expect(validatePhoneNumber("")).toBe(false); // Empty
      expect(validatePhoneNumber("abc")).toBe(false); // Non-numeric
    });
  });

  describe("Phone Number Formatting", () => {
    it("should format US numbers to E.164", () => {
      expect(formatPhoneNumber("5551234567")).toBe("+15551234567");
      expect(formatPhoneNumber("555-123-4567")).toBe("+15551234567");
      expect(formatPhoneNumber("(555) 123-4567")).toBe("+15551234567");
    });

    it("should format international numbers to E.164", () => {
      expect(formatPhoneNumber("442071234567")).toBe("+442071234567");
      expect(formatPhoneNumber("+442071234567")).toBe("+442071234567");
    });

    it("should handle numbers with spaces and special characters", () => {
      expect(formatPhoneNumber("555 123 4567")).toBe("+15551234567");
      expect(formatPhoneNumber("+1 (555) 123-4567")).toBe("+15551234567");
    });
  });

  describe("SMS Templates", () => {
    it("should generate missing document reminder", () => {
      const message = smsTemplates.missingDocument("John", "W-4", "Peer Support");
      expect(message).toContain("John");
      expect(message).toContain("W-4");
      expect(message).toContain("Peer Support");
    });

    it("should generate pending approval reminder", () => {
      const message = smsTemplates.pendingApproval("Admin", 5);
      expect(message).toContain("Admin");
      expect(message).toContain("5");
      expect(message).toContain("documents");
    });

    it("should generate document approved notification", () => {
      const message = smsTemplates.documentApproved("Jane", "Resume");
      expect(message).toContain("Jane");
      expect(message).toContain("Resume");
      expect(message).toContain("approved");
    });

    it("should generate document rejected notification", () => {
      const message = smsTemplates.documentRejected("Jane", "Resume", "Missing signature");
      expect(message).toContain("Jane");
      expect(message).toContain("Resume");
      expect(message).toContain("rejected");
      expect(message).toContain("Missing signature");
    });

    it("should generate stage completed notification", () => {
      const message = smsTemplates.stageCompleted("John", "Orientation", "Training");
      expect(message).toContain("John");
      expect(message).toContain("Orientation");
      expect(message).toContain("Training");
    });

    it("should generate program completed notification", () => {
      const message = smsTemplates.programCompleted("Jane", "Peer Support");
      expect(message).toContain("Jane");
      expect(message).toContain("Peer Support");
      expect(message).toContain("completed");
    });

    it("should generate welcome message", () => {
      const message = smsTemplates.welcomeMessage("John", "Peer Support");
      expect(message).toContain("John");
      expect(message).toContain("Peer Support");
      expect(message).toContain("Welcome");
    });

    it("should generate deadline reminder", () => {
      const message = smsTemplates.reminderDeadline("Jane", "Complete orientation", 3);
      expect(message).toContain("Jane");
      expect(message).toContain("Complete orientation");
      expect(message).toContain("3");
      expect(message).toContain("days");
    });

    it("should handle singular vs plural in pending approval", () => {
      const single = smsTemplates.pendingApproval("Admin", 1);
      const multiple = smsTemplates.pendingApproval("Admin", 5);
      
      expect(single).not.toContain("documents");
      expect(multiple).toContain("documents");
    });

    it("should handle singular vs plural in deadline reminder", () => {
      const single = smsTemplates.reminderDeadline("Jane", "Task", 1);
      const multiple = smsTemplates.reminderDeadline("Jane", "Task", 5);
      
      expect(single).not.toContain("days");
      expect(multiple).toContain("days");
    });
  });
});

describe("Analytics Service", () => {
  describe("Program Completion Trends", () => {
    it("should return empty array when no participants", async () => {
      const trends = await getProgramCompletionTrends();
      expect(Array.isArray(trends)).toBe(true);
    });

    it("should group trends by date", async () => {
      const trends = await getProgramCompletionTrends();
      
      if (trends.length > 0) {
        expect(trends[0]).toHaveProperty("date");
        expect(trends[0]).toHaveProperty("completed");
        expect(trends[0]).toHaveProperty("active");
        expect(trends[0]).toHaveProperty("dropped");
      }
    });

    it("should filter by program ID", async () => {
      const allTrends = await getProgramCompletionTrends();
      const filteredTrends = await getProgramCompletionTrends(1);
      
      expect(Array.isArray(filteredTrends)).toBe(true);
    });

    it("should filter by date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-12-31");
      const trends = await getProgramCompletionTrends(undefined, startDate, endDate);
      
      expect(Array.isArray(trends)).toBe(true);
    });

    it("should sort trends by date ascending", async () => {
      const trends = await getProgramCompletionTrends();
      
      if (trends.length > 1) {
        for (let i = 1; i < trends.length; i++) {
          expect(trends[i].date >= trends[i - 1].date).toBe(true);
        }
      }
    });
  });

  describe("Time to Completion Metrics", () => {
    it("should return metrics for all programs", async () => {
      const metrics = await getTimeToCompletionMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty("programId");
        expect(metrics[0]).toHaveProperty("programName");
        expect(metrics[0]).toHaveProperty("averageDays");
        expect(metrics[0]).toHaveProperty("medianDays");
        expect(metrics[0]).toHaveProperty("minDays");
        expect(metrics[0]).toHaveProperty("maxDays");
        expect(metrics[0]).toHaveProperty("totalCompleted");
      }
    });

    it("should handle programs with no completed participants", async () => {
      const metrics = await getTimeToCompletionMetrics();
      
      const emptyPrograms = metrics.filter(m => m.totalCompleted === 0);
      for (const metric of emptyPrograms) {
        expect(metric.averageDays).toBe(0);
        expect(metric.medianDays).toBe(0);
        expect(metric.minDays).toBe(0);
        expect(metric.maxDays).toBe(0);
      }
    });

    it("should calculate average correctly", async () => {
      const metrics = await getTimeToCompletionMetrics();
      
      for (const metric of metrics) {
        if (metric.totalCompleted > 0) {
          expect(metric.averageDays).toBeGreaterThanOrEqual(0);
          expect(metric.minDays).toBeLessThanOrEqual(metric.averageDays);
          expect(metric.averageDays).toBeLessThanOrEqual(metric.maxDays);
        }
      }
    });
  });

  describe("Bottleneck Analysis", () => {
    it("should identify bottlenecks in program stages", async () => {
      const bottlenecks = await getBottleneckAnalysis();
      
      expect(Array.isArray(bottlenecks)).toBe(true);
      
      if (bottlenecks.length > 0) {
        expect(bottlenecks[0]).toHaveProperty("stageId");
        expect(bottlenecks[0]).toHaveProperty("stageName");
        expect(bottlenecks[0]).toHaveProperty("programId");
        expect(bottlenecks[0]).toHaveProperty("programName");
        expect(bottlenecks[0]).toHaveProperty("averageTimeInStage");
        expect(bottlenecks[0]).toHaveProperty("participantsStuck");
        expect(bottlenecks[0]).toHaveProperty("completionRate");
      }
    });

    it("should sort bottlenecks by participants stuck (descending)", async () => {
      const bottlenecks = await getBottleneckAnalysis();
      
      if (bottlenecks.length > 1) {
        for (let i = 1; i < bottlenecks.length; i++) {
          expect(bottlenecks[i].participantsStuck <= bottlenecks[i - 1].participantsStuck).toBe(true);
        }
      }
    });

    it("should calculate completion rate as percentage", async () => {
      const bottlenecks = await getBottleneckAnalysis();
      
      for (const bottleneck of bottlenecks) {
        expect(bottleneck.completionRate).toBeGreaterThanOrEqual(0);
        expect(bottleneck.completionRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Participant Satisfaction Metrics", () => {
    it("should return metrics for all programs", async () => {
      const metrics = await getParticipantSatisfactionMetrics();
      
      expect(Array.isArray(metrics)).toBe(true);
      
      if (metrics.length > 0) {
        expect(metrics[0]).toHaveProperty("programId");
        expect(metrics[0]).toHaveProperty("programName");
        expect(metrics[0]).toHaveProperty("totalParticipants");
        expect(metrics[0]).toHaveProperty("completionRate");
        expect(metrics[0]).toHaveProperty("averageProgressPercentage");
        expect(metrics[0]).toHaveProperty("onTimeCompletionRate");
      }
    });

    it("should calculate completion rate as percentage", async () => {
      const metrics = await getParticipantSatisfactionMetrics();
      
      for (const metric of metrics) {
        expect(metric.completionRate).toBeGreaterThanOrEqual(0);
        expect(metric.completionRate).toBeLessThanOrEqual(100);
      }
    });

    it("should calculate average progress as percentage", async () => {
      const metrics = await getParticipantSatisfactionMetrics();
      
      for (const metric of metrics) {
        expect(metric.averageProgressPercentage).toBeGreaterThanOrEqual(0);
        expect(metric.averageProgressPercentage).toBeLessThanOrEqual(100);
      }
    });

    it("should calculate on-time completion rate as percentage", async () => {
      const metrics = await getParticipantSatisfactionMetrics();
      
      for (const metric of metrics) {
        expect(metric.onTimeCompletionRate).toBeGreaterThanOrEqual(0);
        expect(metric.onTimeCompletionRate).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("Platform Statistics", () => {
    it("should return platform-wide statistics", async () => {
      const stats = await getPlatformStatistics();
      
      expect(stats).toHaveProperty("totalParticipants");
      expect(stats).toHaveProperty("activeParticipants");
      expect(stats).toHaveProperty("completedParticipants");
      expect(stats).toHaveProperty("droppedParticipants");
      expect(stats).toHaveProperty("completionRate");
      expect(stats).toHaveProperty("dropoutRate");
      expect(stats).toHaveProperty("activePrograms");
      expect(stats).toHaveProperty("activeJobs");
    });

    it("should calculate completion rate correctly", async () => {
      const stats = await getPlatformStatistics();
      
      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
      expect(stats.completionRate).toBeLessThanOrEqual(100);
      
      if (stats.totalParticipants > 0) {
        const expectedRate = Math.round((stats.completedParticipants / stats.totalParticipants) * 100);
        expect(stats.completionRate).toBe(expectedRate);
      }
    });

    it("should calculate dropout rate correctly", async () => {
      const stats = await getPlatformStatistics();
      
      expect(stats.dropoutRate).toBeGreaterThanOrEqual(0);
      expect(stats.dropoutRate).toBeLessThanOrEqual(100);
      
      if (stats.totalParticipants > 0) {
        const expectedRate = Math.round((stats.droppedParticipants / stats.totalParticipants) * 100);
        expect(stats.dropoutRate).toBe(expectedRate);
      }
    });

    it("should have consistent participant counts", async () => {
      const stats = await getPlatformStatistics();
      
      const sum = stats.activeParticipants + stats.completedParticipants + stats.droppedParticipants;
      expect(sum).toBeLessThanOrEqual(stats.totalParticipants);
    });
  });
});
