import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "employer"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dashboard layouts - Store user's custom dashboard widget arrangements
 */export const candidatePortalTokens = mysqlTable("candidate_portal_tokens", {
  id: int("id").primaryKey().autoincrement(),
  candidateId: int("candidate_id").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InsertCandidatePortalToken = typeof candidatePortalTokens.$inferInsert;

export const savedSearches = mysqlTable('saved_searches', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  searchType: varchar('search_type', { length: 50 }).notNull(), // 'candidates', 'jobs', 'documents'
  filters: text('filters').notNull(), // JSON string
  createdAt: timestamp('created_at').defaultNow(),
});

export const importHistory = mysqlTable('import_history', {
  id: int('id').autoincrement().primaryKey(),
  importType: mysqlEnum('import_type', ['candidates', 'jobs']).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  totalRows: int('total_rows').notNull(),
  successfulRows: int('successful_rows').notNull(),
  failedRows: int('failed_rows').notNull(),
  errors: text('errors'), // JSON string
  rollbackId: varchar('rollback_id', { length: 100 }).unique(),
  importedBy: int('imported_by').notNull(),
  importedAt: timestamp('imported_at').defaultNow().notNull(),
  rolledBackAt: timestamp('rolled_back_at'),
});

export const jobSyndications = mysqlTable('job_syndications', {
  id: int('id').autoincrement().primaryKey(),
  jobId: int('job_id').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  externalJobId: varchar('external_job_id', { length: 255 }).notNull(),
  postUrl: text('post_url'),
  status: mysqlEnum('status', ['active', 'closed', 'expired', 'error']).notNull().default('active'),
  postedAt: timestamp('posted_at').defaultNow().notNull(),
  closedAt: timestamp('closed_at'),
  lastSyncedAt: timestamp('last_synced_at'),
});

export const backgroundChecks = mysqlTable('background_checks', {
  id: int('id').autoincrement().primaryKey(),
  candidateId: int('candidate_id').notNull(),
  checkId: varchar('check_id', { length: 100 }).notNull().unique(),
  packageId: varchar('package_id', { length: 100 }).notNull(),
  packageName: varchar('package_name', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'disputed', 'cancelled']).notNull().default('pending'),
  result: mysqlEnum('result', ['clear', 'consider', 'suspended']),
  price: int('price').notNull(),
  consentGiven: int('consent_given', { mode: 'boolean' }).notNull(),
  consentDate: timestamp('consent_date').notNull(),
  initiatedAt: timestamp('initiated_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  reportUrl: text('report_url'),
  details: text('details'), // JSON string
});

export const assessmentInvitations = mysqlTable('assessment_invitations', {
  id: int('id').autoincrement().primaryKey(),
  candidateId: int('candidate_id').notNull(),
  assessmentId: text('assessment_id').notNull(),
  assessmentTitle: text('assessment_title').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  invitationLink: text('invitation_link').notNull(),
  status: mysqlEnum('status', ['pending', 'completed', 'expired']).notNull().default('pending'),
  score: int('score'),
  percentile: int('percentile'),
  completedAt: timestamp('completed_at'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dashboardLayouts = mysqlTable('dashboard_layouts', {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  layoutData: text("layoutData").notNull(), // JSON string of grid layout
  widgetVisibility: text("widgetVisibility").notNull(), // JSON string of visible widgets
  dateRangePreset: varchar("dateRangePreset", { length: 50 }).default("last30days").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("dashboardLayouts_userId_idx").on(table.userId),
}));

export type DashboardLayout = typeof dashboardLayouts.$inferSelect;
export type InsertDashboardLayout = typeof dashboardLayouts.$inferInsert;

/**
 * Programs table - Represents different organizational programs
 * (e.g., Peer Support, Independent Living Skills Training, etc.)
 */
export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isActive: int("isActive").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index("programs_createdBy_idx").on(table.createdBy),
  isActiveIdx: index("programs_isActive_idx").on(table.isActive),
}));

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

/**
 * Pipeline stages - Custom stages for each program's onboarding process
 */
export const pipelineStages = mysqlTable("pipelineStages", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  order: int("order").notNull(), // Display order
  autoAdvance: int("autoAdvance").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  programIdIdx: index("pipelineStages_programId_idx").on(table.programId),
  orderIdx: index("pipelineStages_order_idx").on(table.order),
}));

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

