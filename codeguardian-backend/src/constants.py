"""
Application constants and configuration values for CodeGuardian

Centralizes magic numbers and configuration constants to avoid
hardcoding values throughout the codebase.
"""

from enum import Enum
from typing import Set


class AuthConfig:
    """Authentication configuration constants"""
    JWT_EXPIRATION_HOURS = 24
    JWT_ALGORITHM = 'HS256'
    TOKEN_REFRESH_THRESHOLD_HOURS = 1
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_MINUTES = 30
    PASSWORD_MIN_LENGTH = 8
    PASSWORD_MAX_LENGTH = 128


class PaginationConfig:
    """Pagination configuration constants"""
    DEFAULT_PAGE = 1
    DEFAULT_PER_PAGE = 20
    MAX_PER_PAGE = 100
    MIN_PER_PAGE = 1


class ReviewConfig:
    """Review-related configuration constants"""
    DEFAULT_OVERALL_SCORE = 85.0
    DEFAULT_SECURITY_SCORE = 90.0
    DEFAULT_PERFORMANCE_SCORE = 80.0
    DEFAULT_MAINTAINABILITY_SCORE = 88.0
    MAX_CODE_SIZE_BYTES = 1_000_000  # 1MB
    MIN_CODE_SIZE_CHARS = 10
    STATS_DEFAULT_DAYS = 30
    MAX_STATS_DAYS = 365


class ServiceConfig:
    """External service configuration constants"""
    MCP_TIMEOUT_SECONDS = 10
    API_REQUEST_TIMEOUT_SECONDS = 30
    DATABASE_QUERY_TIMEOUT_SECONDS = 60
    GITHUB_API_TIMEOUT_SECONDS = 10
    OPENAI_API_TIMEOUT_SECONDS = 60


class FileConfig:
    """File upload and processing constants"""
    MAX_UPLOAD_SIZE_BYTES = 16 * 1024 * 1024  # 16MB
    ALLOWED_CODE_EXTENSIONS = {
        'py', 'js', 'ts', 'jsx', 'tsx', 'java', 'cpp', 'c', 'h',
        'cs', 'php', 'rb', 'go', 'rs', 'kt', 'swift', 'scala', 'dart'
    }


class Platform(str, Enum):
    """Supported repository platforms"""
    GITHUB = 'github'
    GITLAB = 'gitlab'
    BITBUCKET = 'bitbucket'


class ReviewStatus(str, Enum):
    """Review status values"""
    PENDING = 'pending'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    FAILED = 'failed'


class PullRequestState(str, Enum):
    """Pull request state values"""
    OPEN = 'open'
    CLOSED = 'closed'
    MERGED = 'merged'


class PlanType(str, Enum):
    """Subscription plan types"""
    FREE = 'free'
    PRO = 'pro'
    ENTERPRISE = 'enterprise'


class DifficultyLevel(str, Enum):
    """Mentorship session difficulty levels"""
    BEGINNER = 'beginner'
    INTERMEDIATE = 'intermediate'
    ADVANCED = 'advanced'


class AIModel(str, Enum):
    """Supported AI models"""
    GPT4_MINI = 'gpt-4.1-mini'
    GPT4_NANO = 'gpt-4.1-nano'
    GEMINI_FLASH = 'gemini-2.5-flash'


# Supported programming languages
SUPPORTED_LANGUAGES: Set[str] = {
    'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
    'csharp', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin',
    'scala', 'dart', 'r', 'shell', 'sql', 'html', 'css'
}

# Severity levels for review comments
SEVERITY_LEVELS: Set[str] = {'low', 'medium', 'high', 'critical'}

# Review categories
REVIEW_CATEGORIES: Set[str] = {
    'security', 'performance', 'maintainability', 'style',
    'best_practice', 'bug', 'documentation'
}

# HTTP Headers
class Headers:
    """Common HTTP header names"""
    AUTHORIZATION = 'Authorization'
    CONTENT_TYPE = 'Content-Type'
    CSRF_TOKEN = 'X-CSRF-Token'
    RATE_LIMIT = 'X-RateLimit-Limit'
    RATE_LIMIT_REMAINING = 'X-RateLimit-Remaining'
    RATE_LIMIT_RESET = 'X-RateLimit-Reset'


# Error codes
class ErrorCodes:
    """Standardized error codes"""
    VALIDATION_ERROR = 'VALIDATION_ERROR'
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR'
    NOT_FOUND = 'NOT_FOUND'
    CONFLICT = 'CONFLICT'
    RATE_LIMITED = 'RATE_LIMITED'
    INTERNAL_ERROR = 'INTERNAL_ERROR'
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
    AI_SERVICE_ERROR = 'AI_SERVICE_ERROR'
    DATABASE_ERROR = 'DATABASE_ERROR'
