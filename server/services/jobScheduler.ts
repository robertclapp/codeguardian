import cron from "node-cron";
import { sendDailyReminders } from "./automatedReminders";
import * as db from "../db";
import { sendEmail } from "./productionEmail";
import { createDatabaseBackup } from "./backupAndExport";

interface JobLog {
  jobName: string;
  status: "success" | "error";
  message: string;
  timestamp: Date;
}

const jobLogs: JobLog[] = [];
const MAX_LOGS = 1000;

function logJob(jobName: string, status: "success" | "error", message: string) {
  jobLogs.unshift({
    jobName,
    status,
    message,
    timestamp: new Date(),
  });

  // Keep only last MAX_LOGS entries
  if (jobLogs.length > MAX_LOGS) {
    jobLogs.pop();
  }

  console.log(`[Job Scheduler] ${jobName} - ${status}: ${message}`);
}

export function getJobLogs(limit: number = 100) {
  return jobLogs.slice(0, limit);
}

/**
 * Daily reminder emails job
 * Runs every day at 9:00 AM
 */
export function startDailyReminderJob() {
  cron.schedule("0 9 * * *", async () => {
    try {
      console.log("[Job Scheduler] Starting daily reminder job...");
      
      const result = await sendDailyReminders();
      
      logJob(
        "Daily Reminders",
        "success",
        `Sent ${result.totalSent} notifications (${result.totalFailed} failed)`
      );
    } catch (error: any) {
      logJob("Daily Reminders", "error", error.message);
    }
  });

  console.log("[Job Scheduler] Daily reminder job scheduled (9:00 AM daily)");
}

/**
 * Process expired reference checks job
 * Runs every day at 2:00 AM
 */
export function startExpiredReferenceChecksJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[Job Scheduler] Starting expired reference checks job...");
      
      const pendingChecks = await db.getPendingReferenceChecks();
      let expiredCount = 0;

      for (const check of pendingChecks) {
        if (check.expiresAt && new Date() > check.expiresAt) {
          await db.updateReferenceCheck(check.id, { status: "expired" });
          expiredCount++;
        }
      }

      logJob(
        "Expired Reference Checks",
        "success",
        `Processed ${expiredCount} expired reference checks`
      );
    } catch (error: any) {
      logJob("Expired Reference Checks", "error", error.message);
    }
  });

  console.log("[Job Scheduler] Expired reference checks job scheduled (2:00 AM daily)");
}

/**
 * Weekly compliance report job
 * Runs every Monday at 8:00 AM
 */
