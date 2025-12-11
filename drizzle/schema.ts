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
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

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
