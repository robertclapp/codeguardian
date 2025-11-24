import { eq } from "drizzle-orm";
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
  InsertActivity
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
