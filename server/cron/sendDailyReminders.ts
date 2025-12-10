#!/usr/bin/env tsx
/**
 * Daily Reminder Cron Job
 * 
 * This script sends automated email reminders for:
 * - Missing documents
 * - Pending approvals
 * 
 * Usage:
 *   tsx server/cron/sendDailyReminders.ts
 * 
 * Schedule with cron:
 *   0 9 * * * cd /path/to/project && tsx server/cron/sendDailyReminders.ts
 *   (Runs daily at 9:00 AM)
 */

import { sendDailyReminders } from "../services/automatedReminders";

async function main() {
  console.log("=".repeat(60));
  console.log("Daily Reminder Cron Job");
  console.log(new Date().toISOString());
  console.log("=".repeat(60));

  try {
    const results = await sendDailyReminders();

    console.log("\n" + "=".repeat(60));
    console.log("Results:");
    console.log(`  Missing Document Reminders: ${results.missingDocuments.sent} sent, ${results.missingDocuments.failed} failed`);
    console.log(`  Pending Approval Reminders: ${results.pendingApprovals.sent} sent, ${results.pendingApprovals.failed} failed`);
    console.log(`  Total: ${results.totalSent} sent, ${results.totalFailed} failed`);
    console.log("=".repeat(60));

    // Exit with error code if any reminders failed
    if (results.totalFailed > 0) {
      console.error(`\n⚠️  ${results.totalFailed} reminders failed to send`);
      process.exit(1);
    }

    console.log("\n✅ Daily reminder job completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Fatal error in daily reminder job:");
    console.error(error);
    process.exit(1);
  }
}

main();
