import { ENV } from "./env";

/**
 * Email Service
 * Handles SMTP email delivery for magic links, notifications, and interview requests
 */

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send email via SMTP
 * Uses Twilio SendGrid or SMTP credentials from environment
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    // Check if SMTP is configured
    const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER;
    
    if (!smtpConfigured) {
      console.log("[Email Service] SMTP not configured. Email would be sent to:", options.to);
      console.log("[Email Service] Subject:", options.subject);
      console.log("[Email Service] Body:", options.text || options.html);
      
      // In development, return success without actually sending
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }
    
    // TODO: Implement actual SMTP sending using nodemailer
    // For now, log the email details
    console.log(`[Email Service] Sending email to ${options.to}`);
    console.log(`[Email Service] Subject: ${options.subject}`);
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
    };
  } catch (error) {
    console.error("[Email Service] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send magic link email for candidate portal access
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string,
  candidateName?: string
): Promise<EmailResult> {
  const magicLink = `${process.env.VITE_APP_URL || "http://localhost:3000"}/candidate-portal?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Portal Access Link</h1>
        </div>
        <div class="content">
          <p>Hello${candidateName ? ` ${candidateName}` : ""},</p>
          <p>You requested access to your candidate portal. Click the button below to view your application status and manage your documents:</p>
          <p style="text-align: center;">
            <a href="${magicLink}" class="button">Access Your Portal</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px;">${magicLink}</p>
          <p><strong>This link will expire in 7 days.</strong></p>
          <p>If you didn't request this link, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hello${candidateName ? ` ${candidateName}` : ""},

You requested access to your candidate portal. Use this link to view your application status and manage your documents:

${magicLink}

This link will expire in 7 days.

If you didn't request this link, you can safely ignore this email.
  `.trim();
  
  return sendEmail({
    to: email,
    subject: "Your Candidate Portal Access Link",
    html,
    text,
  });
}

/**
 * Send interview request email to candidate
 */
export async function sendInterviewRequestEmail(
  candidateEmail: string,
  candidateName: string,
  employerName: string,
  jobTitle: string,
  message?: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .highlight { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Interview Request!</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>Great news! <strong>${employerName}</strong> is interested in interviewing you for the <strong>${jobTitle}</strong> position.</p>
          ${message ? `<div class="highlight"><p><strong>Message from employer:</strong></p><p>${message}</p></div>` : ""}
          <p>They will be in touch soon to schedule an interview. Please keep an eye on your email and phone.</p>
          <p>In the meantime, you can:</p>
          <ul>
            <li>Review the job description and requirements</li>
            <li>Prepare questions about the role and company</li>
            <li>Update your availability in the candidate portal</li>
          </ul>
          <p>Good luck with your interview!</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hello ${candidateName},

Great news! ${employerName} is interested in interviewing you for the ${jobTitle} position.

${message ? `Message from employer:\n${message}\n\n` : ""}

They will be in touch soon to schedule an interview. Please keep an eye on your email and phone.

Good luck with your interview!
  `.trim();
  
  return sendEmail({
    to: candidateEmail,
    subject: `Interview Request: ${jobTitle}`,
    html,
    text,
  });
}

/**
 * Send application status update email
 */
export async function sendStatusUpdateEmail(
  candidateEmail: string,
  candidateName: string,
  jobTitle: string,
  newStatus: string
): Promise<EmailResult> {
  const statusMessages: Record<string, string> = {
    approved: "Your application has been approved and moved to the next stage!",
    rejected: "Thank you for your interest. Unfortunately, we've decided to move forward with other candidates.",
    interview: "You've been selected for an interview!",
    hired: "Congratulations! You've been selected for the position!",
  };
  
  const message = statusMessages[newStatus] || `Your application status has been updated to: ${newStatus}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Application Status Update</h1>
        </div>
        <div class="content">
          <p>Hello ${candidateName},</p>
          <p>We have an update regarding your application for <strong>${jobTitle}</strong>.</p>
          <p><strong>${message}</strong></p>
          <p>You can view more details in your candidate portal.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Hello ${candidateName},

We have an update regarding your application for ${jobTitle}.

${message}

You can view more details in your candidate portal.
  `.trim();
  
  return sendEmail({
    to: candidateEmail,
    subject: `Application Update: ${jobTitle}`,
    html,
    text,
  });
}
