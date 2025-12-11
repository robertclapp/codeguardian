import * as db from "../db";
import { sql } from "drizzle-orm";

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity score (0-100)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
}

export interface SearchResult {
  type: "participant" | "document" | "job" | "program";
  id: number;
  title: string;
  description: string;
  relevance: number;
  data: any;
}

/**
 * Search participants with fuzzy matching
 */
export async function searchParticipants(query: string, limit: number = 20): Promise<SearchResult[]> {
  const allCandidates = await db.getAllCandidates();
  const results: SearchResult[] = [];

  for (const candidate of allCandidates) {
    const nameScore = calculateSimilarity(query, candidate.name || "");
    const emailScore = candidate.email ? calculateSimilarity(query, candidate.email) : 0;
    const phoneScore = candidate.phone ? calculateSimilarity(query, candidate.phone) : 0;
    
    const maxScore = Math.max(nameScore, emailScore, phoneScore);

    if (maxScore > 30) { // Threshold for relevance
      results.push({
        type: "participant",
        id: candidate.id,
        title: candidate.name || "Unknown",
        description: `${candidate.email || ""} | ${candidate.phone || ""}`,
        relevance: maxScore,
        data: candidate,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Search documents with fuzzy matching
 */
export async function searchDocuments(query: string, limit: number = 20): Promise<SearchResult[]> {
  const allDocuments = await db.getDocuments();
  const results: SearchResult[] = [];

  for (const doc of allDocuments) {
    const nameScore = doc.name ? calculateSimilarity(query, doc.name) : 0;
    const mimeTypeScore = doc.mimeType ? calculateSimilarity(query, doc.mimeType) : 0;
    
    const maxScore = Math.max(nameScore, mimeTypeScore);

    if (maxScore > 30) {
      const candidate = doc.candidateId ? await db.getCandidateById(doc.candidateId) : null;
      
      results.push({
        type: "document",
        id: doc.id,
        title: doc.name || "Untitled Document",
        description: `Status: ${doc.status} | Uploaded by: ${candidate?.name || "Unknown"}`,
        relevance: maxScore,
        data: doc,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Search jobs with fuzzy matching
 */
export async function searchJobs(query: string, limit: number = 20): Promise<SearchResult[]> {
  const allJobs = await db.getAllJobs();
  const results: SearchResult[] = [];

  for (const job of allJobs) {
    const titleScore = job.title ? calculateSimilarity(query, job.title) : 0;
    const locationScore = job.location ? calculateSimilarity(query, job.location) : 0;
    const descriptionScore = job.description ? calculateSimilarity(query, job.description) : 0;
    
    const maxScore = Math.max(titleScore, locationScore, descriptionScore * 0.5); // Description has lower weight

    if (maxScore > 30) {
      results.push({
        type: "job",
        id: job.id,
        title: job.title || "Untitled Job",
        description: `${job.location || ""} | ${job.employmentType || ""}`,
        relevance: maxScore,
        data: job,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Search programs with fuzzy matching
 */
export async function searchPrograms(query: string, limit: number = 20): Promise<SearchResult[]> {
  const allPrograms = await db.getPrograms();
  const results: SearchResult[] = [];

  for (const program of allPrograms) {
    const nameScore = program.name ? calculateSimilarity(query, program.name) : 0;
    const descriptionScore = program.description ? calculateSimilarity(query, program.description) : 0;
    
    const maxScore = Math.max(nameScore, descriptionScore * 0.5);

    if (maxScore > 30) {
      results.push({
        type: "program",
        id: program.id,
        title: program.name || "Untitled Program",
        description: program.description || "",
        relevance: maxScore,
        data: program,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Unified search across all entities
 */
export async function unifiedSearch(query: string, limit: number = 50): Promise<SearchResult[]> {
  const [participants, documents, jobs, programs] = await Promise.all([
    searchParticipants(query, limit),
    searchDocuments(query, limit),
    searchJobs(query, limit),
    searchPrograms(query, limit),
  ]);

  const allResults = [...participants, ...documents, ...jobs, ...programs];

  return allResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}

/**
 * Get autocomplete suggestions
 */
export async function getAutocompleteSuggestions(query: string, limit: number = 10): Promise<string[]> {
  const results = await unifiedSearch(query, limit);
  return results.map(r => r.title);
}
