/**
 * Webhook Service for Slack and Microsoft Teams Integration
 * Sends real-time notifications to team collaboration platforms
 */

interface SlackMessage {
  text: string;
  blocks?: any[];
  attachments?: any[];
}

interface TeamsMessage {
  "@type": string;
  "@context": string;
  summary: string;
  sections: any[];
  potentialAction?: any[];
}

/**
 * Send notification to Slack webhook
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: SlackMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error("[Slack] Failed to send notification:", error);
    return false;
  }
}

/**
 * Send notification to Microsoft Teams webhook
 */
export async function sendTeamsNotification(
  webhookUrl: string,
  message: TeamsMessage
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error("[Teams] Failed to send notification:", error);
    return false;
  }
}

/**
 * Format notification for new application
 */
export function formatNewApplicationNotification(
  candidateName: string,
  jobTitle: string,
  platform: "slack" | "teams"
) {
  if (platform === "slack") {
    return {
      text: `New Application Received`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🎯 New Application Received",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Candidate:*\n${candidateName}`,
            },
            {
              type: "mrkdwn",
              text: `*Position:*\n${jobTitle}`,
            },
          ],
        },
      ],
    };
  } else {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: "New Application Received",
      sections: [
        {
          activityTitle: "🎯 New Application Received",
          facts: [
            { name: "Candidate", value: candidateName },
            { name: "Position", value: jobTitle },
          ],
        },
      ],
    };
  }
}

/**
 * Format notification for document approval
 */
export function formatDocumentApprovalNotification(
  candidateName: string,
  documentType: string,
  status: string,
  platform: "slack" | "teams"
) {
  const emoji = status === "approved" ? "✅" : "⚠️";
  
  if (platform === "slack") {
    return {
      text: `Document ${status}`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} Document ${status}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Candidate:*\n${candidateName}`,
            },
            {
              type: "mrkdwn",
              text: `*Document:*\n${documentType}`,
            },
          ],
        },
      ],
    };
  } else {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: `Document ${status}`,
      sections: [
        {
          activityTitle: `${emoji} Document ${status}`,
          facts: [
            { name: "Candidate", value: candidateName },
            { name: "Document", value: documentType },
          ],
        },
      ],
    };
  }
}

/**
 * Format notification for interview scheduling
 */
export function formatInterviewScheduledNotification(
  candidateName: string,
  jobTitle: string,
  interviewDate: Date,
  platform: "slack" | "teams"
) {
  const dateStr = interviewDate.toLocaleString();
  
  if (platform === "slack") {
    return {
      text: `Interview Scheduled`,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "📅 Interview Scheduled",
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Candidate:*\n${candidateName}`,
            },
            {
              type: "mrkdwn",
              text: `*Position:*\n${jobTitle}`,
            },
            {
              type: "mrkdwn",
              text: `*Date:*\n${dateStr}`,
            },
          ],
        },
      ],
    };
  } else {
    return {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      summary: "Interview Scheduled",
      sections: [
        {
          activityTitle: "📅 Interview Scheduled",
          facts: [
            { name: "Candidate", value: candidateName },
            { name: "Position", value: jobTitle },
            { name: "Date", value: dateStr },
          ],
        },
      ],
    };
  }
}
