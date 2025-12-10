/**
 * Input validation and sanitization utilities
 * Provides defense-in-depth security for user inputs
 */

import DOMPurify from "isomorphic-dompurify";

/**
 * Validate that a value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    Number.isFinite(value)
  );
}

/**
 * Validate that a value is a non-negative integer (includes 0)
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isFinite(value)
  );
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all HTML tags and dangerous content
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content
  });
}

/**
 * Sanitize text input (allows basic formatting)
 * Use for rich text fields like job descriptions
 */
export function sanitizeRichText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  // Basic email regex (Zod handles full validation)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error("Invalid email format");
  }
  return trimmed;
}

/**
 * Validate and sanitize phone number
 * Removes all non-digit characters except + at the start
 */
export function sanitizePhone(phone: string): string {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  // Ensure + is only at the start
  if (cleaned.includes("+") && !cleaned.startsWith("+")) {
    throw new Error("Invalid phone number format");
  }
  return cleaned;
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    return parsed.toString();
  } catch {
    throw new Error("Invalid URL format");
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  sizeInBytes: number,
  maxSizeInMB: number
): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return sizeInBytes <= maxSizeInBytes;
}

/**
 * Comprehensive file upload validation
 */
export function validateFileUpload(
  sizeInBytes: number,
  mimeType: string
): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  if (!validateFileSize(sizeInBytes, MAX_FILE_SIZES.DOCUMENT)) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZES.DOCUMENT}MB`,
    };
  }

  // Check file type
  if (!validateFileType(mimeType, ALLOWED_DOCUMENT_TYPES)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not supported`,
    };
  }

  return { valid: true };
}

/**
 * Validate file type
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.includes(mimeType);
}

/**
 * Allowed file types for resumes
 */
export const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

/**
 * Allowed file types for general documents
 */
export const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_RESUME_TYPES,
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

/**
 * Maximum file sizes (in MB)
 */
export const MAX_FILE_SIZES = {
  RESUME: 5, // 5MB
  DOCUMENT: 10, // 10MB
  IMAGE: 5, // 5MB
};

/**
 * Validate database ID parameter
 * Throws error if invalid
 */
export function validateId(id: unknown, fieldName: string = "ID"): number {
  if (!isPositiveInteger(id)) {
    throw new Error(`Invalid ${fieldName}: must be a positive integer`);
  }
  return id;
}

/**
 * Validate array of IDs
 */
export function validateIds(
  ids: unknown[],
  fieldName: string = "IDs"
): number[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error(`${fieldName} must be a non-empty array`);
  }
  return ids.map((id, index) =>
    validateId(id, `${fieldName}[${index}]`)
  );
}

/**
 * Sanitize candidate application data
 */
export function sanitizeCandidateApplication(data: {
  name: string;
  email: string;
  phone?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  coverLetter?: string;
}) {
  return {
    name: sanitizeHtml(data.name),
    email: sanitizeEmail(data.email),
    phone: data.phone ? sanitizePhone(data.phone) : undefined,
    linkedinUrl: data.linkedinUrl ? sanitizeUrl(data.linkedinUrl) : undefined,
    portfolioUrl: data.portfolioUrl ? sanitizeUrl(data.portfolioUrl) : undefined,
    coverLetter: data.coverLetter ? sanitizeHtml(data.coverLetter) : undefined,
  };
}

/**
 * Sanitize job posting data
 */
export function sanitizeJobData(data: {
  title: string;
  description: string;
  requirements?: string;
  location?: string;
}) {
  return {
    title: sanitizeHtml(data.title),
    description: sanitizeRichText(data.description),
    requirements: data.requirements ? sanitizeRichText(data.requirements) : undefined,
    location: data.location ? sanitizeHtml(data.location) : undefined,
  };
}

/**
 * Sanitize program data
 */
export function sanitizeProgramData(data: {
  name: string;
  description?: string;
}) {
  return {
    name: sanitizeHtml(data.name),
    description: data.description ? sanitizeRichText(data.description) : undefined,
  };
}
