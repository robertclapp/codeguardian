# AI-Powered HR Platform

A comprehensive workforce development platform designed for nonprofits managing subsidized employment programs. Features AI-powered job matching, automated onboarding pipelines, document management, compliance reporting, and multi-channel communications.

## 🚀 Features

### Core Functionality
- **Job Management** with AI-generated descriptions
- **Candidate Tracking** with AI-powered matching scores
- **Onboarding Pipelines** with customizable stages and requirements
- **Document Management** with approval workflows and version control
- **Progress Tracking** with bottleneck detection and analytics
- **Compliance Reporting** with exportable reports for state requirements

### Communication & Automation
- **Email Notifications** (SendGrid/AWS SES/Mailgun support)
- **SMS Notifications** (Twilio integration)
- **Automated Reminders** (daily missing documents, pending approvals)
- **Reference Checks** with automated email questionnaires
- **Background Job Scheduler** (5 automated jobs via node-cron)
- **Real-time WebSocket Notifications** (Socket.IO)

### Advanced Features
- **Bulk CSV Import** for participants
- **Mobile Participant Portal** with document upload
- **Calendar Integration** (Google Calendar & Outlook)
- **OCR Document Extraction** (AI-powered I-9 and W-4 parsing)
- **Multi-language Support** (English & Spanish via i18n)
- **Video Tutorials** with progress tracking
- **Advanced Fuzzy Search** across all entities
- **Performance Monitoring** with metrics tracking
- **Automated Daily Backups** to S3

### Admin Tools
- **Comprehensive Admin Dashboard**
- **Job Scheduler Status & Logs**
- **System Health Indicators**
- **Bulk Data Export** (CSV/JSON)
- **Performance Metrics** (API, DB, Jobs, WebSocket)

## 📊 Tech Stack

- **Frontend**: React 19, Tailwind CSS 4, shadcn/ui, Wouter
- **Backend**: Express 4, tRPC 11, Node.js
- **Database**: MySQL/TiDB with Drizzle ORM
- **Real-time**: Socket.IO
- **Storage**: AWS S3
- **Authentication**: Manus OAuth
- **Testing**: Vitest (135 tests passing)
- **Internationalization**: i18next

## 🗄️ Database Schema

19 tables including:
- `users`, `candidates`, `jobs`, `programs`
- `participants`, `stages`, `requirements`
- `documents`, `documentApprovals`
- `emailTemplates`, `videoTutorials`
- `referenceChecks`, `calendarProviders`, `calendarEvents`
- Performance indexes on all major queries

## 🔧 Setup & Installation

### Prerequisites
- Node.js 22.x
- pnpm
- MySQL/TiDB database

### Environment Variables

Required system environment variables (auto-injected by Manus platform):
```
DATABASE_URL=mysql://...
JWT_SECRET=...
VITE_APP_ID=...
OAUTH_SERVER_URL=...
VITE_OAUTH_PORTAL_URL=...
OWNER_OPEN_ID=...
OWNER_NAME=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_KEY=...
VITE_FRONTEND_FORGE_API_URL=...
```

Optional third-party service variables:
```
# Email (choose one)
SENDGRID_API_KEY=...
AWS_SES_ACCESS_KEY_ID=...
AWS_SES_SECRET_ACCESS_KEY=...
AWS_SES_REGION=...
MAILGUN_API_KEY=...
MAILGUN_DOMAIN=...

# SMS
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...

# Calendar
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
MICROSOFT_CALENDAR_CLIENT_ID=...
MICROSOFT_CALENDAR_CLIENT_SECRET=...
```

### Installation

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Run tests
pnpm test

# Start development server
pnpm dev
```

## 📚 Documentation

- `ACCESSIBILITY_AUDIT.md` - WCAG 2.1 AA compliance audit
- `EMAIL_CONFIGURATION.md` - Email service setup guide
- `TWILIO_SETUP.md` - SMS notifications configuration
- `CALENDAR_SETUP.md` - Calendar integration guide
- `CRON_SETUP.md` - Background job scheduler setup
- `TESTING_GUIDE.md` - Testing documentation
- `todo.md` - Feature tracking and development roadmap

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest run server/documents.test.ts
```

**Test Coverage:**
- 135 tests passing
- Document management (11 tests)
- Progress tracking (15 tests)
- Compliance reporting (30 tests)
- Email notifications (21 tests)
- Automated reminders (22 tests)
- New features (35 tests)
- Auth logout (1 test)

