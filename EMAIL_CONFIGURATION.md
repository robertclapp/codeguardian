# Email Configuration Guide

This guide explains how to configure production email delivery for the AI-Powered HR Platform.

---

## Overview

The platform supports multiple email providers:
- **SendGrid** (recommended for ease of use)
- **AWS SES** (recommended for AWS users)
- **Mailgun** (alternative option)
- **Manus Notifications** (fallback, sends to app owner only)

By default, the system uses Manus notifications. To send actual emails to candidates and staff, you must configure one of the production email providers.

---

## Configuration Steps

### 1. Choose an Email Provider

**SendGrid** (Recommended for most users)
- Easy setup with API key
- Generous free tier (100 emails/day)
- Excellent deliverability
- Simple pricing: $15/month for 40,000 emails

**AWS SES** (Recommended for AWS users)
- Very cost-effective ($0.10 per 1,000 emails)
- Requires AWS account
- More complex setup
- Best for high volume

**Mailgun** (Alternative option)
- Good deliverability
- Free tier: 5,000 emails/month
- Simple API
- $35/month for 50,000 emails

### 2. Get API Credentials

#### SendGrid Setup

1. Sign up at [https://sendgrid.com](https://sendgrid.com)
2. Verify your sender email address or domain
3. Create an API key:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Choose "Full Access"
   - Copy the API key (you won't see it again!)
4. Note your verified sender email address

#### AWS SES Setup

1. Sign up for AWS account at [https://aws.amazon.com](https://aws.amazon.com)
2. Navigate to Amazon SES service
3. Verify your sender email address or domain
4. Request production access (required to send to any email)
5. Create IAM user with SES permissions:
   - Go to IAM → Users → Add User
   - Enable "Programmatic access"
   - Attach policy: `AmazonSESFullAccess`
   - Save Access Key ID and Secret Access Key
6. Note your AWS region (e.g., `us-east-1`)

#### Mailgun Setup

1. Sign up at [https://mailgun.com](https://mailgun.com)
2. Add and verify your domain
3. Get your API key:
   - Go to Settings → API Keys
   - Copy the Private API key
4. Note your domain name

### 3. Configure Environment Variables

Add these environment variables to your deployment:

#### For SendGrid:

```bash
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Organization Name
```

#### For AWS SES:

```bash
EMAIL_PROVIDER=ses
AWS_SES_REGION=us-east-1
AWS_SES_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxx
AWS_SES_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Organization Name
```

#### For Mailgun:

```bash
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.yourdomain.com
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Organization Name
```

### 4. Add Variables in Manus

1. Open your project in Manus
2. Click the Settings icon (⚙️) in the top right
3. Navigate to "Secrets" in the left sidebar
4. Click "Add Secret" for each variable
5. Enter the key name and value
6. Click "Save"

**Important:** After adding secrets, restart your application for changes to take effect.

---

## Email Types

The platform sends these automated emails:

### 1. Missing Document Reminders
Sent to candidates when required documents are missing.

**Trigger:** Manual or scheduled (daily)  
**Recipients:** Candidates with missing documents  
**Content:** List of missing documents, upload link

### 2. Stage Transition Notifications
Sent when a candidate advances to a new pipeline stage.

**Trigger:** Automatic when stage changes  
**Recipients:** Candidates  
**Content:** Congratulations message, new requirements

### 3. Document Approval/Rejection
Sent when staff reviews submitted documents.

**Trigger:** Automatic on approval/rejection  
**Recipients:** Candidates  
**Content:** Approval status, rejection reason (if applicable)

### 4. Pending Approval Reminders
Sent to staff when documents need review.

**Trigger:** Manual or scheduled (daily)  
**Recipients:** Staff members  
**Content:** Count of pending documents, review link

---

## Testing Email Configuration

After configuring your email provider, test the setup:

### Option 1: Use the API

```bash
curl -X POST https://your-app.com/api/trpc/system.testEmail \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Option 2: Check Logs

Send a test notification and check the server logs:

```
[Email] Using provider: SendGrid
[Email] Sent via SendGrid: Test Subject to test@example.com
```

If you see errors, verify your API credentials and check the troubleshooting section below.

---

## Troubleshooting

### "SendGrid API key not configured"

**Problem:** The `SENDGRID_API_KEY` environment variable is not set.

**Solution:**
1. Verify you added the secret in Manus Settings → Secrets
2. Restart your application
3. Check the secret name matches exactly: `SENDGRID_API_KEY`

### "Failed to send email"

**Problem:** API request to email provider failed.

**Solutions:**
1. **Verify sender email:** Ensure `EMAIL_FROM` is verified with your provider
2. **Check API key:** Confirm the API key is correct and has proper permissions
3. **Check rate limits:** Free tiers have sending limits
4. **Check recipient email:** Ensure it's a valid email address

### "Email sent but not received"

**Problem:** Email was sent successfully but didn't arrive.

**Solutions:**
1. **Check spam folder:** Emails from new senders often go to spam
2. **Verify domain:** Use a verified domain for better deliverability
3. **Check provider dashboard:** Most providers show delivery status
4. **Add SPF/DKIM records:** Improves deliverability (see provider docs)

### AWS SES "Email address not verified"

**Problem:** AWS SES is in sandbox mode.

**Solution:**
1. Request production access in AWS SES console
2. Or verify recipient email addresses for testing

---

## Best Practices

### 1. Use a Verified Domain

Instead of `noreply@gmail.com`, use your own domain:
- `noreply@yourorganization.org`
- `hr@yourorganization.org`

This improves deliverability and looks more professional.

### 2. Set Up SPF and DKIM

Add these DNS records to improve email deliverability:
- **SPF:** Proves your domain authorizes the email provider
- **DKIM:** Cryptographically signs your emails

Your email provider will provide the specific DNS records to add.

### 3. Monitor Sending Limits

Free tiers have limits:
- SendGrid: 100 emails/day
- Mailgun: 5,000 emails/month
- AWS SES: 62,000 emails/month (after production access)

Monitor your usage and upgrade if needed.

### 4. Handle Bounces and Complaints

Configure webhooks to handle:
- **Bounces:** Invalid email addresses
- **Complaints:** Users marking emails as spam

Most providers offer webhook endpoints for these events.

### 5. Personalize Emails

The system automatically personalizes emails with:
- Recipient name
- Program name
- Specific requirements
- Progress information

Ensure candidate data is complete for best results.

---

## Cost Estimates

### For Small Nonprofits (< 100 participants)

**Estimated emails per month:** ~1,000
- Document reminders: 300
- Stage transitions: 200
- Approvals/rejections: 400
- Staff notifications: 100

**Recommended:** SendGrid Free Tier ($0/month)
- Covers up to 100 emails/day
- More than enough for small organizations

### For Medium Nonprofits (100-500 participants)

**Estimated emails per month:** ~5,000
- Document reminders: 1,500
- Stage transitions: 1,000
- Approvals/rejections: 2,000
- Staff notifications: 500

**Recommended:** Mailgun Free Tier ($0/month) or SendGrid Essentials ($15/month)

### For Large Nonprofits (500+ participants)

**Estimated emails per month:** ~20,000+

**Recommended:** AWS SES ($2/month) or SendGrid Pro ($90/month)

---

## Security Considerations

### Protect API Keys

- **Never commit API keys to Git**
- **Use environment variables only**
- **Rotate keys regularly** (every 90 days)
- **Use separate keys for development and production**

### Email Content Security

- **Never include passwords in emails**
- **Use secure links (HTTPS only)**
- **Include unsubscribe options** (for non-critical emails)
- **Comply with CAN-SPAM Act**

### Data Privacy

- **Only send emails to verified addresses**
- **Don't include sensitive personal information**
- **Log email sends for audit trail**
- **Respect user preferences**

---

## Scheduled Email Reminders

To send automated daily reminders, set up a cron job or scheduled task:

### Option 1: Cron Job (Linux/Mac)

```bash
# Run daily at 9 AM
0 9 * * * curl -X POST https://your-app.com/api/trpc/notifications.sendDailyReminders
```

### Option 2: Scheduled Task (Windows)

Use Windows Task Scheduler to run a script daily.

### Option 3: Cloud Scheduler

Use your hosting provider's scheduler:
- **Vercel:** Vercel Cron Jobs
- **AWS:** EventBridge
- **Google Cloud:** Cloud Scheduler

---

## Support

### Provider Documentation

- **SendGrid:** [https://docs.sendgrid.com](https://docs.sendgrid.com)
- **AWS SES:** [https://docs.aws.amazon.com/ses](https://docs.aws.amazon.com/ses)
- **Mailgun:** [https://documentation.mailgun.com](https://documentation.mailgun.com)

### Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are set correctly
4. Test with a simple email first
5. Contact your email provider's support

---

## Next Steps

After configuring email:

1. ✅ Test email delivery with your own email address
2. ✅ Send a test notification to a candidate
3. ✅ Verify emails don't go to spam
4. ✅ Set up scheduled daily reminders
5. ✅ Monitor email delivery in provider dashboard
6. ✅ Document your configuration for team members

---

**Congratulations!** Your HR platform is now configured to send production emails. Candidates and staff will receive automated notifications to keep the onboarding process moving smoothly.
