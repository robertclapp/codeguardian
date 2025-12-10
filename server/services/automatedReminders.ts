/**
 * Automated Reminder Service
 * 
 * Handles scheduled email reminders for:
 * - Missing documents
 * - Pending approvals
 * - Stage deadlines
 * 
 * Designed to be called by cron jobs or scheduled tasks
 */

import * as db from "../db";
import { sendMissingDocumentReminder, sendPendingApprovalReminder } from "./emailNotifications";

export interface ReminderSettings {
  enabled: boolean;
  frequency: "daily" | "weekly" | "biweekly";
  missingDocumentsEnabled: boolean;
  pendingApprovalsEnabled: boolean;
  stageDeadlinesEnabled: boolean;
  reminderThresholdDays: number; // Send reminder if document missing for X days
}

// Default settings
const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  frequency: "daily",
  missingDocumentsEnabled: true,
  pendingApprovalsEnabled: true,
  stageDeadlinesEnabled: true,
  reminderThresholdDays: 3,
};

/**
 * Send reminders for missing documents
 */
export async function sendMissingDocumentReminders(settings: ReminderSettings = DEFAULT_SETTINGS) {
  if (!settings.enabled || !settings.missingDocumentsEnabled) {
    console.log("[Reminders] Missing document reminders disabled");
    return { sent: 0, failed: 0 };
  }

  console.log("[Reminders] Starting missing document reminders...");

  try {
    // Get all active participants
    const allParticipants = await db.getAllParticipants();
    const activeParticipants = allParticipants.filter(p => p.status === "active");

    let sent = 0;
    let failed = 0;

    for (const participant of activeParticipants) {
      try {
        // Get candidate info
        const candidate = await db.getCandidateById(participant.candidateId);
        if (!candidate || !candidate.email) {
          console.log(`[Reminders] Skipping participant ${participant.id}: no email`);
          continue;
        }

        // Get program info
        const program = await db.getProgramById(participant.programId);
        if (!program) continue;

        // Get current stage
        const stages = await db.getStagesByProgramId(participant.programId);
        const currentStage = stages.find(s => s.id === participant.currentStageId);
        if (!currentStage) continue;

        // Get stage requirements
        const requirements = await db.getRequirementsByStageId(currentStage.id);
        const documentRequirements = requirements.filter(r => r.type === "document");

        // Get participant's documents
        const documents = await db.getDocumentsByCandidate(participant.candidateId);

        // Find missing documents
        const missingDocuments = documentRequirements.filter((req: any) => {
          return !documents.some(doc => doc.requirementId === req.id && doc.status === "approved");
        });

        if (missingDocuments.length === 0) {
          console.log(`[Reminders] No missing documents for participant ${participant.id}`);
          continue;
        }

        // Check if participant has been in stage long enough to warrant reminder
        const daysInStage = Math.floor(
          (Date.now() - new Date(participant.startedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysInStage < settings.reminderThresholdDays) {
          console.log(`[Reminders] Participant ${participant.id} only ${daysInStage} days in stage, skipping`);
          continue;
        }

        // Send reminder
        const success = await sendMissingDocumentReminder({
          participantName: candidate.name,
          participantEmail: candidate.email,
          programName: program.name,
          currentStage: currentStage.name,
          missingDocuments: missingDocuments.map((d: any) => d.name),
          daysInStage,
          uploadUrl: `${process.env.VITE_FRONTEND_URL || "https://yourapp.com"}/documents`,
          organizationName: process.env.VITE_APP_TITLE || "HR Platform",
        });

        if (success) {
          sent++;
          console.log(`[Reminders] Sent missing document reminder to ${candidate.email}`);
        } else {
          failed++;
          console.log(`[Reminders] Failed to send reminder to ${candidate.email}`);
        }
      } catch (error) {
        console.error(`[Reminders] Error processing participant ${participant.id}:`, error);
        failed++;
      }
    }

    console.log(`[Reminders] Missing document reminders complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error("[Reminders] Error in sendMissingDocumentReminders:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send reminders for pending document approvals
 */
export async function sendPendingApprovalReminders(settings: ReminderSettings = DEFAULT_SETTINGS) {
  if (!settings.enabled || !settings.pendingApprovalsEnabled) {
    console.log("[Reminders] Pending approval reminders disabled");
    return { sent: 0, failed: 0 };
  }

  console.log("[Reminders] Starting pending approval reminders...");

  try {
    // Get all pending documents grouped by staff
    const pendingDocuments = await db.getPendingDocuments();

    if (pendingDocuments.length === 0) {
      console.log("[Reminders] No pending documents found");
      return { sent: 0, failed: 0 };
    }

    // Group by uploaded by (staff member who needs to approve)
    // For now, send to all admin users
    const users = await db.getAllUsers();
    const adminUsers = users.filter((u: any) => u.role === "admin");

    let sent = 0;
    let failed = 0;

    for (const admin of adminUsers) {
      if (!admin.email) continue;

      try {
        // Get recent documents for this admin
        const recentDocuments = await Promise.all(
          pendingDocuments.slice(0, 5).map(async (doc) => {
            const candidate = await db.getCandidateById(doc.candidateId);
            return {
              name: doc.name,
              candidateName: candidate?.name || "Unknown",
              uploadedAt: doc.createdAt,
            };
          })
        );

        // Send reminder
        const success = await sendPendingApprovalReminder({
          staffName: admin.name || "Admin",
          staffEmail: admin.email,
          pendingCount: pendingDocuments.length,
          recentDocuments,
          approvalUrl: `${process.env.VITE_FRONTEND_URL || "https://yourapp.com"}/documents/approval`,
          organizationName: process.env.VITE_APP_TITLE || "HR Platform",
        });

        if (success) {
          sent++;
          console.log(`[Reminders] Sent pending approval reminder to ${admin.email}`);
        } else {
          failed++;
          console.log(`[Reminders] Failed to send reminder to ${admin.email}`);
        }
      } catch (error) {
        console.error(`[Reminders] Error processing admin ${admin.id}:`, error);
        failed++;
      }
    }

    console.log(`[Reminders] Pending approval reminders complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  } catch (error) {
    console.error("[Reminders] Error in sendPendingApprovalReminders:", error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send all daily reminders
 * This is the main function to be called by cron jobs
 */
export async function sendDailyReminders(settings: ReminderSettings = DEFAULT_SETTINGS) {
  console.log("[Reminders] Starting daily reminder job...");

  const results = {
    missingDocuments: { sent: 0, failed: 0 },
    pendingApprovals: { sent: 0, failed: 0 },
    totalSent: 0,
    totalFailed: 0,
  };

  // Send missing document reminders
  results.missingDocuments = await sendMissingDocumentReminders(settings);

  // Send pending approval reminders
  results.pendingApprovals = await sendPendingApprovalReminders(settings);

  // Calculate totals
  results.totalSent = results.missingDocuments.sent + results.pendingApprovals.sent;
  results.totalFailed = results.missingDocuments.failed + results.pendingApprovals.failed;

  console.log(`[Reminders] Daily reminder job complete: ${results.totalSent} sent, ${results.totalFailed} failed`);

  return results;
}

/**
 * Get reminder statistics for the last 30 days
 */
export async function getReminderStats() {
  // This would typically query a reminders log table
  // For now, return placeholder data
  return {
    last30Days: {
      totalSent: 0,
      missingDocumentsSent: 0,
      pendingApprovalsSent: 0,
      failedReminders: 0,
    },
    lastRun: null as Date | null,
    nextRun: null as Date | null,
  };
}
