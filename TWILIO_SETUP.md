# Twilio SMS Integration Setup Guide

This guide explains how to set up SMS notifications using Twilio for the AI-Powered HR Platform.

## Overview

The platform can send SMS notifications alongside email reminders for:
- Missing documents
- Pending approvals
- Document status updates
- Program milestones
- Welcome messages

## Prerequisites

- A Twilio account (free trial available)
- A Twilio phone number
- Access to the platform's environment variable settings

## Step-by-Step Setup

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email address and phone number

### 2. Get a Twilio Phone Number

1. Log in to your Twilio Console
2. Navigate to **Phone Numbers** → **Manage** → **Buy a number**
3. Select a phone number (free on trial accounts)
4. Complete the purchase

### 3. Get Your Credentials

From your [Twilio Console Dashboard](https://console.twilio.com/):

1. **Account SID**: Copy from the "Account Info" section
2. **Auth Token**: Click "View" to reveal, then copy
3. **Phone Number**: Copy from Phone Numbers section (format: +1234567890)

### 4. Configure Environment Variables

Add the following environment variables through the Management UI (Settings → Secrets):

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
SMS_NOTIFICATIONS_ENABLED=true
```

**Important:** 
- Keep your Auth Token secret - never commit it to code
- Phone number must be in E.164 format (+[country code][number])

### 5. Test Your Configuration

1. Go to **Settings → SMS** in the platform
2. Enter a test phone number
3. Click "Send Test SMS"
4. Verify you receive the message

## Trial Account Limitations

Twilio trial accounts have the following restrictions:

### Verified Numbers Only
- Can only send SMS to phone numbers you've verified in the Twilio console
- To verify a number: Console → Phone Numbers → Verified Caller IDs

### Trial Message Prefix
- All messages include: "Sent from your Twilio trial account - "
- This prefix is removed when you upgrade to a paid account

### Rate Limits
- 1 message per second
- Limited number of messages per day

### Upgrade to Remove Limits
To send to any phone number and remove the trial prefix:
1. Add payment method in Twilio Console
2. Upgrade account (pay-as-you-go, no monthly fee)
3. Costs: ~$0.0075 per SMS in the US

## SMS Templates

The platform includes pre-configured templates for:

| Template | Purpose | Example |
|----------|---------|---------|
| `missingDocument` | Remind participants to upload documents | "Hi John, you have a missing document..." |
| `pendingApproval` | Notify staff of pending reviews | "Hi Admin, you have 5 documents pending..." |
| `documentApproved` | Confirm document approval | "Hi John, your document has been approved!" |
| `documentRejected` | Notify of document rejection | "Hi John, your document was rejected..." |
| `stageCompleted` | Celebrate stage completion | "Congratulations! You've completed..." |
| `programCompleted` | Celebrate program completion | "Congratulations! You've completed the program!" |
| `welcomeMessage` | Welcome new participants | "Welcome to the program, John!" |
| `reminderDeadline` | Deadline reminders | "Reminder: Task due in 3 days" |

## Phone Number Formatting

The platform automatically formats phone numbers to E.164 format:

**Accepted formats:**
- `+1 (555) 123-4567` → `+15551234567`
- `555-123-4567` → `+15551234567` (assumes US)
- `(555) 123-4567` → `+15551234567` (assumes US)
- `+44 20 7123 4567` → `+442071234567` (UK)

**Requirements:**
- US numbers: 10 digits (country code +1 added automatically)
- International: Include country code

## Integration with Automated Reminders

SMS notifications work alongside email reminders:

1. **Enable SMS in Reminder Settings:**
   - Go to Settings → Reminders
   - Check "Enable SMS Notifications"
   - Configure reminder frequency

2. **Participant Phone Numbers:**
   - Ensure participants have phone numbers in their profiles
   - Phone numbers are validated before sending
   - Invalid numbers are skipped with a log entry

3. **Cron Job Integration:**
   - SMS is sent automatically with daily reminders
   - No additional cron configuration needed
   - See CRON_SETUP.md for scheduling details

## Monitoring and Troubleshooting

### Check SMS Status

View SMS delivery status in the platform:
- Settings → SMS → Configuration Status
- Shows: Configured, Enabled, From Number

### Common Issues

**"SMS notifications are disabled"**
- Set `SMS_NOTIFICATIONS_ENABLED=true` in environment variables

**"Twilio credentials not configured"**
- Verify all three environment variables are set correctly
- Check for typos in variable names

**"Invalid phone number format"**
- Ensure phone number includes country code
- Use E.164 format: +[country][number]

**"Twilio API error: 20003"**
- Auth Token is incorrect
- Regenerate token in Twilio Console

**"Twilio API error: 21211"**
- Phone number is not verified (trial accounts only)
- Verify the number in Twilio Console

**"Twilio API error: 21408"**
- From number doesn't exist or isn't owned by your account
- Verify `TWILIO_PHONE_NUMBER` matches your Twilio number

### Twilio Console Logs

View detailed SMS logs in Twilio Console:
1. Go to Monitor → Logs → Messaging
2. Filter by date, status, or phone number
3. View delivery status and error codes

## Cost Optimization

### Pricing (US, as of 2024)
- **Outbound SMS**: ~$0.0075 per message
- **Phone Number**: $1.15/month
- **No monthly minimums** on pay-as-you-go

### Tips to Reduce Costs
1. **Combine notifications**: Group multiple updates into one message
2. **Smart frequency**: Don't send reminders too often
3. **Email fallback**: Use email as primary, SMS for urgent only
4. **Opt-in only**: Only send SMS to users who request it
5. **Threshold settings**: Increase reminder threshold days

### Example Monthly Costs
- 100 participants, 2 SMS/month each: ~$1.50
- 500 participants, 4 SMS/month each: ~$15.00
- Plus $1.15 for phone number = **$2.65 - $16.15/month**

## Security Best Practices

1. **Never expose credentials**
   - Keep Auth Token in environment variables only
   - Don't log or display in UI
   - Rotate tokens if compromised

2. **Validate phone numbers**
   - Always validate before sending
   - Sanitize user input
   - Use E.164 format

3. **Rate limiting**
   - Platform includes 1.1s delay between messages
   - Prevents Twilio rate limit errors
   - Adjust if needed for bulk sends

4. **Audit logging**
   - All SMS sends are logged
   - Review logs regularly
   - Monitor for unusual activity

## Advanced Features

### Delivery Status Callbacks (Future Enhancement)
Configure webhooks to track delivery status:
1. Twilio Console → Messaging → Settings
2. Add webhook URL: `https://yourapp.com/api/sms/status`
3. Track: Sent, Delivered, Failed, Undelivered

### Two-Way SMS (Future Enhancement)
Allow participants to reply to SMS:
1. Configure webhook for incoming messages
2. Parse replies for commands (STOP, HELP, etc.)
3. Update participant preferences

### SMS Opt-Out Management (Future Enhancement)
Implement opt-out handling:
1. Respect STOP/UNSUBSCRIBE replies
2. Maintain opt-out list in database
3. Skip opted-out numbers in bulk sends

## Support Resources

- **Twilio Documentation**: [https://www.twilio.com/docs/sms](https://www.twilio.com/docs/sms)
- **Twilio Support**: [https://support.twilio.com](https://support.twilio.com)
- **Error Codes**: [https://www.twilio.com/docs/api/errors](https://www.twilio.com/docs/api/errors)
- **Platform Settings**: Settings → SMS in the application

## FAQ

**Q: Can I use my own phone number?**
A: No, you must use a Twilio phone number. You can port your existing number to Twilio if needed.

**Q: Can I send international SMS?**
A: Yes, but rates vary by country. Check Twilio's pricing page for specific rates.

**Q: How many messages can I send per day?**
A: Trial accounts have daily limits. Paid accounts have no daily limits but are subject to rate limits (1 msg/sec default, can be increased).

**Q: What happens if a participant doesn't have a phone number?**
A: They'll only receive email notifications. SMS is skipped for participants without valid phone numbers.

**Q: Can participants reply to SMS messages?**
A: Not currently implemented, but can be added as a future enhancement.

**Q: Is SMS delivery guaranteed?**
A: No messaging system can guarantee 100% delivery. Twilio provides delivery receipts to track status.
