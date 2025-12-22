import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { candidates, jobs } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

/**
 * Skills Gap Analysis Router
 * AI-powered skills matching and development tracking
 */
export const skillsGapRouter = router({
  /**
   * Analyze skills gap for a candidate
   */
  analyzeCandidateSkills: protectedProcedure
    .input(
      z.object({
        candidateId: z.number(),
        jobId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const candidate = await db.query.candidates.findFirst({
        where: eq(candidates.id, input.candidateId),
      });

      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
      });

      if (!candidate || !job) {
        throw new Error("Candidate or job not found");
      }

      // Use AI to analyze skills gap
      const analysis = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are an expert HR analyst specializing in skills gap analysis. Analyze the candidate's skills against job requirements and provide detailed insights.",
          },
          {
            role: "user",
            content: `
Candidate Skills: ${candidate.skills || "Not specified"}
Job Requirements: ${job.requirements}
Job Title: ${job.title}

Analyze:
1. Which required skills does the candidate have?
2. Which required skills are missing?
3. What is the overall match percentage?
4. What training or development would close the gaps?
5. Are there any transferable skills?
`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "skills_gap_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                matchPercentage: {
                  type: "number",
                  description: "Overall match percentage (0-100)",
                },
                matchingSkills: {
                  type: "array",
                  items: { type: "string" },
                  description: "Skills the candidate has",
                },
                missingSkills: {
                  type: "array",
                  items: { type: "string" },
                  description: "Required skills the candidate lacks",
                },
                transferableSkills: {
                  type: "array",
                  items: { type: "string" },
                  description: "Skills that can be adapted to the role",
                },
                trainingRecommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      skill: { type: "string" },
                      priority: { type: "string", enum: ["high", "medium", "low"] },
                      estimatedTime: { type: "string" },
                      resources: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                    required: ["skill", "priority", "estimatedTime", "resources"],
                    additionalProperties: false,
                  },
                },
                overallAssessment: {
                  type: "string",
                  description: "Summary of the skills gap analysis",
                },
              },
              required: [
                "matchPercentage",
                "matchingSkills",
                "missingSkills",
                "transferableSkills",
                "trainingRecommendations",
                "overallAssessment",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const result = JSON.parse(analysis.choices[0].message.content || "{}");

      return {
        candidateId: input.candidateId,
        jobId: input.jobId,
        candidateName: candidate.name,
        jobTitle: job.title,
        ...result,
      };
    }),

  /**
   * Get organization-wide skills gap analysis
   */
  getOrganizationSkillsGap: protectedProcedure.query(async () => {
    // Get all active jobs
    const activeJobs = await db.query.jobs.findMany({
      where: eq(jobs.status, "open"),
      limit: 50,
    });

    // Get all candidates
    const allCandidates = await db.query.candidates.findMany({
      limit: 100,
    });

    // Extract all required skills from jobs
    const requiredSkills = new Map<string, number>();
    activeJobs.forEach((job) => {
      const skills = extractSkillsFromText(job.requirements);
      skills.forEach((skill) => {
        requiredSkills.set(skill, (requiredSkills.get(skill) || 0) + 1);
      });
    });

    // Extract all available skills from candidates
    const availableSkills = new Map<string, number>();
    allCandidates.forEach((candidate) => {
      const skills = extractSkillsFromText(candidate.skills || "");
      skills.forEach((skill) => {
        availableSkills.set(skill, (availableSkills.get(skill) || 0) + 1);
      });
    });

    // Calculate gaps
    const skillsGap = Array.from(requiredSkills.entries()).map(([skill, required]) => {
      const available = availableSkills.get(skill) || 0;
      const gap = Math.max(0, required - available);
      const coverage = required > 0 ? (available / required) * 100 : 0;

      return {
        skill,
        required,
        available,
        gap,
        coverage: Math.round(coverage),
        priority: gap > 3 ? "high" : gap > 1 ? "medium" : "low",
      };
    });

    // Sort by gap size
    skillsGap.sort((a, b) => b.gap - a.gap);

    return {
      totalRequiredSkills: requiredSkills.size,
      totalAvailableSkills: availableSkills.size,
      skillsGap: skillsGap.slice(0, 20), // Top 20 gaps
      averageCoverage:
        skillsGap.reduce((sum, s) => sum + s.coverage, 0) / skillsGap.length || 0,
    };
  }),

  /**
   * Find internal candidates for a role
   */
  findInternalCandidates: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        minMatchPercentage: z.number().default(60),
      })
    )
    .query(async ({ input }) => {
      const job = await db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
      });

      if (!job) {
        throw new Error("Job not found");
      }

      const allCandidates = await db.query.candidates.findMany({
        limit: 100,
      });

      // Use AI to match candidates
      const matches = await Promise.all(
        allCandidates.slice(0, 10).map(async (candidate) => {
          try {
            const analysis = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: "You are an expert at matching candidates to job requirements.",
                },
                {
                  role: "user",
                  content: `
Job: ${job.title}
Requirements: ${job.requirements}
Candidate: ${candidate.name}
Skills: ${candidate.skills || "Not specified"}
Experience: ${candidate.experience || "Not specified"}

Calculate match percentage (0-100) and explain why.
`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "candidate_match",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      matchPercentage: { type: "number" },
                      strengths: {
                        type: "array",
                        items: { type: "string" },
                      },
                      gaps: {
                        type: "array",
                        items: { type: "string" },
                      },
                      recommendation: { type: "string" },
                    },
                    required: ["matchPercentage", "strengths", "gaps", "recommendation"],
                    additionalProperties: false,
                  },
                },
              },
            });

            const result = JSON.parse(analysis.choices[0].message.content || "{}");

            return {
              candidate,
              ...result,
            };
          } catch (error) {
            return null;
          }
        })
      );

      // Filter and sort by match percentage
      const validMatches = matches
        .filter((m) => m && m.matchPercentage >= input.minMatchPercentage)
        .sort((a, b) => (b?.matchPercentage || 0) - (a?.matchPercentage || 0));

      return validMatches;
    }),

  /**
   * Track skill development over time
   */
  getSkillDevelopmentTrends: protectedProcedure.query(async () => {
    // Mock data for demonstration
    // In production, this would track actual skill assessments over time
    const trends = [
      {
        skill: "JavaScript",
        timeline: [
          { month: "Jan", proficiency: 65 },
          { month: "Feb", proficiency: 70 },
          { month: "Mar", proficiency: 75 },
          { month: "Apr", proficiency: 80 },
          { month: "May", proficiency: 85 },
          { month: "Jun", proficiency: 88 },
        ],
      },
      {
        skill: "Python",
        timeline: [
          { month: "Jan", proficiency: 50 },
          { month: "Feb", proficiency: 55 },
          { month: "Mar", proficiency: 62 },
          { month: "Apr", proficiency: 68 },
          { month: "May", proficiency: 72 },
          { month: "Jun", proficiency: 78 },
        ],
      },
      {
        skill: "Project Management",
        timeline: [
          { month: "Jan", proficiency: 70 },
          { month: "Feb", proficiency: 72 },
          { month: "Mar", proficiency: 74 },
          { month: "Apr", proficiency: 76 },
          { month: "May", proficiency: 78 },
          { month: "Jun", proficiency: 80 },
        ],
      },
    ];

    return trends;
  }),
});

/**
 * Extract skills from text using simple keyword matching
 * In production, use NLP/AI for better extraction
 */
function extractSkillsFromText(text: string): string[] {
  const commonSkills = [
    "JavaScript",
    "Python",
    "Java",
    "React",
    "Node.js",
    "SQL",
    "AWS",
    "Docker",
    "Kubernetes",
    "Git",
    "TypeScript",
    "MongoDB",
    "PostgreSQL",
    "GraphQL",
    "REST API",
    "Agile",
    "Scrum",
    "Project Management",
    "Leadership",
    "Communication",
    "Problem Solving",
    "Data Analysis",
    "Machine Learning",
    "DevOps",
    "CI/CD",
  ];

  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  commonSkills.forEach((skill) => {
    if (lowerText.includes(skill.toLowerCase())) {
      found.add(skill);
    }
  });

  return Array.from(found);
}
