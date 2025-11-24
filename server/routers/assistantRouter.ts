import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

/**
 * AI Assistant router
 * Provides conversational AI support for platform users
 */
export const assistantRouter = router({
  /**
   * Chat with the AI assistant
   * Provides context-aware help and guidance
   */
  chat: protectedProcedure
    .input(
      z.object({
        message: z.string().min(1, "Message is required"),
        context: z
          .object({
            currentPage: z.string().optional(),
            jobId: z.number().optional(),
            candidateId: z.number().optional(),
          })
          .optional(),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Build context from the current state
        let contextInfo = "";

        if (input.context?.jobId) {
          const job = await db.getJobById(input.context.jobId);
          if (job) {
            const candidates = await db.getCandidatesByJob(job.id);
            contextInfo += `\n\nCurrent Job Context:\n- Title: ${job.title}\n- Status: ${job.status}\n- Total Applicants: ${candidates.length}`;
          }
        }

        if (input.context?.candidateId) {
          const candidate = await db.getCandidateById(input.context.candidateId);
          if (candidate) {
            contextInfo += `\n\nCurrent Candidate Context:\n- Name: ${candidate.name}\n- Stage: ${candidate.pipelineStage}\n- Match Score: ${candidate.matchScore || "Not calculated"}`;
          }
        }

        const systemPrompt = `You are a helpful AI assistant for an HR recruitment platform. Your role is to:

1. **Help users navigate the platform** - Guide them through features and workflows
2. **Answer questions about recruiting** - Provide best practices and advice
3. **Troubleshoot issues** - Help resolve problems they encounter
4. **Explain features** - Describe how to use various platform capabilities
5. **Provide insights** - Offer data-driven recommendations

Platform Features:
- Job Management: Create, edit, and manage job postings
- Candidate Pipeline: Track applicants through hiring stages (Applied → Screening → Phone Screen → Interview → Technical → Offer → Hired)
- AI-Powered Matching: Automatically score candidates based on job requirements
- Smart Job Descriptions: Generate optimized job descriptions with AI
- Team Collaboration: Add notes and collaborate on candidate evaluations
- Analytics: View hiring metrics and insights

Key Differentiators (vs JazzHR/BambooHR):
- 24/7 AI support (you!) that actually solves problems
- Instant setup (no 2-month implementation)
- AI-powered candidate matching to reduce unqualified applicants
- 99.9% uptime reliability
- Transparent pricing with no hidden fees

Be concise, friendly, and action-oriented. If you don't know something specific about the platform, be honest and suggest contacting support for technical issues.

${contextInfo}`;

        // Build conversation messages
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
        ];

        // Add conversation history if provided (limit to last 10 messages)
        if (input.conversationHistory && input.conversationHistory.length > 0) {
          const recentHistory = input.conversationHistory.slice(-10);
          messages.push(...recentHistory);
        }

        // Add current user message
        messages.push({ role: "user", content: input.message });

        const response = await invokeLLM({
          messages,
        });

        const assistantMessage = response.choices[0]?.message?.content;
        const messageStr = typeof assistantMessage === 'string' ? assistantMessage : "I'm sorry, I couldn't process that request. Please try again.";

        return {
          message: messageStr,
          success: true,
        };
      } catch (error) {
        console.error("Error in AI assistant chat:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "I'm having trouble responding right now. Please try again in a moment.",
        });
      }
    }),

  /**
   * Get suggested questions based on current context
   */
  getSuggestedQuestions: protectedProcedure
    .input(
      z.object({
        currentPage: z.string().optional(),
        jobId: z.number().optional(),
        candidateId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      // Return context-appropriate suggested questions
      const suggestions: string[] = [];

      if (input.currentPage === "jobs") {
        suggestions.push(
          "How do I create a new job posting?",
          "What makes a good job description?",
          "How can I improve my job posting to attract better candidates?"
        );
      } else if (input.currentPage === "candidates" && input.jobId) {
        suggestions.push(
          "How does the AI matching score work?",
          "What are the best practices for screening candidates?",
          "How do I move candidates through the pipeline?"
        );
      } else if (input.candidateId) {
        suggestions.push(
          "What should I look for in this candidate's profile?",
          "How do I schedule an interview?",
          "What questions should I ask in the interview?"
        );
      } else {
        suggestions.push(
          "How do I get started with the platform?",
          "What are the key features I should know about?",
          "How can AI help me hire better candidates?"
        );
      }

      return { suggestions };
    }),

  /**
   * Get quick help for a specific feature
   */
  getFeatureHelp: protectedProcedure
    .input(
      z.object({
        feature: z.enum([
          "job-creation",
          "candidate-pipeline",
          "ai-matching",
          "job-description-generator",
          "team-collaboration",
          "analytics",
        ]),
      })
    )
    .query(async ({ input }) => {
      const helpContent: Record<string, { title: string; description: string; steps: string[] }> = {
        "job-creation": {
          title: "Creating a Job Posting",
          description: "Post a new position and start receiving applications.",
          steps: [
            "Navigate to the Jobs page",
            "Click 'Create New Job'",
            "Fill in the job title and basic details",
            "Use the AI Job Description Generator for a professional description",
            "Set the status to 'Open' when ready to publish",
            "Share the job link with candidates or post to job boards",
          ],
        },
        "candidate-pipeline": {
          title: "Managing Your Candidate Pipeline",
          description: "Track applicants through each stage of your hiring process.",
          steps: [
            "View all candidates for a job on the job detail page",
            "Drag and drop candidates between stages (or use the stage dropdown)",
            "Stages: Applied → Screening → Phone Screen → Interview → Technical → Offer → Hired",
            "Add notes to document your evaluation",
            "Use the match score to prioritize top candidates",
            "Rejected candidates are moved to a separate view",
          ],
        },
        "ai-matching": {
          title: "AI-Powered Candidate Matching",
          description: "Automatically score candidates based on job requirements.",
          steps: [
            "The AI analyzes each candidate's resume against your job description",
            "Match scores range from 0-100 (higher is better)",
            "Scores consider skills, experience, education, and cultural fit",
            "Click 'Calculate Match Scores' to score all candidates at once",
            "Review the AI's reasoning for each score",
            "Use scores to prioritize your review, but always apply human judgment",
          ],
        },
        "job-description-generator": {
          title: "Smart Job Description Generator",
          description: "Create compelling job descriptions with AI assistance.",
          steps: [
            "When creating or editing a job, click 'Generate with AI'",
            "Provide the job title and key requirements",
            "The AI will create a structured, optimized description",
            "Review and edit the generated content",
            "The description includes: overview, responsibilities, qualifications, and benefits",
            "Descriptions are optimized for SEO and ATS compatibility",
          ],
        },
        "team-collaboration": {
          title: "Team Collaboration Features",
          description: "Work together to evaluate candidates effectively.",
          steps: [
            "Add notes to any candidate profile",
            "Mark notes as 'Private' (only you can see) or 'Team' (everyone can see)",
            "Use @mentions to notify team members (coming soon)",
            "View activity history to see all interactions with a candidate",
            "Share candidate profiles with hiring managers",
          ],
        },
        analytics: {
          title: "Hiring Analytics & Insights",
          description: "Track your recruiting performance with data.",
          steps: [
            "View key metrics on your dashboard",
            "Track: Total applicants, time-to-hire, candidates by stage",
            "See average match scores to gauge candidate quality",
            "Identify bottlenecks in your hiring process",
            "Export data for deeper analysis (coming soon)",
          ],
        },
      };

      const help = helpContent[input.feature];

      if (!help) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Help content not found for this feature",
        });
      }

      return help;
    }),
});
