import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
});

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
});

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
});

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
});

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
});

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
});

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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
});

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
});

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
});

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