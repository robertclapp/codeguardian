/**
 * Bulk Participant Import Service
 * 
 * Handles CSV import of multiple participants with validation
 */

import * as db from "../db";

export interface ParticipantImportRow {
  name: string;
  email: string;
  phone?: string;
  programId: number;
  jobId?: number;
  startDate?: string;
}

export interface ImportResult {
  success: boolean;
  row: number;
  data?: ParticipantImportRow;
  participantId?: number;
  candidateId?: number;
  error?: string;
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

/**
 * Validate a single participant row
 */
function validateRow(row: any, rowNumber: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!row.name || typeof row.name !== "string" || row.name.trim() === "") {
    errors.push("Name is required");
  }

  if (!row.email || typeof row.email !== "string" || row.email.trim() === "") {
    errors.push("Email is required");
  } else {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(row.email)) {
      errors.push("Invalid email format");
    }
  }

  if (!row.programId) {
    errors.push("Program ID is required");
  } else if (isNaN(parseInt(row.programId))) {
    errors.push("Program ID must be a number");
  }

  // Optional fields validation
  if (row.phone && typeof row.phone !== "string") {
    errors.push("Phone must be a string");
  }

  if (row.jobId && isNaN(parseInt(row.jobId))) {
    errors.push("Job ID must be a number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse CSV content into participant rows
 */
export function parseCSV(csvContent: string): ParticipantImportRow[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row");
  }

  // Parse header
  const header = lines[0].split(",").map(h => h.trim().toLowerCase());
  
  // Map header indices
  const nameIdx = header.indexOf("name");
  const emailIdx = header.indexOf("email");
  const phoneIdx = header.indexOf("phone");
  const programIdIdx = header.indexOf("programid") >= 0 ? header.indexOf("programid") : header.indexOf("program_id");
  const jobIdIdx = header.indexOf("jobid") >= 0 ? header.indexOf("jobid") : header.indexOf("job_id");
  const startDateIdx = header.indexOf("startdate") >= 0 ? header.indexOf("startdate") : header.indexOf("start_date");

  if (nameIdx === -1 || emailIdx === -1 || programIdIdx === -1) {
    throw new Error("CSV must have columns: name, email, programId (or program_id)");
  }

  // Parse data rows
  const participants: ParticipantImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines

    const values = line.split(",").map(v => v.trim());
    
    const participant: ParticipantImportRow = {
      name: values[nameIdx] || "",
      email: values[emailIdx] || "",
      programId: parseInt(values[programIdIdx]) || 0,
    };

    if (phoneIdx >= 0 && values[phoneIdx]) {
      participant.phone = values[phoneIdx];
    }

    if (jobIdIdx >= 0 && values[jobIdIdx]) {
      participant.jobId = parseInt(values[jobIdIdx]);
    }

    if (startDateIdx >= 0 && values[startDateIdx]) {
      participant.startDate = values[startDateIdx];
    }

    participants.push(participant);
  }

  return participants;
}

/**
 * Import a single participant
 */
async function importParticipant(row: ParticipantImportRow): Promise<{ candidateId: number; participantId: number }> {
  // Check if program exists
  const program = await db.getProgramById(row.programId);
  if (!program) {
    throw new Error(`Program with ID ${row.programId} not found`);
  }

  // Get or create job
  let jobId: number = row.jobId || 0;
  if (!jobId) {
    // Create a default job for this program
    const defaultJobId = await db.createJob({
      title: `${program.name} - Imported Participants`,
      description: "Auto-created job for bulk import",
      companyId: 1, // Default company
      status: "open",
      createdBy: 1, // System user
    });
    jobId = defaultJobId;
  }

  // Check if candidate already exists by email
  const existingCandidates = await db.getCandidatesByJob(jobId!);
  let candidate = existingCandidates.find((c: any) => c.email.toLowerCase() === row.email.toLowerCase());

  if (!candidate) {
    // Create new candidate
    const newCandidateId = await db.createCandidate({
      jobId,
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      resumeUrl: null,
      resumeText: null,
      linkedinUrl: null,
      portfolioUrl: null,
      pipelineStage: "applied",
      matchScore: null,
    });
    candidate = await db.getCandidateById(newCandidateId);
  }

  if (!candidate) {
    throw new Error("Failed to create or retrieve candidate");
  }

  // Check if participant progress already exists
  const existingProgress = await db.getParticipantProgress(candidate.id, row.programId);
  if (existingProgress) {
    throw new Error(`Participant already enrolled in this program`);
  }

  // Get first stage of program
  const stages = await db.getStagesByProgramId(row.programId);
  if (stages.length === 0) {
    throw new Error(`Program ${row.programId} has no stages configured`);
  }
  const firstStage = stages.sort((a, b) => a.order - b.order)[0];

  // Create participant progress
  const startDate = row.startDate ? new Date(row.startDate) : new Date();
  const participant = await db.createParticipantProgress({
    candidateId: candidate.id,
    programId: row.programId,
    currentStageId: firstStage.id,
    startedAt: startDate,
    completedAt: null,
    status: "active",
  });

  return {
    candidateId: candidate.id,
    participantId: participant.id,
  };
}

/**
 * Import multiple participants from CSV
 */
export async function importParticipants(csvContent: string): Promise<ImportSummary> {
  const summary: ImportSummary = {
    total: 0,
    successful: 0,
    failed: 0,
    results: [],
  };

  try {
    // Parse CSV
    const participants = parseCSV(csvContent);
    summary.total = participants.length;

    // Import each participant
    for (let i = 0; i < participants.length; i++) {
      const row = participants[i];
      const rowNumber = i + 2; // +2 because row 1 is header, array is 0-indexed

      // Validate row
      const validation = validateRow(row, rowNumber);
      if (!validation.valid) {
        summary.failed++;
        summary.results.push({
          success: false,
          row: rowNumber,
          data: row,
          error: validation.errors.join(", "),
        });
        continue;
      }

      // Import participant
      try {
        const { candidateId, participantId } = await importParticipant(row);
        summary.successful++;
        summary.results.push({
          success: true,
          row: rowNumber,
          data: row,
          candidateId,
          participantId,
        });
      } catch (error: any) {
        summary.failed++;
        summary.results.push({
          success: false,
          row: rowNumber,
          data: row,
          error: error.message || "Unknown error",
        });
      }
    }

    return summary;
  } catch (error: any) {
    throw new Error(`CSV parsing error: ${error.message}`);
  }
}

/**
 * Generate CSV template
 */
export function generateCSVTemplate(): string {
  const header = "name,email,phone,programId,jobId,startDate";
  const example = "John Doe,john@example.com,555-0100,1,1,2024-01-15";
  const example2 = "Jane Smith,jane@example.com,555-0101,1,,2024-01-20";
  
  return `${header}\n${example}\n${example2}`;
}
