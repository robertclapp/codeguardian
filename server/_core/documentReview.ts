import { invokeLLM } from "./llm";

/**
 * AI-powered document review service
 * Parses resumes, validates documents, and provides confidence scores
 */

export interface ResumeParseResult {
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    year: string;
  }>;
  contactInfo: {
    email?: string;
    phone?: string;
    location?: string;
  };
  summary: string;
  confidence: number; // 0-1 score
}

export interface DocumentValidationResult {
  isValid: boolean;
  confidence: number; // 0-1 score
  issues: string[];
  suggestions: string[];
  autoApprove: boolean;
}

/**
 * Parse resume using AI
 */
export async function parseResume(resumeText: string): Promise<ResumeParseResult> {
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert resume parser. Extract structured information from resumes accurately.",
      },
      {
        role: "user",
        content: `Parse the following resume and extract structured information:\n\n${resumeText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "resume_parse",
        strict: true,
        schema: {
          type: "object",
          properties: {
            skills: {
              type: "array",
              items: { type: "string" },
              description: "List of technical and soft skills",
            },
            experience: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  company: { type: "string" },
                  title: { type: "string" },
                  duration: { type: "string" },
                  description: { type: "string" },
                },
                required: ["company", "title", "duration", "description"],
                additionalProperties: false,
              },
            },
            education: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  institution: { type: "string" },
                  degree: { type: "string" },
                  field: { type: "string" },
                  year: { type: "string" },
                },
                required: ["institution", "degree", "field", "year"],
                additionalProperties: false,
              },
            },
            contactInfo: {
              type: "object",
              properties: {
                email: { type: "string" },
                phone: { type: "string" },
                location: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
            summary: {
              type: "string",
              description: "Brief professional summary",
            },
            confidence: {
              type: "number",
              description: "Confidence score 0-1 for the parsing quality",
            },
          },
          required: ["skills", "experience", "education", "contactInfo", "summary", "confidence"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from LLM");
  }

  return JSON.parse(content);
}

/**
 * Validate document using AI
 */
export async function validateDocument(
  documentType: string,
  documentText: string,
  requirements?: string[]
): Promise<DocumentValidationResult> {
  const requirementsText = requirements?.length
    ? `\n\nRequired elements: ${requirements.join(", ")}`
    : "";

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are a document validation expert. Assess documents for completeness and quality.",
      },
      {
        role: "user",
        content: `Validate this ${documentType} document and check for issues:${requirementsText}\n\n${documentText}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "document_validation",
        strict: true,
        schema: {
          type: "object",
          properties: {
            isValid: {
              type: "boolean",
              description: "Whether the document meets basic requirements",
            },
            confidence: {
              type: "number",
              description: "Confidence score 0-1 for the validation",
            },
            issues: {
              type: "array",
              items: { type: "string" },
              description: "List of issues found",
            },
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "Suggestions for improvement",
            },
            autoApprove: {
              type: "boolean",
              description: "Whether this document can be auto-approved",
            },
          },
          required: ["isValid", "confidence", "issues", "suggestions", "autoApprove"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from LLM");
  }

  return JSON.parse(content);
}

/**
 * Extract text from PDF buffer (simplified - in production use pdf-parse)
 */
export function extractTextFromPDF(buffer: Buffer): string {
  // TODO: Implement actual PDF text extraction
  // For now, return placeholder
  return buffer.toString("utf-8");
}