/**
 * Stage requirements - Documents, training, or tasks required for each stage
 */
export const stageRequirements = mysqlTable("stageRequirements", {
  id: int("id").autoincrement().primaryKey(),
  stageId: int("stageId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["document", "training", "approval", "task"]).notNull(),
  isRequired: int("isRequired").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  stageIdIdx: index("stageRequirements_stageId_idx").on(table.stageId),
}));

export type StageRequirement = typeof stageRequirements.$inferSelect;
export type InsertStageRequirement = typeof stageRequirements.$inferInsert;

/**
 * Documents - Uploaded files for candidates/participants
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  requirementId: int("requirementId"), // Optional link to specific requirement
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 512 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // in bytes
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  candidateIdIdx: index("documents_candidateId_idx").on(table.candidateId),
  requirementIdIdx: index("documents_requirementId_idx").on(table.requirementId),
  statusIdx: index("documents_status_idx").on(table.status),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Participant progress - Tracks individuals through pipeline stages
 */
export const participantProgress = mysqlTable("participantProgress", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  programId: int("programId").notNull(),
  currentStageId: int("currentStageId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  status: mysqlEnum("status", ["active", "completed", "withdrawn", "on_hold"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  candidateIdIdx: index("participantProgress_candidateId_idx").on(table.candidateId),
  programIdIdx: index("participantProgress_programId_idx").on(table.programId),
  statusIdx: index("participantProgress_status_idx").on(table.status),
}));

export type ParticipantProgress = typeof participantProgress.$inferSelect;
export type InsertParticipantProgress = typeof participantProgress.$inferInsert;

/**
 * Requirement completion - Tracks completion of individual requirements
 */
export const requirementCompletions = mysqlTable("requirementCompletions", {
  id: int("id").autoincrement().primaryKey(),
  participantProgressId: int("participantProgressId").notNull(),
  requirementId: int("requirementId").notNull(),
  documentId: int("documentId"), // If requirement is document-based
  completedAt: timestamp("completedAt"),
  completedBy: int("completedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  participantProgressIdIdx: index("requirementCompletions_participantProgressId_idx").on(table.participantProgressId),
  requirementIdIdx: index("requirementCompletions_requirementId_idx").on(table.requirementId),
}));

export type RequirementCompletion = typeof requirementCompletions.$inferSelect;
export type InsertRequirementCompletion = typeof requirementCompletions.$inferInsert;

/**
 * Companies - Represents organizations using the platform
 */
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
  industry: varchar("industry", { length: 100 }),
  size: varchar("size", { length: 50 }), // e.g., "10-50", "51-200"
  website: varchar("website", { length: 255 }),
  createdBy: int("createdBy").notNull(), // User who created this company
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index("companies_createdBy_idx").on(table.createdBy),
}));

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Jobs table - represents open positions
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  companyId: int("companyId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  requirements: text("requirements"),
  location: varchar("location", { length: 255 }),
  employmentType: mysqlEnum("employmentType", ["full-time", "part-time", "contract", "internship"]).default("full-time").notNull(),
  salaryMin: int("salaryMin"),
  salaryMax: int("salaryMax"),
  status: mysqlEnum("status", ["draft", "open", "closed", "archived"]).default("draft").notNull(),
  postedAt: timestamp("postedAt"),
  closedAt: timestamp("closedAt"),
  // AI Scoring Custom Weights (0-100, default 33 for equal weighting)
  skillsWeight: int("skillsWeight").default(33).notNull(),
  experienceWeight: int("experienceWeight").default(33).notNull(),
  educationWeight: int("educationWeight").default(34).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  companyIdIdx: index("jobs_companyId_idx").on(table.companyId),
  statusIdx: index("jobs_status_idx").on(table.status),
  createdByIdx: index("jobs_createdBy_idx").on(table.createdBy),
  postedAtIdx: index("jobs_postedAt_idx").on(table.postedAt),
}));

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Candidates table - represents job applicants
 */
