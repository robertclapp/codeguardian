import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { ErrorMessages } from "../errors";
import { requireAuthorization } from "../authorization";
import { sanitizeRichText, validateId } from "../validation";

/**
 * AI-powered features router
 * Handles job description generation, candidate matching, and AI insights
 */
export const aiRouter = router({
  /**
   * Generate a job description using AI
   * Takes basic job info and creates a compelling, optimized description
   */
  generateJobDescription: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200, "Job title is required"),
        requirements: z.string().max(2000).optional(),
        location: z.string().max(200).optional(),
        employmentType: z.enum(["full-time", "part-time", "contract", "internship"]).optional(),
        companyInfo: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Sanitize all inputs
        const sanitizedTitle = sanitizeRichText(input.title);
        const sanitizedRequirements = input.requirements ? sanitizeRichText(input.requirements) : undefined;
        const sanitizedLocation = input.location ? sanitizeRichText(input.location) : undefined;
        const sanitizedCompanyInfo = input.companyInfo ? sanitizeRichText(input.companyInfo) : undefined;

        const systemPrompt = `You are an expert HR professional and copywriter specializing in creating compelling job descriptions. Your job descriptions:
- Are clear, concise, and engaging
- Use inclusive language that appeals to diverse candidates
- Highlight key responsibilities and requirements
- Include company culture and benefits when provided
- Are optimized for applicant tracking systems (ATS)
- Follow best practices for job posting SEO
- Avoid jargon and corporate speak
- Are structured with clear sections`;

        const userPrompt = `Create a professional job description for the following position:

Job Title: ${sanitizedTitle}
${sanitizedRequirements ? `Requirements/Skills: ${sanitizedRequirements}` : ""}
${sanitizedLocation ? `Location: ${sanitizedLocation}` : ""}
${input.employmentType ? `Employment Type: ${input.employmentType}` : ""}
${sanitizedCompanyInfo ? `Company Information: ${sanitizedCompanyInfo}` : ""}

Generate a complete job description with the following sections:
1. Job Overview (2-3 sentences)
2. Key Responsibilities (5-7 bullet points)
3. Required Qualifications
4. Preferred Qualifications (if applicable)
5. What We Offer (benefits, culture, growth opportunities)

Format the output in markdown for easy reading.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const generatedDescription = response.choices[0]?.message?.content || "";

        return {
          description: generatedDescription,
          success: true,
        };
      } catch (error) {
        console.error("Error generating job description:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate job description. Please try again.",
        });
      }
    }),

  /**
   * Calculate match score for a single candidate
   * Uses AI to analyze resume text against job requirements
   */
  calculateMatchScore: protectedProcedure
    .input(
      z.object({
        candidateId: z.number().positive(),
        jobId: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.candidateId, "Candidate ID");
        validateId(input.jobId, "Job ID");

        // Get candidate and job details
        const candidate = await db.getCandidateById(input.candidateId);
        const job = await db.getJobById(input.jobId);

        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.CANDIDATE,
          });
        }

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        // Verify user has access to this job
        requireAuthorization(ctx.user, job.createdBy, "job");

        // If no resume text, return low score
        if (!candidate.resumeText && !candidate.coverLetter) {
          await db.updateCandidate(input.candidateId, { matchScore: 30 });
          return { matchScore: 30, reasoning: "No resume or cover letter provided" };
        }

        const systemPrompt = `You are an expert recruiter analyzing candidate fit for job positions. Analyze the candidate's qualifications against the job requirements and provide:
1. A match score from 0-100 (where 100 is a perfect match)
2. Brief reasoning for the score

Consider:
- Relevant skills and experience
- Education and certifications
- Career progression
- Cultural fit indicators
- Gaps or red flags

Be objective and fair in your assessment.`;

        const userPrompt = `Job Title: ${job.title}

Job Description:
${job.description}

${job.requirements ? `Requirements:\n${job.requirements}` : ""}

Candidate: ${candidate.name}
${candidate.resumeText ? `Resume:\n${candidate.resumeText}` : ""}
${candidate.coverLetter ? `Cover Letter:\n${candidate.coverLetter}` : ""}

Provide your assessment in JSON format:
{
  "matchScore": <number 0-100>,
  "reasoning": "<brief explanation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "concerns": ["<concern 1>", "<concern 2>"]
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "candidate_assessment",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  matchScore: {
                    type: "number",
                    description: "Match score from 0-100",
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of the score",
                  },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key strengths of the candidate",
                  },
                  concerns: {
                    type: "array",
                    items: { type: "string" },
                    description: "Potential concerns or gaps",
                  },
                },
                required: ["matchScore", "reasoning", "strengths", "concerns"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content;
        const contentStr = typeof content === 'string' ? content : '{}';
        const assessment = JSON.parse(contentStr);

        // Update candidate with match score
        await db.updateCandidate(input.candidateId, {
          matchScore: Math.round(assessment.matchScore),
        });

        return assessment;
      } catch (error) {
        console.error("Error calculating match score:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate match score. Please try again.",
        });
      }
    }),

  /**
   * Batch calculate match scores for all candidates in a job
   */
  batchCalculateMatchScores: protectedProcedure
    .input(z.object({ jobId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.jobId, "Job ID");

        const job = await db.getJobById(input.jobId);

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        // Verify user has access to this job
        requireAuthorization(ctx.user, job.createdBy, "job");

        const candidates = await db.getCandidatesByJob(input.jobId);

        // Process candidates in batches to avoid rate limits
        const results = [];
        for (const candidate of candidates) {
          try {
            // Skip if already has a match score
            if (candidate.matchScore !== null) {
              results.push({
                candidateId: candidate.id,
                matchScore: candidate.matchScore,
                skipped: true,
              });
              continue;
            }

            // Calculate match score
            if (!candidate.resumeText && !candidate.coverLetter) {
              await db.updateCandidate(candidate.id, { matchScore: 30 });
              results.push({
                candidateId: candidate.id,
                matchScore: 30,
                skipped: false,
              });
              continue;
            }

            const systemPrompt = `You are an expert recruiter. Analyze this candidate against the job requirements and return ONLY a match score from 0-100 as a single number.`;

            const userPrompt = `Job: ${job.title}
Requirements: ${job.description}

Candidate: ${candidate.name}
${candidate.resumeText || candidate.coverLetter || "No details provided"}

Return only the match score number (0-100):`;

            const response = await invokeLLM({
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
            });

            const scoreText = response.choices[0]?.message?.content;
            const scoreStr = typeof scoreText === 'string' ? scoreText : '50';
            const matchScore = Math.min(100, Math.max(0, parseInt(scoreStr.replace(/\D/g, "")) || 50));

            await db.updateCandidate(candidate.id, { matchScore });

            results.push({
              candidateId: candidate.id,
              matchScore,
              skipped: false,
            });
          } catch (error) {
            console.error(`Error processing candidate ${candidate.id}:`, error);
            results.push({
              candidateId: candidate.id,
              error: "Failed to calculate score",
              skipped: false,
            });
          }
        }

        return {
          success: true,
          processed: results.length,
          results,
        };
      } catch (error) {
        console.error("Error in batch calculation:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process batch calculation. Please try again.",
        });
      }
    }),

  /**
   * Get AI-powered insights for a candidate
   */
  getCandidateInsights: protectedProcedure
    .input(z.object({ candidateId: z.number().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        validateId(input.candidateId, "Candidate ID");

        const candidate = await db.getCandidateById(input.candidateId);

        if (!candidate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.CANDIDATE,
          });
        }

        const job = await db.getJobById(candidate.jobId);

        if (!job) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: ErrorMessages.NOT_FOUND.JOB,
          });
        }

        // Verify user has access to this job
        requireAuthorization(ctx.user, job.createdBy, "job");

        const systemPrompt = `You are an expert recruiter providing insights on candidates. Be concise, actionable, and objective.`;

        const userPrompt = `Provide quick insights for this candidate:

Job: ${job.title}
Candidate: ${candidate.name}
${candidate.resumeText ? `Resume: ${candidate.resumeText.substring(0, 1000)}...` : ""}

Provide:
1. Top 3 strengths (one sentence each)
2. Top 2 concerns or questions (one sentence each)
3. Recommended next steps

Keep it brief and actionable.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const insights = response.choices[0]?.message?.content || "";

        return {
          insights,
          success: true,
        };
      } catch (error) {
        console.error("Error getting candidate insights:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate insights. Please try again.",
        });
      }
    }),
});
