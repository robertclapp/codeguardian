/**
 * Standardized error messages for consistent user experience
 * and easier internationalization in the future
 */

export const ErrorMessages = {
  // Authentication & Authorization
  AUTH: {
    UNAUTHORIZED: "Please log in to access this resource",
    FORBIDDEN: "You don't have permission to perform this action",
    INVALID_CREDENTIALS: "Invalid email or password",
    SESSION_EXPIRED: "Your session has expired. Please log in again",
  },

  // Not Found Errors
  NOT_FOUND: {
    JOB: "The requested job posting could not be found",
    CANDIDATE: "The requested candidate could not be found",
    PROGRAM: "The requested program could not be found",
    PIPELINE_STAGE: "The requested pipeline stage could not be found",
    REQUIREMENT: "The requested requirement could not be found",
    DOCUMENT: "The requested document could not be found",
    COMPANY: "The requested organization could not be found",
    USER: "The requested user could not be found",
  },

  // Validation Errors
  VALIDATION: {
    REQUIRED_FIELD: (field: string) => `${field} is required`,
    INVALID_EMAIL: "Please provide a valid email address",
    INVALID_URL: "Please provide a valid URL",
    INVALID_PHONE: "Please provide a valid phone number",
    MIN_LENGTH: (field: string, min: number) =>
      `${field} must be at least ${min} characters`,
    MAX_LENGTH: (field: string, max: number) =>
      `${field} must not exceed ${max} characters`,
    INVALID_FORMAT: (field: string) => `${field} format is invalid`,
    INVALID_VALUE: (field: string, value: string) =>
      `Invalid value "${value}" for ${field}`,
  },

  // Business Logic Errors
  BUSINESS: {
    JOB_NOT_OPEN: "This job is not currently accepting applications",
    DUPLICATE_APPLICATION: "You have already applied to this position",
    STAGE_TRANSITION_INVALID: "Cannot move candidate to this stage",
    PROGRAM_HAS_PARTICIPANTS: "Cannot delete program with active participants",
    REQUIREMENT_NOT_MET: "Required conditions have not been met",
    FILE_TOO_LARGE: (maxSize: string) =>
      `File size exceeds maximum allowed size of ${maxSize}`,
    UNSUPPORTED_FILE_TYPE: (type: string) =>
      `File type "${type}" is not supported`,
  },

  // Rate Limiting
  RATE_LIMIT: {
    TOO_MANY_REQUESTS: "Too many requests. Please try again later",
    APPLICATION_LIMIT: "You have reached the maximum number of applications. Please try again in 15 minutes",
  },

  // Server Errors
  SERVER: {
    INTERNAL_ERROR: "An unexpected error occurred. Please try again",
    DATABASE_ERROR: "Database operation failed. Please try again",
    FILE_UPLOAD_ERROR: "File upload failed. Please try again",
    EXTERNAL_SERVICE_ERROR: "External service is temporarily unavailable",
  },
} as const;

/**
 * Error codes for programmatic error handling
 */
export const ErrorCodes = {
  // Authentication & Authorization (1000-1999)
  UNAUTHORIZED: 1001,
  FORBIDDEN: 1002,
  INVALID_CREDENTIALS: 1003,
  SESSION_EXPIRED: 1004,

  // Not Found (2000-2999)
  JOB_NOT_FOUND: 2001,
  CANDIDATE_NOT_FOUND: 2002,
  PROGRAM_NOT_FOUND: 2003,
  STAGE_NOT_FOUND: 2004,
  REQUIREMENT_NOT_FOUND: 2005,
  DOCUMENT_NOT_FOUND: 2006,

  // Validation (3000-3999)
  VALIDATION_ERROR: 3000,
  REQUIRED_FIELD: 3001,
  INVALID_EMAIL: 3002,
  INVALID_URL: 3003,
  INVALID_PHONE: 3004,

  // Business Logic (4000-4999)
  JOB_NOT_OPEN: 4001,
  DUPLICATE_APPLICATION: 4002,
  STAGE_TRANSITION_INVALID: 4003,
  PROGRAM_HAS_PARTICIPANTS: 4004,
  FILE_TOO_LARGE: 4005,
  UNSUPPORTED_FILE_TYPE: 4006,

  // Rate Limiting (5000-5999)
  RATE_LIMIT_EXCEEDED: 5001,

  // Server Errors (9000-9999)
  INTERNAL_ERROR: 9000,
  DATABASE_ERROR: 9001,
  FILE_UPLOAD_ERROR: 9002,
  EXTERNAL_SERVICE_ERROR: 9003,
} as const;

/**
 * Helper function to create consistent error objects
 */
export function createError(
  code: number,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}