export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  jobId: int("jobId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  resumeUrl: varchar("resumeUrl", { length: 500 }),
  resumeText: text("resumeText"), // Parsed resume content for AI matching
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  portfolioUrl: varchar("portfolioUrl", { length: 500 }),
  coverLetter: text("coverLetter"),
  pipelineStage: mysqlEnum("pipelineStage", [
    "applied",
    "screening",
    "phone-screen",
    "interview",
    "technical",
    "offer",
    "hired",
    "rejected"
  ]).default("applied").notNull(),
  matchScore: int("matchScore"), // AI-generated match score (0-100)
  source: varchar("source", { length: 100 }), // e.g., "direct", "linkedin", "referral"
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  jobIdIdx: index("candidates_jobId_idx").on(table.jobId),
  emailIdx: index("candidates_email_idx").on(table.email),
  pipelineStageIdx: index("candidates_pipelineStage_idx").on(table.pipelineStage),
  matchScoreIdx: index("candidates_matchScore_idx").on(table.matchScore),
  appliedAtIdx: index("candidates_appliedAt_idx").on(table.appliedAt),
}));

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

/**
 * Notes table - team collaboration on candidates
 */
export const notes = mysqlTable("notes", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  isPrivate: int("isPrivate").default(0).notNull(), // Private notes only visible to author (0 = false, 1 = true)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  candidateIdIdx: index("notes_candidateId_idx").on(table.candidateId),
  userIdIdx: index("notes_userId_idx").on(table.userId),
}));

export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;

/**
 * Activities table - audit log of candidate interactions
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  userId: int("userId"), // null for system-generated activities
  activityType: mysqlEnum("activityType", [
    "applied",
    "stage-changed",
    "note-added",
    "email-sent",
    "interview-scheduled",
    "offer-sent",
    "hired",
    "rejected"
  ]).notNull(),
  description: text("description").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;
/**
 * Document Templates table - Reusable document templates for participants
 */
export const documentTemplates = mysqlTable("documentTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "tax-forms",
    "employment",
    "financial",
    "legal",
    "program-specific",
    "other"
  ]).notNull(),
  fileUrl: text("fileUrl").notNull(), // S3 URL to template file
  fileKey: text("fileKey").notNull(), // S3 key for file management
  fileSize: int("fileSize"), // File size in bytes
  mimeType: varchar("mimeType", { length: 100 }), // e.g., application/pdf
  isActive: int("isActive").default(1).notNull(),
  downloadCount: int("downloadCount").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("documentTemplates_category_idx").on(table.category),
  isActiveIdx: index("documentTemplates_isActive_idx").on(table.isActive),
  createdByIdx: index("documentTemplates_createdBy_idx").on(table.createdBy),
}));

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

/**
 * Calendar Providers table - Store user calendar integration credentials
 */
export const calendarProviders = mysqlTable("calendarProviders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerType: mysqlEnum("providerType", ["google", "outlook"]).notNull(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("calendarProviders_userId_idx").on(table.userId),
  providerTypeIdx: index("calendarProviders_providerType_idx").on(table.providerType),
}));

export type CalendarProvider = typeof calendarProviders.$inferSelect;
export type InsertCalendarProvider = typeof calendarProviders.$inferInsert;

/**
 * Calendar Events table - Track scheduled events
 */
export const calendarEvents = mysqlTable("calendarEvents", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  providerId: int("providerId").notNull(),
  externalEventId: varchar("externalEventId", { length: 255 }).notNull(), // ID from Google/Outlook
  eventType: mysqlEnum("eventType", [
    "appointment",
    "training",
    "deadline",
    "meeting",
    "other"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  location: text("location"),
  attendees: text("attendees"), // JSON array of email addresses
  participantId: int("participantId"), // Link to participant if applicable
  programId: int("programId"), // Link to program if applicable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("calendarEvents_userId_idx").on(table.userId),
  providerIdIdx: index("calendarEvents_providerId_idx").on(table.providerId),
  eventTypeIdx: index("calendarEvents_eventType_idx").on(table.eventType),
  startTimeIdx: index("calendarEvents_startTime_idx").on(table.startTime),
  participantIdIdx: index("calendarEvents_participantId_idx").on(table.participantId),
  programIdIdx: index("calendarEvents_programId_idx").on(table.programId),
}));

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Video Tutorials table - Onboarding and help videos
 */
