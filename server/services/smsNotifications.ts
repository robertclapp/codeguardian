/**
 * SMS Notification Service using Twilio
 * 
 * Sends text message notifications to participants and staff
 */

export interface SMSConfig {
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
  enabled?: boolean;
}

export interface SMSMessage {
  to: string;
  body: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Get SMS configuration from environment variables
 */
function getSMSConfig(): SMSConfig {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER,
    enabled: process.env.SMS_NOTIFICATIONS_ENABLED === "true",
  };
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // Check if it's a valid US phone number (10 digits) or international (11+ digits with country code)
  if (digits.length === 10) {
    return true; // US number without country code
  }
  if (digits.length >= 11 && digits.length <= 15) {
    return true; // International number with country code
  }
  
  return false;
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // Add +1 for US numbers if not present
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Add + if not present for international numbers
  if (!phone.startsWith("+")) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
}

/**
 * Send SMS using Twilio API
 */
export async function sendSMS(message: SMSMessage): Promise<SMSResult> {
  const config = getSMSConfig();
  
  // Check if SMS is enabled
  if (!config.enabled) {
    return {
      success: false,
      error: "SMS notifications are disabled",
    };
  }
  
  // Validate configuration
  if (!config.accountSid || !config.authToken || !config.fromNumber) {
    return {
      success: false,
      error: "Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.",
    };
  }
  
  // Validate phone number
  if (!validatePhoneNumber(message.to)) {
    return {
      success: false,
      error: `Invalid phone number format: ${message.to}`,
    };
  }
  
  try {
    // Format phone numbers to E.164
    const toNumber = formatPhoneNumber(message.to);
    const fromNumber = formatPhoneNumber(config.fromNumber);
    
    // Call Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
        },
        body: new URLSearchParams({
          To: toNumber,
          From: fromNumber,
          Body: message.body,
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.message || `Twilio API error: ${response.status}`,
      };
    }
    
    const data = await response.json();
    return {
      success: true,
      messageId: data.sid,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

/**
 * Send bulk SMS messages
 */
export async function sendBulkSMS(messages: SMSMessage[]): Promise<{
  sent: number;
  failed: number;
  results: SMSResult[];
}> {
  const results: SMSResult[] = [];
  let sent = 0;
  let failed = 0;
  
  for (const message of messages) {
    const result = await sendSMS(message);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
    
    // Add small delay to avoid rate limiting (Twilio allows 1 message/second on trial)
    await new Promise(resolve => setTimeout(resolve, 1100));
  }
  
  return { sent, failed, results };
}

/**
 * SMS Templates
 */
export const smsTemplates = {
  missingDocument: (participantName: string, documentName: string, programName: string) => {
    return `Hi ${participantName}, you have a missing document for ${programName}: ${documentName}. Please upload it at your earliest convenience.`;
  },
  
  pendingApproval: (staffName: string, count: number) => {
    return `Hi ${staffName}, you have ${count} document${count > 1 ? "s" : ""} pending approval. Please review them when you have a chance.`;
  },
  
  documentApproved: (participantName: string, documentName: string) => {
    return `Hi ${participantName}, your document "${documentName}" has been approved!`;
  },
  
  documentRejected: (participantName: string, documentName: string, reason: string) => {
    return `Hi ${participantName}, your document "${documentName}" was rejected. Reason: ${reason}. Please resubmit.`;
  },
  
  stageCompleted: (participantName: string, stageName: string, nextStageName: string) => {
    return `Congratulations ${participantName}! You've completed "${stageName}". Next up: "${nextStageName}".`;
  },
  
  programCompleted: (participantName: string, programName: string) => {
    return `Congratulations ${participantName}! You've completed the ${programName} program! 🎉`;
  },
  
  welcomeMessage: (participantName: string, programName: string) => {
    return `Welcome to ${programName}, ${participantName}! We're excited to have you. Check your email for next steps.`;
  },
  
  reminderDeadline: (participantName: string, taskName: string, daysLeft: number) => {
    return `Hi ${participantName}, reminder: "${taskName}" is due in ${daysLeft} day${daysLeft > 1 ? "s" : ""}. Please complete it soon.`;
  },
};

/**
 * Send notification via SMS with template
 */
export async function sendNotificationSMS(
  to: string,
  template: keyof typeof smsTemplates,
  ...args: any[]
): Promise<SMSResult> {
  const templateFn = smsTemplates[template] as (...args: any[]) => string;
  const body = templateFn(...args);
  
  return await sendSMS({ to, body });
}