export function startWeeklyComplianceReportJob() {
  cron.schedule("0 8 * * 1", async () => {
    try {
      console.log("[Job Scheduler] Starting weekly compliance report job...");
      
      // Get all programs
      const programs = await db.getPrograms();
      
      // Generate report data
      const reportData = [];
      for (const program of programs) {
        const participants = await db.getParticipantsByProgramId(program.id);
        const completedCount = participants.filter(p => p.status === "completed").length;
        const completionRate = participants.length > 0 
          ? (completedCount / participants.length) * 100 
          : 0;

        reportData.push({
          programName: program.name,
          totalParticipants: participants.length,
          completedParticipants: completedCount,
          completionRate: completionRate.toFixed(2) + "%",
        });
      }

      // Generate HTML report
      const reportHtml = `
        <h2>Weekly Compliance Report</h2>
        <p>Report generated on ${new Date().toLocaleDateString()}</p>
        <table border="1" cellpadding="10" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr style="background-color: #f0f0f0;">
              <th>Program Name</th>
              <th>Total Participants</th>
              <th>Completed</th>
              <th>Completion Rate</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(row => `
              <tr>
                <td>${row.programName}</td>
                <td>${row.totalParticipants}</td>
                <td>${row.completedParticipants}</td>
                <td>${row.completionRate}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p><strong>Total Programs:</strong> ${programs.length}</p>
        <p><strong>Overall Participants:</strong> ${reportData.reduce((sum, r) => sum + r.totalParticipants, 0)}</p>
      `;

      // Send report to admin (you can configure the recipient email)
      const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
      
      await sendEmail({
        to: adminEmail,
        subject: `Weekly Compliance Report - ${new Date().toLocaleDateString()}`,
        html: reportHtml,
      });

      logJob(
        "Weekly Compliance Report",
        "success",
        `Report sent to ${adminEmail} with ${programs.length} programs`
      );
    } catch (error: any) {
      logJob("Weekly Compliance Report", "error", error.message);
    }
  });

  console.log("[Job Scheduler] Weekly compliance report job scheduled (Monday 8:00 AM)");
}

/**
 * Send reference check reminders job
 * Runs every 3 days at 10:00 AM
 */
export function startReferenceCheckRemindersJob() {
  cron.schedule("0 10 */3 * *", async () => {
    try {
      console.log("[Job Scheduler] Starting reference check reminders job...");
      
      const pendingChecks = await db.getPendingReferenceChecks();
      let remindersSent = 0;

      for (const check of pendingChecks) {
        // Send reminder if sent more than 3 days ago and less than 3 reminders sent
        const daysSinceSent = check.sentAt 
          ? Math.floor((Date.now() - check.sentAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        if (daysSinceSent >= 3 && (check.reminderCount || 0) < 3) {
          const candidate = await db.getCandidateById(check.candidateId);
          const baseUrl = process.env.VITE_APP_URL || "https://your-domain.com";
          const referenceLink = `${baseUrl}/reference-check/${check.id}`;

          const emailSubject = `Reminder: Reference Check Request for ${candidate?.name || "Candidate"}`;
          const emailBody = `
            <h2>Reminder: Reference Check Request</h2>
            <p>Hello ${check.referenceName},</p>
            <p>This is a friendly reminder that you have a pending reference check request.</p>
            <p><strong>Please complete by ${check.expiresAt?.toLocaleDateString()}</strong></p>
            <p><a href="${referenceLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">Complete Reference Check</a></p>
            <p>Thank you!</p>
          `;

          await sendEmail({
            to: check.referenceEmail,
            subject: emailSubject,
            html: emailBody,
          });

          await db.updateReferenceCheck(check.id, {
            reminderCount: (check.reminderCount || 0) + 1,
          });

          remindersSent++;
        }
      }

      logJob(
        "Reference Check Reminders",
        "success",
        `Sent ${remindersSent} reminder emails`
      );
    } catch (error: any) {
      logJob("Reference Check Reminders", "error", error.message);
    }
  });

  console.log("[Job Scheduler] Reference check reminders job scheduled (every 3 days at 10:00 AM)");
}

/**
 * Daily database backup job
 * Runs every day at 2:00 AM
 */
export function startDailyBackupJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      console.log("[Job Scheduler] Starting daily database backup...");
      
      const result = await createDatabaseBackup();
      
      if (result.success) {
        logJob(
          "Daily Database Backup",
          "success",
          `Database backup completed successfully. URL: ${result.backupUrl}`
        );
      } else {
        logJob(
          "Daily Database Backup",
          "error",
          `Backup failed: ${result.error}`
        );
      }
    } catch (error: any) {
      logJob("Daily Database Backup", "error", error.message);
    }
  });

  console.log("[Job Scheduler] Daily database backup job scheduled (2:00 AM daily)");
}

/**
 * Initialize all scheduled jobs
 */
export function initializeJobScheduler() {
  console.log("[Job Scheduler] Initializing all scheduled jobs...");
  
  startDailyReminderJob();
  startExpiredReferenceChecksJob();
  startWeeklyComplianceReportJob();
  startReferenceCheckRemindersJob();
  
  // Daily database backup job (2:00 AM)
  startDailyBackupJob();
  
  console.log("[Job Scheduler] All jobs initialized successfully");
}

/**
 * Get job scheduler status
 */
export function getJobSchedulerStatus() {
  return {
    active: true,
    jobs: [
      {
        name: "Daily Reminders",
        schedule: "0 9 * * * (9:00 AM daily)",
        description: "Send daily reminder emails for missing documents and pending approvals",
      },
      {
        name: "Expired Reference Checks",
        schedule: "0 2 * * * (2:00 AM daily)",
        description: "Process and mark expired reference checks",
      },
      {
        name: "Weekly Compliance Report",
        schedule: "0 8 * * 1 (Monday 8:00 AM)",
        description: "Generate and send weekly compliance reports to admin",
      },
      {
        name: "Reference Check Reminders",
        schedule: "0 10 */3 * * (every 3 days at 10:00 AM)",
        description: "Send reminder emails for pending reference checks",
      },
    ],
    recentLogs: getJobLogs(20),
  };
}
