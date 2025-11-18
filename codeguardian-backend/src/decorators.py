"""
Decorators for CodeGuardian backend

Provides reusable decorators for routes including error handling,
validation, and logging.
"""

import logging
import time
import uuid
from functools import wraps
from typing import Callable

from flask import request, g

from src.exceptions import (
    CodeGuardianError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    ExternalServiceError
)
from src.responses import APIResponse

logger = logging.getLogger(__name__)


def handle_errors(f: Callable) -> Callable:
    """
    Decorator for consistent error handling in routes.

    Catches exceptions and returns standardized error responses.
    Logs errors for monitoring and debugging.

    Usage:
        @app.route('/endpoint')
        @handle_errors
        def endpoint():
            return APIResponse.success({'data': 'value'})
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)

        except ValidationError as e:
            logger.warning(
                f"Validation error in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code, 'details': e.details}
            )
            return APIResponse.validation_error(
                e.message,
                e.details.get('field'),
                e.details
            )

        except AuthenticationError as e:
            logger.warning(
                f"Authentication error in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code}
            )
            return APIResponse.unauthorized(e.message)

        except AuthorizationError as e:
            logger.warning(
                f"Authorization error in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code}
            )
            return APIResponse.forbidden(e.message)

        except NotFoundError as e:
            logger.info(
                f"Resource not found in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code, 'details': e.details}
            )
            return APIResponse.not_found(
                e.details.get('resource_type', 'Resource'),
                e.details.get('resource_id')
            )

        except RateLimitError as e:
            logger.warning(
                f"Rate limit exceeded in {f.__name__}",
                extra={'retry_after': e.details.get('retry_after')}
            )
            return APIResponse.rate_limited(e.details.get('retry_after', 60))

        except ExternalServiceError as e:
            logger.error(
                f"External service error in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code, 'details': e.details}
            )
            return APIResponse.service_unavailable(
                e.details.get('service', 'external service')
            )

        except CodeGuardianError as e:
            # Catch any other custom exceptions
            logger.error(
                f"Application error in {f.__name__}: {e.message}",
                extra={'error_code': e.error_code, 'details': e.details}
            )
            return APIResponse.error(
                e.message,
                e.error_code,
                e.details,
                500
            )

        except Exception as e:
            # Generate error ID for tracking
            error_id = str(uuid.uuid4())[:8]

            logger.exception(
                f"Unexpected error in {f.__name__}: {str(e)}",
                extra={'error_id': error_id}
            )

            return APIResponse.internal_error(
                "An unexpected error occurred",
                error_id
            )

    return decorated_function


def log_request(f: Callable) -> Callable:
    """
    Decorator to log request details.

    Logs method, path, user, and timing information.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        request_id = str(uuid.uuid4())[:8]

        # Store request ID in g for access throughout request
        g.request_id = request_id

        # Log request start
        user_info = "anonymous"
        if hasattr(request, 'current_user') and request.current_user:
            user_info = f"user:{request.current_user.id}"

        logger.info(
            f"[{request_id}] {request.method} {request.path} - {user_info}",
            extra={
                'request_id': request_id,
                'method': request.method,
                'path': request.path,
                'user': user_info
            }
        )

        try:
            result = f(*args, **kwargs)

            # Log request completion
            duration = (time.time() - start_time) * 1000  # ms

            # Get status code from result
            status_code = 200
            if isinstance(result, tuple) and len(result) >= 2:
                status_code = result[1]

            logger.info(
                f"[{request_id}] Completed {status_code} in {duration:.2f}ms",
                extra={
                    'request_id': request_id,
                    'status_code': status_code,
                    'duration_ms': duration
                }
            )

            return result

        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(
                f"[{request_id}] Failed after {duration:.2f}ms: {str(e)}",
                extra={'request_id': request_id, 'duration_ms': duration}
            )
            raise

    return decorated_function


def validate_json(f: Callable) -> Callable:
    """
    Decorator to validate that request has JSON body.

    Raises ValidationError if Content-Type is not application/json
    or body is not valid JSON.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            raise ValidationError("Content-Type must be application/json")

        data = request.get_json(silent=True)
        if data is None:
            raise ValidationError("Request body must be valid JSON")

        return f(*args, **kwargs)

    return decorated_function


def require_fields(*required_fields: str):
    """
    Decorator to require specific fields in JSON body.

    Usage:
        @require_fields('email', 'password')
        def login():
            data = request.get_json()
            # email and password guaranteed to exist
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            data = request.get_json(silent=True)
            if not data:
                raise ValidationError("Request body must be valid JSON")

            missing = [
                field for field in required_fields
                if field not in data or data[field] is None
            ]

            if missing:
                raise ValidationError(
                    f"Missing required fields: {', '.join(missing)}",
                    details={'missing_fields': missing}
                )

            return f(*args, **kwargs)

        return decorated_function
    return decorator