## 🔄 Background Jobs

Automated jobs running via node-cron:

1. **Daily Reminders** (9:00 AM daily)
   - Missing document notifications
   - Pending approval reminders

2. **Expired Reference Checks** (2:00 AM daily)
   - Mark expired checks
   - Send expiration notifications

3. **Weekly Compliance Reports** (Monday 8:00 AM)
   - Generate compliance summaries
   - Email to administrators

4. **Reference Check Reminders** (Every 3 days at 10:00 AM)
   - Send reminder emails to references

5. **Daily Database Backup** (2:00 AM daily)
   - Full database backup to S3
   - Owner notification on completion/failure

## 📱 API Structure

tRPC routers:
- `system` - System operations
- `ai` - AI-powered features (job descriptions, matching)
- `assistant` - AI assistant chat
- `jobs` - Job management
- `candidates` - Candidate tracking
- `programs` - Program management
- `documents` - Document management with approvals
- `compliance` - Compliance reporting
- `reminders` - Automated reminder settings
- `sms` - SMS notification management
- `bulk Import` - CSV import functionality
- `participantPortal` - Mobile participant interface
- `calendar` - Calendar integration
- `ocr` - Document OCR and extraction
- `videoTutorials` - Video tutorial management
- `referenceChecks` - Reference check system
- `jobScheduler` - Background job status
- `search` - Advanced search
- `performance` - Performance metrics
- `backup` - Data export and backup
- `templates` - Document templates library
- `analytics` - Program analytics

## 🎨 Frontend Pages

- `Dashboard` - Main overview
- `Jobs` - Job listings and management
- `Candidates` - Candidate tracking
- `Programs` - Program management
- `Documents` - Document library with approvals
- `Progress` - Participant progress tracking
- `Compliance` - Compliance reporting dashboard
- `Analytics` - Program analytics and insights
- `Templates` - Document template library
- `AdminDashboard` - System administration
- `BulkImport` - CSV import interface
- `ParticipantPortal` - Mobile-friendly participant view
- `ReminderSettings` - Automated reminder configuration
- `SMSSettings` - SMS notification setup

## 🔐 Security

- OAuth 2.0 authentication via Manus
- Role-based access control (admin/user)
- Protected procedures for sensitive operations
- Admin-only procedures for system management
- JWT session management
- Input validation with Zod schemas

## 🌍 Internationalization

Supported languages:
- English (default)
- Spanish (es)

Translation coverage:
- UI navigation and labels
- Email templates
- SMS messages
- Form validation messages

## 📈 Performance

- 25+ database indexes for query optimization
- Performance monitoring middleware
- Percentile calculations (p50, p95, p99)
- Slow query detection
- API response time tracking
- WebSocket connection health monitoring

## 🔄 Data Management

- **Automated Backups**: Daily at 2:00 AM to S3
- **Export Formats**: CSV and JSON
- **Exportable Entities**: Participants, Documents, Jobs, Programs, Candidates
- **Backup Restoration**: Full database restore capability

## 📞 Support & Contact

For questions about Manus platform features, billing, or technical support:
- Visit: https://help.manus.im

## 📝 License

Proprietary - All rights reserved

## 🚀 Deployment

The platform is designed to run on the Manus hosting infrastructure with built-in:
- Custom domain support
- SSL certificates
- Auto-scaling
- Database management
- S3 storage integration

To publish:
1. Create a checkpoint via `webdev_save_checkpoint`
2. Click "Publish" button in the Manus Management UI

## 🛠️ Development Workflow

1. Update schema in `drizzle/schema.ts`
2. Run `pnpm db:push`
3. Add database helpers in `server/db.ts`
4. Create/extend procedures in `server/routers/*.ts`
5. Build UI in `client/src/pages/*.tsx`
6. Write tests in `server/*.test.ts`
7. Run `pnpm test` to verify
8. Save checkpoint for deployment

## 📊 Project Statistics

- **Total Files**: 100+
- **Lines of Code**: 30,000+
- **Database Tables**: 19
- **API Endpoints**: 100+
- **UI Pages**: 20+
- **Background Jobs**: 5
- **Tests**: 135
- **Documentation Files**: 7

---

Built with ❤️ for nonprofit workforce development programs
