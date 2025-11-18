"""
Custom exceptions for CodeGuardian backend

Provides a hierarchy of exceptions for consistent error handling
throughout the application.
"""

from typing import Optional, Dict, Any


class CodeGuardianError(Exception):
    """Base exception for all CodeGuardian errors"""

    def __init__(
        self,
        message: str,
        error_code: str = "CODEGUARDIAN_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for API response"""
        return {
            'error_code': self.error_code,
            'message': self.message,
            'details': self.details
        }


class ValidationError(CodeGuardianError):
    """User input validation failed"""

    def __init__(self, message: str, field: Optional[str] = None, details: Optional[Dict] = None):
        error_code = "VALIDATION_ERROR"
        if field:
            details = details or {}
            details['field'] = field
        super().__init__(message, error_code, details)


class AuthenticationError(CodeGuardianError):
    """Authentication failed"""

    def __init__(self, message: str = "Authentication required", details: Optional[Dict] = None):
        super().__init__(message, "AUTHENTICATION_ERROR", details)


class AuthorizationError(CodeGuardianError):
    """User not authorized to perform action"""

    def __init__(self, message: str = "Permission denied", details: Optional[Dict] = None):
        super().__init__(message, "AUTHORIZATION_ERROR", details)


class NotFoundError(CodeGuardianError):
    """Requested resource not found"""

    def __init__(
        self,
        resource_type: str,
        resource_id: Optional[Any] = None,
        message: Optional[str] = None
    ):
        if not message:
            if resource_id:
                message = f"{resource_type} with ID {resource_id} not found"
            else:
                message = f"{resource_type} not found"

        details = {'resource_type': resource_type}
        if resource_id:
            details['resource_id'] = str(resource_id)

        super().__init__(message, "NOT_FOUND", details)


class ConflictError(CodeGuardianError):
    """Resource conflict (e.g., duplicate entry)"""

    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, "CONFLICT_ERROR", details)


class RateLimitError(CodeGuardianError):
    """Rate limit exceeded"""

    def __init__(self, retry_after: int, message: Optional[str] = None):
        if not message:
            message = f"Rate limit exceeded. Try again in {retry_after} seconds"
        details = {'retry_after': retry_after}
        super().__init__(message, "RATE_LIMIT_EXCEEDED", details)


class ExternalServiceError(CodeGuardianError):
    """External service (API, database) error"""

    def __init__(
        self,
        service_name: str,
        message: Optional[str] = None,
        original_error: Optional[Exception] = None
    ):
        if not message:
            message = f"External service '{service_name}' is unavailable"

        details = {'service': service_name}
        if original_error:
            details['original_error'] = str(original_error)

        super().__init__(message, "EXTERNAL_SERVICE_ERROR", details)


class DatabaseError(CodeGuardianError):
    """Database operation failed"""

    def __init__(self, message: str = "Database operation failed", details: Optional[Dict] = None):
        super().__init__(message, "DATABASE_ERROR", details)


class AIServiceError(CodeGuardianError):
    """AI service (OpenAI, etc.) error"""

    def __init__(
        self,
        message: str = "AI service error",
        model: Optional[str] = None,
        details: Optional[Dict] = None
    ):
        details = details or {}
        if model:
            details['model'] = model
        super().__init__(message, "AI_SERVICE_ERROR", details)


class ConfigurationError(CodeGuardianError):
    """Application configuration error"""

    def __init__(self, message: str, missing_vars: Optional[list] = None):
        details = {}
        if missing_vars:
            details['missing_variables'] = missing_vars
        super().__init__(message, "CONFIGURATION_ERROR", details)