export const videoTutorials = mysqlTable("videoTutorials", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "getting-started",
    "document-upload",
    "progress-tracking",
    "program-completion",
    "troubleshooting",
    "other"
  ]).notNull(),
  videoUrl: text("videoUrl").notNull(), // YouTube/Vimeo URL or S3 URL
  thumbnailUrl: text("thumbnailUrl"),
  duration: int("duration"), // Duration in seconds
  order: int("order").default(0).notNull(), // Display order
  isActive: int("isActive").default(1).notNull(),
  viewCount: int("viewCount").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("videoTutorials_category_idx").on(table.category),
  isActiveIdx: index("videoTutorials_isActive_idx").on(table.isActive),
  orderIdx: index("videoTutorials_order_idx").on(table.order),
}));

export type VideoTutorial = typeof videoTutorials.$inferSelect;
export type InsertVideoTutorial = typeof videoTutorials.$inferInsert;

/**
 * Video Progress table - Track user video watching progress
 */
export const videoProgress = mysqlTable("videoProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  watchedSeconds: int("watchedSeconds").default(0).notNull(),
  completed: int("completed").default(0).notNull(),
  lastWatchedAt: timestamp("lastWatchedAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("videoProgress_userId_idx").on(table.userId),
  videoIdIdx: index("videoProgress_videoId_idx").on(table.videoId),
  userVideoIdx: index("videoProgress_userId_videoId_idx").on(table.userId, table.videoId),
}));

export type VideoProgress = typeof videoProgress.$inferSelect;
export type InsertVideoProgress = typeof videoProgress.$inferInsert;

/**
 * Reference Checks table - Track reference check requests
 */
export const referenceChecks = mysqlTable("referenceChecks", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidateId").notNull(),
  referenceName: varchar("referenceName", { length: 255 }).notNull(),
  referenceEmail: varchar("referenceEmail", { length: 255 }).notNull(),
  referencePhone: varchar("referencePhone", { length: 50 }),
  relationship: varchar("relationship", { length: 100 }), // e.g., "Former Manager", "Colleague"
  company: varchar("company", { length: 255 }),
  status: mysqlEnum("status", ["pending", "sent", "completed", "expired"]).notNull().default("pending"),
  questionnaireId: int("questionnaireId"),
  responses: text("responses"), // JSON object of question-answer pairs
  overallRating: int("overallRating"), // 1-5 rating
  comments: text("comments"),
  sentAt: timestamp("sentAt"),
  completedAt: timestamp("completedAt"),
  expiresAt: timestamp("expiresAt"),
  reminderCount: int("reminderCount").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  candidateIdIdx: index("referenceChecks_candidateId_idx").on(table.candidateId),
  statusIdx: index("referenceChecks_status_idx").on(table.status),
  referenceEmailIdx: index("referenceChecks_referenceEmail_idx").on(table.referenceEmail),
}));

export type ReferenceCheck = typeof referenceChecks.$inferSelect;
export type InsertReferenceCheck = typeof referenceChecks.$inferInsert;

/**
 * Reference Questionnaires table - Customizable questionnaire templates
 */
export const referenceQuestionnaires = mysqlTable("referenceQuestionnaires", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  questions: text("questions").notNull(), // JSON array of question objects
  isActive: int("isActive").default(1).notNull(),
  isDefault: int("isDefault").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  isActiveIdx: index("referenceQuestionnaires_isActive_idx").on(table.isActive),
  isDefaultIdx: index("referenceQuestionnaires_isDefault_idx").on(table.isDefault),
}));

export type ReferenceQuestionnaire = typeof referenceQuestionnaires.$inferSelect;
export type InsertReferenceQuestionnaire = typeof referenceQuestionnaires.$inferInsert;

/**
 * User Activity Log table - Track user actions and login history
 */
export const userActivityLog = mysqlTable("userActivityLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "login", "logout", "view_document", "update_candidate"
  resource: varchar("resource", { length: 100 }), // e.g., "document", "candidate", "job"
  resourceId: int("resourceId"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  metadata: text("metadata"), // JSON object with additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userActivityLog_userId_idx").on(table.userId),
  actionIdx: index("userActivityLog_action_idx").on(table.action),
  resourceIdx: index("userActivityLog_resource_idx").on(table.resource),
  createdAtIdx: index("userActivityLog_createdAt_idx").on(table.createdAt),
}));

export type UserActivityLog = typeof userActivityLog.$inferSelect;
export type InsertUserActivityLog = typeof userActivityLog.$inferInsert;

