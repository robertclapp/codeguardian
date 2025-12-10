/**
 * Email Notification Service
 * 
 * Handles automated email notifications for:
 * - Missing document reminders
 * - Stage transition notifications
 * - Pending approval reminders
 * 
 * Uses the built-in Manus notification system for MVP
 * Can be extended to use SendGrid, AWS SES, or other email providers
 */

import { notifyOwner } from "../_core/notification";

/**
 * Email template types
 */
export type EmailTemplate = 
  | "missing_document"
  | "stage_transition"
  | "pending_approval"
  | "document_approved"
  | "document_rejected";

/**
 * Email notification data
 */
export interface EmailNotificationData {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  template: EmailTemplate;
  data: Record<string, any>;
}

/**
 * Generate email content based on template
 */
function generateEmailContent(template: EmailTemplate, data: Record<string, any>): string {
  switch (template) {
    case "missing_document":
      return `
Hello ${data.participantName},

You have missing documents required for your ${data.programName} program.

Required documents:
${data.missingDocuments.map((doc: string) => `- ${doc}`).join("\\n")}

Please upload these documents as soon as possible to continue your onboarding process.

Current stage: ${data.currentStage}
Days in stage: ${data.daysInStage}

Upload documents at: ${data.uploadUrl}

Thank you,
${data.organizationName}
      `.trim();

    case "stage_transition":
      return `
Hello ${data.participantName},

Congratulations! You have successfully completed the "${data.previousStage}" stage and have been advanced to "${data.newStage}".

Program: ${data.programName}
New stage requirements:
${data.newRequirements.map((req: string) => `- ${req}`).join("\\n")}

Please review the new requirements and complete them to continue your progress.

View your progress at: ${data.progressUrl}

Thank you,
${data.organizationName}
      `.trim();

    case "pending_approval":
      return `
Hello ${data.staffName},

You have ${data.pendingCount} document(s) pending approval.

Recent submissions:
${data.recentDocuments.map((doc: any) => `- ${doc.name} from ${doc.candidateName}`).join("\\n")}

Please review and approve/reject these documents to keep participants moving through their programs.

Review documents at: ${data.approvalUrl}

Thank you,
${data.organizationName}
      `.trim();

    case "document_approved":
      return `
Hello ${data.participantName},

Your document "${data.documentName}" has been approved!

Program: ${data.programName}
Stage: ${data.stageName}

${data.completionMessage || "You can now proceed with the next steps in your onboarding process."}

View your progress at: ${data.progressUrl}

Thank you,
${data.organizationName}
      `.trim();

    case "document_rejected":
      return `
Hello ${data.participantName},

Your document "${data.documentName}" requires resubmission.

Reason: ${data.rejectionReason}

Program: ${data.programName}
Stage: ${data.stageName}

Please upload a corrected version of this document to continue your onboarding process.

Upload documents at: ${data.uploadUrl}

Thank you,
${data.organizationName}
      `.trim();

    default:
      return `Notification from ${data.organizationName}`;
  }
}

/**
 * Send email notification
 * 
 * For MVP, this uses the built-in notifyOwner function
 * In production, this should be extended to use a proper email service
 */
export async function sendEmailNotification(
  notification: EmailNotificationData
): Promise<boolean> {
  try {
    const content = generateEmailContent(notification.template, notification.data);
    
    // For MVP, notify the owner (admin) about the notification
    // In production, this would send actual emails to recipients
    const success = await notifyOwner({
      title: `[Email Notification] ${notification.subject}`,
      content: `
To: ${notification.recipientName} (${notification.recipientEmail})
Template: ${notification.template}

${content}
      `.trim(),
    });

    if (success) {
      console.log(`[Email] Notification sent: ${notification.subject} to ${notification.recipientEmail}`);
    } else {
      console.warn(`[Email] Failed to send notification: ${notification.subject}`);
    }

    return success;
  } catch (error) {
    console.error("[Email] Error sending notification:", error);
    return false;
  }
}

/**
 * Send missing document reminder
 */
export async function sendMissingDocumentReminder(params: {
  participantName: string;
  participantEmail: string;
  programName: string;
  currentStage: string;
  daysInStage: number;
  missingDocuments: string[];
  uploadUrl: string;
  organizationName: string;
}): Promise<boolean> {
  return sendEmailNotification({
    recipientName: params.participantName,
    recipientEmail: params.participantEmail,
    subject: `Missing Documents Required - ${params.programName}`,
    template: "missing_document",
    data: params,
  });
}

/**
 * Send stage transition notification
 */
export async function sendStageTransitionNotification(params: {
  participantName: string;
  participantEmail: string;
  programName: string;
  previousStage: string;
  newStage: string;
  newRequirements: string[];
  progressUrl: string;
  organizationName: string;
}): Promise<boolean> {
  return sendEmailNotification({
    recipientName: params.participantName,
    recipientEmail: params.participantEmail,
    subject: `Stage Transition - ${params.programName}`,
    template: "stage_transition",
    data: params,
  });
}

/**
 * Send pending approval reminder to staff
 */
export async function sendPendingApprovalReminder(params: {
  staffName: string;
  staffEmail: string;
  pendingCount: number;
  recentDocuments: Array<{ name: string; candidateName: string }>;
  approvalUrl: string;
  organizationName: string;
}): Promise<boolean> {
  return sendEmailNotification({
    recipientName: params.staffName,
    recipientEmail: params.staffEmail,
    subject: `${params.pendingCount} Document(s) Pending Approval`,
    template: "pending_approval",
    data: params,
  });
}

/**
 * Send document approval notification
 */
export async function sendDocumentApprovedNotification(params: {
  participantName: string;
  participantEmail: string;
  documentName: string;
  programName: string;
  stageName: string;
  completionMessage?: string;
  progressUrl: string;
  organizationName: string;
}): Promise<boolean> {
  return sendEmailNotification({
    recipientName: params.participantName,
    recipientEmail: params.participantEmail,
    subject: `Document Approved - ${params.documentName}`,
    template: "document_approved",
    data: params,
  });
}

/**
 * Send document rejection notification
 */
export async function sendDocumentRejectedNotification(params: {
  participantName: string;
  participantEmail: string;
  documentName: string;
  rejectionReason: string;
  programName: string;
  stageName: string;
  uploadUrl: string;
  organizationName: string;
}): Promise<boolean> {
  return sendEmailNotification({
    recipientName: params.participantName,
    recipientEmail: params.participantEmail,
    subject: `Document Requires Resubmission - ${params.documentName}`,
    template: "document_rejected",
    data: params,
  });
}

/**
 * Batch send notifications
 * Useful for daily digest emails
 */
export async function sendBatchNotifications(
  notifications: EmailNotificationData[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    const success = await sendEmailNotification(notification);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  console.log(`[Email] Batch complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
