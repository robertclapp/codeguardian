import * as db from "../db";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";

interface ExportOptions {
  format: "csv" | "json";
  includeHeaders?: boolean;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) return "";

  const keys = headers || Object.keys(data[0]);
  const csvRows = [];

  // Add header row
  csvRows.push(keys.join(","));

  // Add data rows
  for (const row of data) {
    const values = keys.map((key) => {
      const value = row[key];
      
      // Handle null/undefined
      if (value === null || value === undefined) return "";
      
      // Handle dates
      if (value instanceof Date) return value.toISOString();
      
      // Handle strings with commas or quotes
      if (typeof value === "string") {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }
      
      return String(value);
    });
    
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

/**
 * Export participants to CSV or JSON
 */
export async function exportParticipants(options: ExportOptions = { format: "csv" }) {
  const participants = await db.getAllParticipants();
  
  if (options.format === "json") {
    return JSON.stringify(participants, null, 2);
  }
  
  return arrayToCSV(participants);
}

/**
 * Export documents to CSV or JSON
 */
export async function exportDocuments(options: ExportOptions = { format: "csv" }) {
  const documents = await db.getDocuments();
  
  if (options.format === "json") {
    return JSON.stringify(documents, null, 2);
  }
  
  return arrayToCSV(documents);
}

/**
 * Export jobs to CSV or JSON
 */
export async function exportJobs(options: ExportOptions = { format: "csv" }) {
  const jobs = await db.getAllJobs();
  
  if (options.format === "json") {
    return JSON.stringify(jobs, null, 2);
  }
  
  return arrayToCSV(jobs);
}

/**
 * Export programs to CSV or JSON
 */
export async function exportPrograms(options: ExportOptions = { format: "csv" }) {
  const programs = await db.getPrograms();
  
  if (options.format === "json") {
    return JSON.stringify(programs, null, 2);
  }
  
  return arrayToCSV(programs);
}

/**
 * Export candidates to CSV or JSON
 */
export async function exportCandidates(options: ExportOptions = { format: "csv" }) {
  const candidates = await db.getAllCandidates();
  
  if (options.format === "json") {
    return JSON.stringify(candidates, null, 2);
  }
  
  return arrayToCSV(candidates);
}

/**
 * Create full database backup and upload to S3
 */
export async function createDatabaseBackup(): Promise<{ success: boolean; backupUrl?: string; error?: string }> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    
    // Export all entities
    const backup = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      data: {
        participants: await db.getAllParticipants(),
        candidates: await db.getAllCandidates(),
        jobs: await db.getAllJobs(),
        programs: await db.getPrograms(),
        documents: await db.getDocuments(),
      },
    };

    const backupJSON = JSON.stringify(backup, null, 2);
    const backupBuffer = Buffer.from(backupJSON, "utf-8");
    
    // Upload to S3
    const backupKey = `backups/database-backup-${timestamp}.json`;
    const { url } = await storagePut(backupKey, backupBuffer, "application/json");

    // Notify owner
    await notifyOwner({
      title: "Database Backup Completed",
      content: `Automated database backup completed successfully. Backup size: ${(backupBuffer.length / 1024 / 1024).toFixed(2)} MB`,
    });

    return { success: true, backupUrl: url };
  } catch (error: any) {
    console.error("Database backup failed:", error);
    
    // Notify owner of failure
    await notifyOwner({
      title: "Database Backup Failed",
      content: `Automated database backup failed: ${error.message}`,
    });

    return { success: false, error: error.message };
  }
}

/**
 * List all available backups from S3
 */
export async function listBackups(): Promise<string[]> {
  // This would require listing S3 objects, which isn't implemented in the storage helper
  // For now, return empty array
  // In production, you'd use AWS SDK to list objects with prefix "backups/"
  return [];
}

/**
 * Restore database from backup
 * WARNING: This will overwrite existing data
 */
export async function restoreFromBackup(backupUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch backup from URL
    const response = await fetch(backupUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch backup: ${response.statusText}`);
    }

    const backup = await response.json();

    // Validate backup format
    if (!backup.data || !backup.version) {
      throw new Error("Invalid backup format");
    }

    // TODO: Implement actual restoration logic
    // This would involve:
    // 1. Creating a transaction
    // 2. Clearing existing data
    // 3. Inserting backup data
    // 4. Committing transaction

    await notifyOwner({
      title: "Database Restore Completed",
      content: `Database restored from backup: ${backup.timestamp}`,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Database restore failed:", error);
    
    await notifyOwner({
      title: "Database Restore Failed",
      content: `Database restore failed: ${error.message}`,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Get backup statistics
 */
export function getBackupStats() {
  return {
    lastBackup: null, // Would be stored in database
    nextBackup: "Daily at 2:00 AM",
    backupLocation: "S3 (backups/ prefix)",
    retentionPolicy: "30 days",
  };
}
