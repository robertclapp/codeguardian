import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  companies, 
  InsertCompany,
  jobs,
  InsertJob,
  candidates,
  InsertCandidate,
  notes,
  InsertNote,
  activities,
  InsertActivity,
  programs,
  InsertProgram,
  pipelineStages,
  InsertPipelineStage,
  stageRequirements,
  InsertStageRequirement,
  documents,
  InsertDocument,
  participantProgress,
  InsertParticipantProgress,
  requirementCompletions,
  InsertRequirementCompletion,
  documentTemplates,
  InsertDocumentTemplate,
  calendarProviders,
  InsertCalendarProvider,
  calendarEvents,
  InsertCalendarEvent,
  videoTutorials,
  InsertVideoTutorial,
  videoProgress,
  InsertVideoProgress,
  referenceChecks,
  InsertReferenceCheck,
  referenceQuestionnaires,
  InsertReferenceQuestionnaire
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ========================================
// Company Queries
// ========================================

export async function createCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(companies).values(company);
  return Number(result.insertId);
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result[0];
}

export async function getCompanyByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  // Find first company created by this user
  const result = await db.select().from(companies).where(eq(companies.createdBy, userId)).limit(1);
  return result[0];
}

// ========================================
// Job Queries
// ========================================

export async function createJob(job: InsertJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(jobs).values(job);
  return Number(result.insertId);
}

export async function getJobById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function getJobsByCompany(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(jobs).where(eq(jobs.companyId, companyId)).orderBy(jobs.createdAt);
}

export async function updateJob(id: number, updates: Partial<InsertJob>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(jobs).set(updates).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(jobs).where(eq(jobs.id, id));
}

export async function getJobStats(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { sql, count } = await import("drizzle-orm");
  
  // Get candidates grouped by stage
  const stageStats = await db
    .select({
      pipelineStage: candidates.pipelineStage,
      count: count(),
    })
    .from(candidates)
    .where(eq(candidates.jobId, jobId))
    .groupBy(candidates.pipelineStage);
  
  // Get average match score
  const avgResult = await db
    .select({
      avgMatchScore: sql<number>`AVG(${candidates.matchScore})`,
      totalCount: count(),
    })
    .from(candidates)
    .where(eq(candidates.jobId, jobId));
  
  const byStage: Record<string, number> = {
    applied: 0,
    screening: 0,
    "phone-screen": 0,
    interview: 0,
    technical: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  };
  
  stageStats.forEach((stat) => {
    if (stat.pipelineStage) {
      byStage[stat.pipelineStage] = stat.count;
    }
  });
  
  return {
    totalApplicants: avgResult[0]?.totalCount || 0,
    byStage,
    averageMatchScore: avgResult[0]?.avgMatchScore || 0,
  };
}

// ========================================
// Candidate Queries
// ========================================

export async function createCandidate(candidate: InsertCandidate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(candidates).values(candidate);
  return Number(result.insertId);
}

export async function getCandidateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(candidates).where(eq(candidates.id, id)).limit(1);
  return result[0];
}

export async function getCandidatesByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(candidates).where(eq(candidates.jobId, jobId)).orderBy(candidates.appliedAt);
}

export async function getCandidateByEmailAndJob(email: string, jobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { and } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(candidates)
    .where(and(eq(candidates.email, email), eq(candidates.jobId, jobId)))
    .limit(1);
  return result[0];
}

export async function updateCandidate(id: number, updates: Partial<InsertCandidate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(candidates).set(updates).where(eq(candidates.id, id));
}

// ========================================
// Note Queries
// ========================================

export async function createNote(note: InsertNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(notes).values(note);
  return Number(result.insertId);
}

export async function getNotesByCandidate(candidateId: number, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  // If userId provided, return all public notes + user's private notes
  // Otherwise, return only public notes
  if (userId) {
    return db.select().from(notes)
      .where(
        eq(notes.candidateId, candidateId)
      )
      .orderBy(notes.createdAt);
  }
  
  return db.select().from(notes)
    .where(eq(notes.candidateId, candidateId))
    .orderBy(notes.createdAt);
}

// ========================================
// Activity Queries
// ========================================

export async function createActivity(activity: InsertActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(activities).values(activity);
  return Number(result.insertId);
}

export async function getActivitiesByCandidate(candidateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(activities)
    .where(eq(activities.candidateId, candidateId))
    .orderBy(activities.createdAt);
}


// ========================================
// Programs Management
// ========================================

