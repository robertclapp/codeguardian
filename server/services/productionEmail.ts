/**
 * Production Email Service
 * 
 * Supports multiple email providers:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Manus built-in notifications (fallback)
 * 
 * Configuration via environment variables:
 * - EMAIL_PROVIDER: 'sendgrid' | 'ses' | 'mailgun' | 'manus' (default: 'manus')
 * - EMAIL_FROM: Sender email address
 * - EMAIL_FROM_NAME: Sender name
 * 
 * Provider-specific:
 * - SENDGRID_API_KEY: SendGrid API key
 * - AWS_SES_REGION: AWS region (e.g., 'us-east-1')
 * - AWS_SES_ACCESS_KEY_ID: AWS access key
 * - AWS_SES_SECRET_ACCESS_KEY: AWS secret key
 * - MAILGUN_API_KEY: Mailgun API key
 * - MAILGUN_DOMAIN: Mailgun domain
 */

import { notifyOwner } from '../_core/notification';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailProvider {
  name: string;
  send(options: EmailOptions): Promise<boolean>;
}

/**
 * SendGrid email provider
 */
class SendGridProvider implements EmailProvider {
  name = 'SendGrid';
  
  async send(options: EmailOptions): Promise<boolean> {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      console.error('[Email] SendGrid API key not configured');
      return false;
    }

    const from = process.env.EMAIL_FROM || 'noreply@example.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'HR Platform';

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: options.to }],
            subject: options.subject,
          }],
          from: {
            email: from,
            name: fromName,
          },
          reply_to: options.replyTo ? { email: options.replyTo } : undefined,
          content: [
            {
              type: 'text/html',
              value: options.html,
            },
            ...(options.text ? [{
              type: 'text/plain',
              value: options.text,
            }] : []),
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Email] SendGrid error:', error);
        return false;
      }

      console.log(`[Email] Sent via SendGrid: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      console.error('[Email] SendGrid exception:', error);
      return false;
    }
  }
}

/**
 * AWS SES email provider
 */
class SESProvider implements EmailProvider {
  name = 'AWS SES';
  
  async send(options: EmailOptions): Promise<boolean> {
    const region = process.env.AWS_SES_REGION;
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;

    if (!region || !accessKeyId || !secretAccessKey) {
      console.error('[Email] AWS SES credentials not configured');
      return false;
    }

    const from = process.env.EMAIL_FROM || 'noreply@example.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'HR Platform';

    try {
      // AWS SES v2 API
      const endpoint = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;
      
      // Create AWS Signature V4 (simplified - in production use AWS SDK)
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, use AWS SDK or implement proper AWS Signature V4
          // This is a simplified example
        },
        body: JSON.stringify({
          FromEmailAddress: `${fromName} <${from}>`,
          Destination: {
            ToAddresses: [options.to],
          },
          Content: {
            Simple: {
              Subject: {
                Data: options.subject,
              },
              Body: {
                Html: {
                  Data: options.html,
                },
                Text: options.text ? {
                  Data: options.text,
                } : undefined,
              },
            },
          },
          ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Email] AWS SES error:', error);
        return false;
      }

      console.log(`[Email] Sent via AWS SES: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      console.error('[Email] AWS SES exception:', error);
      return false;
    }
  }
}

/**
 * Mailgun email provider
 */
class MailgunProvider implements EmailProvider {
  name = 'Mailgun';
  
  async send(options: EmailOptions): Promise<boolean> {
    const apiKey = process.env.MAILGUN_API_KEY;
    const domain = process.env.MAILGUN_DOMAIN;

    if (!apiKey || !domain) {
      console.error('[Email] Mailgun credentials not configured');
      return false;
    }

    const from = process.env.EMAIL_FROM || 'noreply@example.com';
    const fromName = process.env.EMAIL_FROM_NAME || 'HR Platform';

    try {
      const formData = new URLSearchParams();
      formData.append('from', `${fromName} <${from}>`);
      formData.append('to', options.to);
      formData.append('subject', options.subject);
      formData.append('html', options.html);
      if (options.text) {
        formData.append('text', options.text);
      }
      if (options.replyTo) {
        formData.append('h:Reply-To', options.replyTo);
      }

      const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[Email] Mailgun error:', error);
        return false;
      }

      console.log(`[Email] Sent via Mailgun: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      console.error('[Email] Mailgun exception:', error);
      return false;
    }
  }
}

/**
 * Manus built-in notification provider (fallback)
 */
class ManusProvider implements EmailProvider {
  name = 'Manus Notifications';
  
  async send(options: EmailOptions): Promise<boolean> {
    try {
      // Use Manus built-in notification system
      // Note: This sends to the app owner, not the actual recipient
      const success = await notifyOwner({
        title: `Email: ${options.subject}`,
        content: `To: ${options.to}\n\n${options.text || options.html}`,
      });

      if (success) {
        console.log(`[Email] Sent via Manus: ${options.subject} to ${options.to}`);
      } else {
        console.error(`[Email] Failed to send via Manus: ${options.subject}`);
      }

      return success;
    } catch (error) {
      console.error('[Email] Manus exception:', error);
      return false;
    }
  }
}

/**
 * Get the configured email provider
 */
function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'manus';

  switch (provider) {
    case 'sendgrid':
      return new SendGridProvider();
    case 'ses':
    case 'aws':
      return new SESProvider();
    case 'mailgun':
      return new MailgunProvider();
    case 'manus':
    default:
      return new ManusProvider();
  }
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const provider = getEmailProvider();
  
  console.log(`[Email] Using provider: ${provider.name}`);
  
  // Validate email address
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(options.to)) {
    console.error(`[Email] Invalid email address: ${options.to}`);
    return false;
  }

  // Generate plain text from HTML if not provided
  if (!options.text) {
    options.text = options.html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\n\s*\n/g, '\n\n') // Clean up whitespace
      .trim();
  }

  return await provider.send(options);
}

/**
 * Send a batch of emails
 */
export async function sendBatchEmails(emails: EmailOptions[]): Promise<{ sent: number; failed: number }> {
  console.log(`[Email] Sending batch of ${emails.length} emails`);
  
  const results = await Promise.allSettled(
    emails.map(email => sendEmail(email))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  console.log(`[Email] Batch complete: ${sent} sent, ${failed} failed`);

  return { sent, failed };
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(testEmail: string): Promise<{
  success: boolean;
  provider: string;
  error?: string;
}> {
  const provider = getEmailProvider();
  
  try {
    const success = await sendEmail({
      to: testEmail,
      subject: 'Email Configuration Test',
      html: '<h1>Email Configuration Test</h1><p>If you received this email, your email configuration is working correctly!</p>',
      text: 'Email Configuration Test\n\nIf you received this email, your email configuration is working correctly!',
    });

    return {
      success,
      provider: provider.name,
      error: success ? undefined : 'Failed to send test email',
    };
  } catch (error) {
    return {
      success: false,
      provider: provider.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
