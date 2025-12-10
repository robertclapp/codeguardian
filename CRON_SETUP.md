# Automated Reminder Cron Job Setup

This guide explains how to set up automated daily email reminders for missing documents and pending approvals.

## Overview

The automated reminder system sends daily emails to:
- **Participants** with missing documents
- **Staff/Admins** with pending document approvals

## Quick Setup

### 1. Test the Cron Script Manually

First, test that the script works correctly:

```bash
cd /home/ubuntu/ai_hr_platform
tsx server/cron/sendDailyReminders.ts
```

You should see output showing how many reminders were sent.

### 2. Schedule with Cron

Edit your crontab:

```bash
crontab -e
```

Add this line to run reminders daily at 9:00 AM:

```
0 9 * * * cd /home/ubuntu/ai_hr_platform && tsx server/cron/sendDailyReminders.ts >> /var/log/reminders.log 2>&1
```

### 3. Verify Cron Job

List your cron jobs to confirm it was added:

```bash
crontab -l
```

## Cron Schedule Examples

```
# Every day at 9:00 AM
0 9 * * * cd /path/to/project && tsx server/cron/sendDailyReminders.ts

# Every weekday at 8:00 AM
0 8 * * 1-5 cd /path/to/project && tsx server/cron/sendDailyReminders.ts

# Every Monday at 9:00 AM (weekly)
0 9 * * 1 cd /path/to/project && tsx server/cron/sendDailyReminders.ts

# Twice a day (9 AM and 5 PM)
0 9,17 * * * cd /path/to/project && tsx server/cron/sendDailyReminders.ts
```

## Configuration

### Reminder Settings

Configure reminder behavior in the admin UI at `/settings/reminders`:

- **Enable/Disable**: Turn reminders on or off
- **Threshold Days**: Number of days before sending reminder (default: 3)
- **Missing Documents**: Enable/disable participant reminders
- **Pending Approvals**: Enable/disable staff reminders

### Environment Variables

The reminder system uses these environment variables:

- `VITE_FRONTEND_URL`: Base URL for links in emails
- `VITE_APP_TITLE`: Organization name in emails
- Email provider settings (see EMAIL_CONFIGURATION.md)

## Monitoring

### Check Cron Logs

View the cron job output:

```bash
tail -f /var/log/reminders.log
```

### Manual Testing

Test reminders manually from the admin UI:
1. Go to Settings → Reminders
2. Click "Send All Reminders" or specific reminder type
3. Check email delivery

### Troubleshooting

**Cron job not running:**
- Check cron service: `sudo systemctl status cron`
- Verify crontab syntax: `crontab -l`
- Check log file permissions

**No emails being sent:**
- Verify email provider configuration (EMAIL_CONFIGURATION.md)
- Check that participants have email addresses
- Review reminder threshold settings

**Script errors:**
- Check Node.js/tsx is installed: `tsx --version`
- Verify database connection
- Check script permissions: `chmod +x server/cron/sendDailyReminders.ts`

## Production Deployment

### Using systemd Timer (Alternative to Cron)

For more robust scheduling, use systemd timers:

1. Create service file `/etc/systemd/system/reminders.service`:

```ini
[Unit]
Description=Send Daily Reminders
After=network.target

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/home/ubuntu/ai_hr_platform
ExecStart=/usr/bin/tsx server/cron/sendDailyReminders.ts
StandardOutput=journal
StandardError=journal
```

2. Create timer file `/etc/systemd/system/reminders.timer`:

```ini
[Unit]
Description=Daily Reminder Timer
Requires=reminders.service

[Timer]
OnCalendar=daily
OnCalendar=09:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable reminders.timer
sudo systemctl start reminders.timer
```

4. Check timer status:

```bash
sudo systemctl status reminders.timer
sudo systemctl list-timers
```

### Using PM2 (For Node.js Applications)

If you're using PM2 to manage your application:

```bash
pm2 install pm2-cron
pm2 set pm2-cron:jobs '[{"name":"daily-reminders","cron":"0 9 * * *","script":"server/cron/sendDailyReminders.ts"}]'
```

## Best Practices

1. **Test First**: Always test manually before scheduling
2. **Monitor Logs**: Regularly check logs for errors
3. **Set Alerts**: Configure alerts for failed reminder jobs
4. **Backup Strategy**: Keep logs for at least 30 days
5. **Rate Limiting**: Be aware of email provider rate limits
6. **Time Zone**: Ensure server time zone matches your needs

## Email Provider Considerations

### SendGrid
- Free tier: 100 emails/day
- Rate limit: 600 requests/minute

### AWS SES
- Free tier: 62,000 emails/month (if sending from EC2)
- Rate limit: 14 emails/second (can be increased)

### Mailgun
- Free tier: 5,000 emails/month
- Rate limit: 100 emails/hour (free tier)

See EMAIL_CONFIGURATION.md for detailed provider setup.

## Support

For issues or questions:
1. Check logs first: `/var/log/reminders.log`
2. Test manually: `tsx server/cron/sendDailyReminders.ts`
3. Review email provider status
4. Check database connectivity