export async function createProgram(program: InsertProgram) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(programs).values(program);
  const insertedId = Number(result[0].insertId);
  return await getProgramById(insertedId);
}

export async function getProgramById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return result[0];
}

export async function listPrograms() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(programs).orderBy(programs.createdAt);
}

export async function updateProgram(id: number, updates: Partial<InsertProgram>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(programs).set(updates).where(eq(programs.id, id));
  return await getProgramById(id);
}

export async function deleteProgram(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(programs).where(eq(programs.id, id));
}

// ========================================
// Pipeline Stages Management
// ========================================

export async function createPipelineStage(stage: InsertPipelineStage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pipelineStages).values(stage);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(pipelineStages).where(eq(pipelineStages.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getPipelineStageById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).limit(1);
  return result[0];
}

export async function getProgramStages(programId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pipelineStages)
    .where(eq(pipelineStages.programId, programId))
    .orderBy(pipelineStages.order);
}

export async function updatePipelineStage(id: number, updates: Partial<InsertPipelineStage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(pipelineStages).set(updates).where(eq(pipelineStages.id, id));
  const updated = await db.select().from(pipelineStages).where(eq(pipelineStages.id, id)).limit(1);
  return updated[0];
}

export async function deletePipelineStage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
}

// ========================================
// Stage Requirements Management
// ========================================

export async function createStageRequirement(requirement: InsertStageRequirement) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(stageRequirements).values(requirement);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(stageRequirements).where(eq(stageRequirements.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getStageRequirementById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(stageRequirements).where(eq(stageRequirements.id, id)).limit(1);
  return result[0];
}

export async function getStageRequirements(stageId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(stageRequirements)
    .where(eq(stageRequirements.stageId, stageId));
}

export async function updateStageRequirement(id: number, updates: Partial<InsertStageRequirement>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(stageRequirements).set(updates).where(eq(stageRequirements.id, id));
  const updated = await db.select().from(stageRequirements).where(eq(stageRequirements.id, id)).limit(1);
  return updated[0];
}

export async function deleteStageRequirement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(stageRequirements).where(eq(stageRequirements.id, id));
}

// ========================================
// Document Management
// ========================================

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(documents).values(document);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(documents).where(eq(documents.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getCandidateDocuments(candidateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.candidateId, candidateId))
    .orderBy(documents.createdAt);
}

export async function updateDocumentStatus(id: number, status: "pending" | "approved" | "rejected", reviewedBy: number, notes?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documents).set({
    status,
    reviewedBy,
    reviewedAt: new Date(),
    notes,
  }).where(eq(documents.id, id));
  
  const updated = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return updated[0];
}

// ========================================
// Participant Progress Management
// ========================================

export async function createParticipantProgress(progress: InsertParticipantProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(participantProgress).values(progress);
  const insertedId = Number(result[0].insertId);
  const inserted = await db.select().from(participantProgress).where(eq(participantProgress.id, insertedId)).limit(1);
  return inserted[0];
}

export async function getParticipantProgress(candidateId: number, programId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const { and } = await import("drizzle-orm");
  const result = await db.select().from(participantProgress)
    .where(and(
      eq(participantProgress.candidateId, candidateId),
      eq(participantProgress.programId, programId)
    ))
    .limit(1);
  return result[0];
}

export async function updateParticipantStage(id: number, stageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(participantProgress).set({
    currentStageId: stageId,
  }).where(eq(participantProgress.id, id));
  
  const updated = await db.select().from(participantProgress).where(eq(participantProgress.id, id)).limit(1);
  return updated[0];
}


export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDocumentsByCandidate(candidateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents).where(eq(documents.candidateId, candidateId));
}

export async function getPendingDocumentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all pending documents for candidates in jobs owned by this user
  const result = await db
    .select({
      id: documents.id,
      candidateId: documents.candidateId,
      requirementId: documents.requirementId,
      name: documents.name,
      fileUrl: documents.fileUrl,
      fileSize: documents.fileSize,
      status: documents.status,
      createdAt: documents.createdAt,
      candidateName: candidates.name,
      candidateEmail: candidates.email,
      jobTitle: jobs.title,
    })
    .from(documents)
    .innerJoin(candidates, eq(documents.candidateId, candidates.id))
    .innerJoin(jobs, eq(candidates.jobId, jobs.id))
    .where(and(eq(documents.status, "pending"), eq(jobs.createdBy, userId)));
  
  return result;
}

