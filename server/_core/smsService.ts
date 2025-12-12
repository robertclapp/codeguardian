import twilio from 'twilio';

// Twilio credentials from environment
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client (only if credentials are provided)
let twilioClient: ReturnType<typeof twilio> | null = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

export interface SMSOptions {
  to: string;
  message: string;
  type?: 'interview_reminder' | 'document_approval' | 'status_change' | 'general';
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS notification via Twilio
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  try {
    // Check if Twilio is configured
    if (!twilioClient || !TWILIO_PHONE_NUMBER) {
      console.warn('[SMS] Twilio not configured, skipping SMS send');
      return {
        success: false,
        error: 'Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment variables.',
      };
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(options.to)) {
      return {
        success: false,
        error: 'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
      };
    }

    // Send SMS
    const message = await twilioClient.messages.create({
      body: options.message,
      from: TWILIO_PHONE_NUMBER,
      to: options.to,
    });

    console.log(`[SMS] Sent ${options.type || 'general'} SMS to ${options.to}: ${message.sid}`);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('[SMS] Failed to send SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send interview reminder SMS
 */
export async function sendInterviewReminderSMS(
  candidateName: string,
  candidatePhone: string,
  interviewDate: Date,
  jobTitle: string
): Promise<SMSResult> {
  const formattedDate = interviewDate.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const message = `Hi ${candidateName}! This is a reminder about your interview for ${jobTitle} on ${formattedDate}. Good luck!`;

  return sendSMS({
    to: candidatePhone,
    message,
    type: 'interview_reminder',
  });
}

/**
 * Send document approval SMS
 */
export async function sendDocumentApprovalSMS(
  candidateName: string,
  candidatePhone: string,
  documentType: string
): Promise<SMSResult> {
  const message = `Hi ${candidateName}! Your ${documentType} has been approved. You can view your application status in the candidate portal.`;

  return sendSMS({
    to: candidatePhone,
    message,
    type: 'document_approval',
  });
}

/**
 * Send candidate status change SMS
 */
export async function sendStatusChangeSMS(
  candidateName: string,
  candidatePhone: string,
  newStatus: string,
  jobTitle: string
): Promise<SMSResult> {
  const statusMessages: Record<string, string> = {
    screening: `Hi ${candidateName}! Your application for ${jobTitle} is now being reviewed. We'll be in touch soon!`,
    interview: `Hi ${candidateName}! Great news - you've been selected for an interview for ${jobTitle}. Check your email for details!`,
    offer: `Hi ${candidateName}! Congratulations! We'd like to extend an offer for ${jobTitle}. Check your email for next steps!`,
    hired: `Hi ${candidateName}! Welcome aboard! You've been hired for ${jobTitle}. We're excited to have you join our team!`,
    rejected: `Hi ${candidateName}, thank you for your interest in ${jobTitle}. Unfortunately, we've decided to move forward with other candidates.`,
  };

  const message =
    statusMessages[newStatus] ||
    `Hi ${candidateName}! Your application status for ${jobTitle} has been updated to: ${newStatus}`;

  return sendSMS({
    to: candidatePhone,
    message,
    type: 'status_change',
  });
}

/**
 * Validate Twilio configuration
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER);
}

/**
 * Get Twilio configuration status
 */
export function getTwilioStatus() {
  return {
    configured: isTwilioConfigured(),
    accountSid: TWILIO_ACCOUNT_SID ? `${TWILIO_ACCOUNT_SID.substring(0, 10)}...` : 'Not set',
    phoneNumber: TWILIO_PHONE_NUMBER || 'Not set',
  };
}
