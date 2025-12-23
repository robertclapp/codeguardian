import sgMail from "@sendgrid/mail";
import { ENV } from "./env";

// Initialize SendGrid
if (ENV.SENDGRID_API_KEY) {
  sgMail.setApiKey(ENV.SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Send email using SendGrid
 * Falls back to console log if API key not configured
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const fromEmail = options.from || ENV.FROM_EMAIL || "noreply@hrplatform.com";

  // If no SendGrid API key, log to console (development mode)
  if (!ENV.SENDGRID_API_KEY) {
    console.log("[Email Service] SendGrid not configured. Email would be sent:");
    console.log({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  }

  try {
    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    };

    await sgMail.send(msg);
    console.log(`[Email Service] Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    return false;
  }
}

/**
 * Send interview invitation email
 */
export async function sendInterviewInvitation(params: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: Date;
  interviewLink: string;
  interviewerName: string;
}): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Interview Invitation</h2>
      <p>Dear ${params.candidateName},</p>
      <p>We are pleased to invite you to interview for the <strong>${params.jobTitle}</strong> position.</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Interview Details:</strong></p>
        <p><strong>Date & Time:</strong> ${params.interviewDate.toLocaleString()}</p>
        <p><strong>Interviewer:</strong> ${params.interviewerName}</p>
        <p><strong>Video Link:</strong> <a href="${params.interviewLink}">${params.interviewLink}</a></p>
      </div>
      
      <p>Please join the video call at the scheduled time. We recommend testing your camera and microphone before the interview.</p>
      <p>If you need to reschedule, please contact us as soon as possible.</p>
      <p>We look forward to speaking with you!</p>
      <p>Best regards,<br/>${params.interviewerName}</p>
    </div>
  `;

  return sendEmail({
    to: params.candidateEmail,
    subject: `Interview Invitation - ${params.jobTitle}`,
    html,
  });
}

/**
 * Send offer letter email
 */
export async function sendOfferLetter(params: {
  candidateEmail: string;
  candidateName: string;
  jobTitle: string;
  salary: number;
  startDate: Date;
  benefits: string[];
  offerLink: string;
}): Promise<boolean> {
  const benefitsList = params.benefits.map((b) => `<li>${b}</li>`).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Job Offer</h2>
      <p>Dear ${params.candidateName},</p>
      <p>We are thrilled to offer you the position of <strong>${params.jobTitle}</strong>!</p>
      
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Offer Details:</strong></p>
        <p><strong>Position:</strong> ${params.jobTitle}</p>
        <p><strong>Salary:</strong> $${params.salary.toLocaleString()} per year</p>
        <p><strong>Start Date:</strong> ${params.startDate.toLocaleDateString()}</p>
        <p><strong>Benefits:</strong></p>
        <ul>${benefitsList}</ul>
      </div>
      
      <p>To accept this offer, please review and sign the offer letter at:</p>
      <p><a href="${params.offerLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Review & Accept Offer</a></p>
      
      <p>This offer is valid for 7 days. If you have any questions, please don't hesitate to reach out.</p>
      <p>We're excited to have you join our team!</p>
      <p>Best regards,<br/>HR Team</p>
    </div>
  `;

  return sendEmail({
    to: params.candidateEmail,
    subject: `Job Offer - ${params.jobTitle}`,
    html,
  });
}

/**
 * Send candidate nurturing email
 */
export async function sendNurturingEmail(params: {
  candidateEmail: string;
  candidateName: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
}): Promise<boolean> {
  const ctaButton = params.ctaText && params.ctaLink
    ? `<p><a href="${params.ctaLink}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">${params.ctaText}</a></p>`
    : "";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Update from Our Team</h2>
      <p>Hi ${params.candidateName},</p>
      ${params.message}
      ${ctaButton}
      <p>Best regards,<br/>HR Team</p>
    </div>
  `;

  return sendEmail({
    to: params.candidateEmail,
    subject: "Update on Your Application",
    html,
  });
}