/**
 * Audit Log table - Comprehensive audit trail for all CRUD operations
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }).notNull(),
  action: mysqlEnum("action", ["create", "update", "delete"]).notNull(),
  tableName: varchar("tableName", { length: 100 }).notNull(),
  recordId: int("recordId").notNull(),
  beforeSnapshot: text("beforeSnapshot"), // JSON snapshot before change
  afterSnapshot: text("afterSnapshot"), // JSON snapshot after change
  changes: text("changes"), // JSON object showing field-level changes
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("auditLog_userId_idx").on(table.userId),
  actionIdx: index("auditLog_action_idx").on(table.action),
  tableNameIdx: index("auditLog_tableName_idx").on(table.tableName),
  recordIdIdx: index("auditLog_recordId_idx").on(table.recordId),
  createdAtIdx: index("auditLog_createdAt_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

/**
 * Email Templates table - Customizable email templates
 */
export const emailTemplates = mysqlTable("emailTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["notification", "reminder", "reference_check", "compliance", "custom"]).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlBody: text("htmlBody").notNull(),
  textBody: text("textBody"),
  variables: text("variables"), // JSON array of available template variables
  isActive: int("isActive").default(1).notNull(),
  isDefault: int("isDefault").default(0).notNull(),
  version: int("version").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: index("emailTemplates_type_idx").on(table.type),
  isActiveIdx: index("emailTemplates_isActive_idx").on(table.isActive),
  isDefaultIdx: index("emailTemplates_isDefault_idx").on(table.isDefault),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;

/**
 * SMS Templates table - Customizable SMS templates
 */
export const smsTemplates = mysqlTable("smsTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: mysqlEnum("type", ["notification", "reminder", "reference_check", "custom"]).notNull(),
  body: varchar("body", { length: 1600 }).notNull(), // SMS max length
  variables: text("variables"), // JSON array of available template variables
  isActive: int("isActive").default(1).notNull(),
  isDefault: int("isDefault").default(0).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  typeIdx: index("smsTemplates_type_idx").on(table.type),
  isActiveIdx: index("smsTemplates_isActive_idx").on(table.isActive),
  isDefaultIdx: index("smsTemplates_isDefault_idx").on(table.isDefault),
}));

export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type InsertSmsTemplate = typeof smsTemplates.$inferInsert;

/**
 * Interview Recordings table - Store AI-analyzed interview recordings
 */
export const interviewRecordings = mysqlTable("interviewRecordings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  candidateId: varchar("candidateId", { length: 36 }).notNull(),
  interviewId: varchar("interviewId", { length: 36 }).notNull(),
  videoUrl: text("videoUrl").notNull(),
  transcription: text("transcription").notNull(),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]).notNull(),
  keyMoments: text("keyMoments").notNull(), // JSON array
  score: int("score").notNull(),
  strengths: text("strengths").notNull(), // JSON array
  concerns: text("concerns").notNull(), // JSON array
  processingTime: int("processingTime").notNull(), // milliseconds
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  candidateIdx: index("interviewRecordings_candidateId_idx").on(table.candidateId),
  interviewIdx: index("interviewRecordings_interviewId_idx").on(table.interviewId),
}));

export type InterviewRecording = typeof interviewRecordings.$inferSelect;
export type InsertInterviewRecording = typeof interviewRecordings.$inferInsert;

/**
 * Referrals table - Employee referral program
 */
export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  referralCode: varchar("referralCode", { length: 20 }).notNull().unique(),
  referrerId: int("referrerId").notNull().references(() => users.id),
  candidateId: int("candidateId").references(() => candidates.id),
  candidateName: varchar("candidateName", { length: 255 }).notNull(),
  candidateEmail: varchar("candidateEmail", { length: 320 }).notNull(),
  candidatePhone: varchar("candidatePhone", { length: 20 }),
  jobId: int("jobId").references(() => jobs.id),
  status: mysqlEnum("status", ["pending", "applied", "screening", "interview", "offer", "hired", "rejected"]).notNull().default("pending"),
  bonusAmount: int("bonusAmount").default(0),
  bonusPaid: int("bonusPaid").default(0),
  bonusPaidAt: timestamp("bonusPaidAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  referrerIdx: index("referrals_referrerId_idx").on(table.referrerId),
  candidateIdx: index("referrals_candidateId_idx").on(table.candidateId),
  statusIdx: index("referrals_status_idx").on(table.status),
  codeIdx: index("referrals_code_idx").on(table.referralCode),
}));

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;