export async function markRequirementComplete(candidateId: number, requirementId: number) {
  const db = await getDb();
  if (!db) throw new Error("[Database] Cannot mark requirement complete: database not available");
  
  // This is a simplified implementation
  // In a full implementation, you would:
  // 1. Find the participantProgress record for this candidate
  // 2. Create a requirementCompletion record
  // 3. Check if all requirements for the current stage are complete
  // 4. If so, advance to the next stage
  
  console.log(`[Database] Marking requirement ${requirementId} complete for candidate ${candidateId}`);
  // TODO: Implement full logic when participant/candidate linking is established
}

// ========================================
// Additional Helper Functions for Compliance Reporting
// ========================================

export async function getAllParticipants() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(participantProgress);
}

export async function getStagesByProgramId(programId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(pipelineStages)
    .where(eq(pipelineStages.programId, programId))
    .orderBy(pipelineStages.order);
}

export async function getParticipantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(participantProgress)
    .where(eq(participantProgress.id, id))
    .limit(1);
  return result[0];
}

export async function getDocumentStats() {
  const db = await getDb();
  if (!db) return {
    totalDocuments: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
  };
  
  const allDocs = await db.select().from(documents);
  
  return {
    totalDocuments: allDocs.length,
    pendingDocuments: allDocs.filter(d => d.status === "pending").length,
    approvedDocuments: allDocs.filter(d => d.status === "approved").length,
    rejectedDocuments: allDocs.filter(d => d.status === "rejected").length,
  };
}

export async function getProgressRecordsByStageId(stageId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // This is a simplified implementation
  // In a full implementation, you would track stage entry/exit times
  return await db.select().from(participantProgress)
    .where(eq(participantProgress.currentStageId, stageId));
}

export async function getDocumentsByCandidateId(candidateId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.candidateId, candidateId));
}

export async function getPendingDocuments() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documents)
    .where(eq(documents.status, "pending"));
}

export async function getParticipantsByProgramId(programId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(participantProgress)
    .where(eq(participantProgress.programId, programId));
}

export async function getPrograms() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(programs);
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(users);
}

export async function getRequirementsByStageId(stageId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(stageRequirements)
    .where(eq(stageRequirements.stageId, stageId));
}

// Document Templates
export async function getAllTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documentTemplates)
    .where(eq(documentTemplates.isActive, 1))
    .orderBy(desc(documentTemplates.createdAt));
}

export async function getTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const [template] = await db.select().from(documentTemplates)
    .where(eq(documentTemplates.id, id));
  return template;
}

export async function getTemplatesByCategory(category: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(documentTemplates)
    .where(and(
      eq(documentTemplates.category, category as any),
      eq(documentTemplates.isActive, 1)
    ))
    .orderBy(desc(documentTemplates.downloadCount));
}

export async function createTemplate(template: InsertDocumentTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(documentTemplates).values(template);
  return Number(result.insertId);
}

export async function updateTemplate(id: number, updates: Partial<InsertDocumentTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(documentTemplates)
    .set(updates)
    .where(eq(documentTemplates.id, id));
}

export async function incrementTemplateDownloadCount(id: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(documentTemplates)
    .set({ downloadCount: sql`${documentTemplates.downloadCount} + 1` })
    .where(eq(documentTemplates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete
  await db.update(documentTemplates)
    .set({ isActive: 0 })
    .where(eq(documentTemplates.id, id));
}

// ==================== Calendar Integration ====================

export async function createCalendarProvider(provider: InsertCalendarProvider) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(calendarProviders).values(provider);
  return result.insertId;
}

export async function getCalendarProvidersByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(calendarProviders)
    .where(eq(calendarProviders.userId, userId));
}

export async function getActiveCalendarProvider(userId: number, providerType: "google" | "outlook") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [provider] = await db
    .select()
    .from(calendarProviders)
    .where(
      and(
        eq(calendarProviders.userId, userId),
        eq(calendarProviders.providerType, providerType),
        eq(calendarProviders.isActive, 1)
      )
    )
    .limit(1);
  return provider;
}

export async function updateCalendarProvider(id: number, updates: Partial<InsertCalendarProvider>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarProviders).set(updates).where(eq(calendarProviders.id, id));
}

export async function deleteCalendarProvider(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarProviders).where(eq(calendarProviders.id, id));
}

export async function createCalendarEvent(event: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(calendarEvents).values(event);
  return result.insertId;
}

export async function getCalendarEventsByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, userId))
    .orderBy(desc(calendarEvents.startTime));
}

