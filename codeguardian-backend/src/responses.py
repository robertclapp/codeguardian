"""
Standardized API responses for CodeGuardian backend

Provides consistent response formatting across all endpoints.
"""

from typing import Any, Dict, Optional, Tuple
from flask import jsonify


class APIResponse:
    """
    Standardized API response builder

    Ensures consistent response structure across all endpoints:
    {
        "success": bool,
        "data": any | null,
        "message": str | null,
        "errors": { "code": str, "message": str, "details": dict } | null
    }
    """

    @staticmethod
    def success(
        data: Any = None,
        message: Optional[str] = None,
        status_code: int = 200
    ) -> Tuple[Any, int]:
        """
        Create a success response.

        Args:
            data: Response payload (dict, list, or any JSON-serializable)
            message: Optional success message
            status_code: HTTP status code (default 200)

        Returns:
            Tuple of (response_dict, status_code)
        """
        response = {
            'success': True,
            'data': data,
            'message': message,
            'errors': None
        }
        return jsonify(response), status_code

    @staticmethod
    def created(
        data: Any = None,
        message: str = "Resource created successfully"
    ) -> Tuple[Any, int]:
        """Create a 201 Created response"""
        return APIResponse.success(data, message, 201)

    @staticmethod
    def accepted(
        data: Any = None,
        message: str = "Request accepted for processing"
    ) -> Tuple[Any, int]:
        """Create a 202 Accepted response for async operations"""
        return APIResponse.success(data, message, 202)

    @staticmethod
    def no_content() -> Tuple[str, int]:
        """Create a 204 No Content response"""
        return '', 204

    @staticmethod
    def error(
        message: str,
        error_code: str = "ERROR",
        details: Optional[Dict] = None,
        status_code: int = 400
    ) -> Tuple[Any, int]:
        """
        Create an error response.

        Args:
            message: Human-readable error message
            error_code: Machine-readable error code
            details: Additional error details
            status_code: HTTP status code (default 400)

        Returns:
            Tuple of (response_dict, status_code)
        """
        response = {
            'success': False,
            'data': None,
            'message': None,
            'errors': {
                'code': error_code,
                'message': message,
                'details': details or {}
            }
        }
        return jsonify(response), status_code

    @staticmethod
    def validation_error(
        message: str,
        field: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> Tuple[Any, int]:
        """Create a 400 validation error response"""
        error_details = details or {}
        if field:
            error_details['field'] = field
        return APIResponse.error(message, "VALIDATION_ERROR", error_details, 400)

    @staticmethod
    def not_found(
        resource_type: str,
        resource_id: Optional[Any] = None
    ) -> Tuple[Any, int]:
        """Create a 404 Not Found response"""
        if resource_id:
            message = f"{resource_type} with ID {resource_id} not found"
        else:
            message = f"{resource_type} not found"

        return APIResponse.error(
            message,
            "NOT_FOUND",
            {'resource_type': resource_type},
            404
        )

    @staticmethod
    def unauthorized(message: str = "Authentication required") -> Tuple[Any, int]:
        """Create a 401 Unauthorized response"""
        return APIResponse.error(message, "UNAUTHORIZED", None, 401)

    @staticmethod
    def forbidden(message: str = "Permission denied") -> Tuple[Any, int]:
        """Create a 403 Forbidden response"""
        return APIResponse.error(message, "FORBIDDEN", None, 403)

    @staticmethod
    def conflict(message: str, details: Optional[Dict] = None) -> Tuple[Any, int]:
        """Create a 409 Conflict response"""
        return APIResponse.error(message, "CONFLICT", details, 409)

    @staticmethod
    def rate_limited(retry_after: int) -> Tuple[Any, int]:
        """Create a 429 Too Many Requests response"""
        return APIResponse.error(
            f"Rate limit exceeded. Try again in {retry_after} seconds",
            "RATE_LIMITED",
            {'retry_after': retry_after},
            429
        )

    @staticmethod
    def internal_error(
        message: str = "An internal error occurred",
        error_id: Optional[str] = None
    ) -> Tuple[Any, int]:
        """Create a 500 Internal Server Error response"""
        details = {}
        if error_id:
            details['error_id'] = error_id
        return APIResponse.error(message, "INTERNAL_ERROR", details, 500)

    @staticmethod
    def service_unavailable(
        service_name: str,
        retry_after: Optional[int] = None
    ) -> Tuple[Any, int]:
        """Create a 503 Service Unavailable response"""
        details = {'service': service_name}
        if retry_after:
            details['retry_after'] = retry_after
        return APIResponse.error(
            f"Service '{service_name}' is temporarily unavailable",
            "SERVICE_UNAVAILABLE",
            details,
            503
        )

    @staticmethod
    def paginated(
        items: list,
        total: int,
        page: int,
        per_page: int,
        message: Optional[str] = None
    ) -> Tuple[Any, int]:
        """
        Create a paginated response.

        Args:
            items: List of items for current page
            total: Total number of items across all pages
            page: Current page number (1-indexed)
            per_page: Number of items per page

        Returns:
            Standardized paginated response
        """
        total_pages = (total + per_page - 1) // per_page if per_page > 0 else 0

        data = {
            'items': items,
            'pagination': {
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': total_pages,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
        }
        return APIResponse.success(data, message)