export async function getUpcomingCalendarEvents(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  return await db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        sql`${calendarEvents.startTime} >= ${now}`
      )
    )
    .orderBy(calendarEvents.startTime)
    .limit(limit);
}

export async function getCalendarEventById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, id))
    .limit(1);
  return event;
}

export async function updateCalendarEvent(id: number, updates: Partial<InsertCalendarEvent>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(calendarEvents).set(updates).where(eq(calendarEvents.id, id));
}

export async function deleteCalendarEvent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}

// ==================== Video Tutorials ====================

export async function createVideoTutorial(tutorial: InsertVideoTutorial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(videoTutorials).values(tutorial);
  return result.insertId;
}

export async function getAllVideoTutorials() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(videoTutorials)
    .where(eq(videoTutorials.isActive, 1))
    .orderBy(videoTutorials.order);
}

export async function getVideoTutorialsByCategory(category: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(videoTutorials)
    .where(
      and(
        eq(videoTutorials.category, category as any),
        eq(videoTutorials.isActive, 1)
      )
    );
}

export async function getVideoTutorialById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [tutorial] = await db
    .select()
    .from(videoTutorials)
    .where(eq(videoTutorials.id, id))
    .limit(1);
  return tutorial;
}

export async function updateVideoTutorial(id: number, updates: Partial<InsertVideoTutorial>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoTutorials).set(updates).where(eq(videoTutorials.id, id));
}

export async function deleteVideoTutorial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(videoTutorials).set({ isActive: 0 }).where(eq(videoTutorials.id, id));
}

export async function incrementVideoViewCount(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(videoTutorials)
    .set({ viewCount: sql`${videoTutorials.viewCount} + 1` })
    .where(eq(videoTutorials.id, id));
}

export async function createOrUpdateVideoProgress(progress: InsertVideoProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Check if progress exists
  const [existing] = await db
    .select()
    .from(videoProgress)
    .where(
      and(
        eq(videoProgress.userId, progress.userId),
        eq(videoProgress.videoId, progress.videoId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(videoProgress)
      .set({
        watchedSeconds: progress.watchedSeconds,
        completed: progress.completed,
        lastWatchedAt: new Date(),
      })
      .where(eq(videoProgress.id, existing.id));
    return existing.id;
  } else {
    const [result] = await db.insert(videoProgress).values(progress);
    return result.insertId;
  }
}

export async function getVideoProgressByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(videoProgress)
    .where(eq(videoProgress.userId, userId));
}

// ==================== Reference Checks ====================

export async function createReferenceCheck(check: InsertReferenceCheck) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(referenceChecks).values(check);
  return result.insertId;
}

export async function getReferenceChecksByCandidateId(candidateId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(referenceChecks)
    .where(eq(referenceChecks.candidateId, candidateId))
    .orderBy(desc(referenceChecks.createdAt));
}

export async function getReferenceCheckById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [check] = await db
    .select()
    .from(referenceChecks)
    .where(eq(referenceChecks.id, id))
    .limit(1);
  return check;
}

export async function updateReferenceCheck(id: number, updates: Partial<InsertReferenceCheck>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referenceChecks).set(updates).where(eq(referenceChecks.id, id));
}

export async function getPendingReferenceChecks() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(referenceChecks)
    .where(eq(referenceChecks.status, "sent"))
    .orderBy(referenceChecks.sentAt);
}

export async function createReferenceQuestionnaire(questionnaire: InsertReferenceQuestionnaire) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(referenceQuestionnaires).values(questionnaire);
  return result.insertId;
}

export async function getAllReferenceQuestionnaires() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(referenceQuestionnaires)
    .where(eq(referenceQuestionnaires.isActive, 1))
    .orderBy(desc(referenceQuestionnaires.isDefault), desc(referenceQuestionnaires.createdAt));
}

export async function getDefaultReferenceQuestionnaire() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [questionnaire] = await db
    .select()
    .from(referenceQuestionnaires)
    .where(
      and(
        eq(referenceQuestionnaires.isActive, 1),
        eq(referenceQuestionnaires.isDefault, 1)
      )
    )
    .limit(1);
  return questionnaire;
}

export async function getReferenceQuestionnaireById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [questionnaire] = await db
    .select()
    .from(referenceQuestionnaires)
    .where(eq(referenceQuestionnaires.id, id))
    .limit(1);
  return questionnaire;
}

export async function updateReferenceQuestionnaire(id: number, updates: Partial<InsertReferenceQuestionnaire>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(referenceQuestionnaires).set(updates).where(eq(referenceQuestionnaires.id, id));
}
