"""
Request validation utilities for CodeGuardian backend

Provides type-safe parameter extraction and validation for API requests.
"""

import re
import logging
from typing import Any, Dict, Optional, Set, Type, TypeVar, Union
from urllib.parse import urlparse
from flask import request

from src.exceptions import ValidationError
from src.constants import (
    PaginationConfig,
    SUPPORTED_LANGUAGES,
    Platform,
    ReviewStatus,
    DifficultyLevel
)

logger = logging.getLogger(__name__)

T = TypeVar('T')


class RequestValidator:
    """
    Request parameter validation utilities

    Provides type-safe extraction and validation of request parameters
    with clear error messages.
    """

    @staticmethod
    def get_json_body() -> Dict[str, Any]:
        """
        Get and validate JSON request body.

        Returns:
            Parsed JSON data

        Raises:
            ValidationError: If body is not valid JSON
        """
        data = request.get_json(silent=True)
        if data is None:
            raise ValidationError("Request body must be valid JSON")
        return data

    @staticmethod
    def get_required_field(data: Dict, field: str, field_type: Type[T] = str) -> T:
        """
        Get a required field from request data.

        Args:
            data: Request data dictionary
            field: Field name
            field_type: Expected type (str, int, list, dict)

        Returns:
            Field value of specified type

        Raises:
            ValidationError: If field is missing or wrong type
        """
        if field not in data:
            raise ValidationError(f"Field '{field}' is required", field=field)

        value = data[field]

        if value is None or value == '':
            raise ValidationError(f"Field '{field}' cannot be empty", field=field)

        if not isinstance(value, field_type):
            raise ValidationError(
                f"Field '{field}' must be of type {field_type.__name__}",
                field=field
            )

        return value

    @staticmethod
    def get_optional_field(
        data: Dict,
        field: str,
        default: T = None,
        field_type: Type[T] = str
    ) -> T:
        """
        Get an optional field from request data.

        Args:
            data: Request data dictionary
            field: Field name
            default: Default value if field is missing
            field_type: Expected type

        Returns:
            Field value or default

        Raises:
            ValidationError: If field is present but wrong type
        """
        if field not in data or data[field] is None:
            return default

        value = data[field]

        if not isinstance(value, field_type):
            raise ValidationError(
                f"Field '{field}' must be of type {field_type.__name__}",
                field=field
            )

        return value

    @staticmethod
    def get_int_param(
        key: str,
        default: int,
        min_val: Optional[int] = None,
        max_val: Optional[int] = None
    ) -> int:
        """
        Get and validate integer query parameter.

        Args:
            key: Parameter name
            default: Default value
            min_val: Minimum allowed value
            max_val: Maximum allowed value

        Returns:
            Validated integer value

        Raises:
            ValidationError: If value is invalid
        """
        raw_value = request.args.get(key)

        if raw_value is None:
            return default

        try:
            value = int(raw_value)
        except ValueError:
            raise ValidationError(
                f"Parameter '{key}' must be an integer",
                field=key
            )

        if min_val is not None and value < min_val:
            raise ValidationError(
                f"Parameter '{key}' must be at least {min_val}",
                field=key
            )

        if max_val is not None and value > max_val:
            raise ValidationError(
                f"Parameter '{key}' must be at most {max_val}",
                field=key
            )

        return value

    @staticmethod
    def get_enum_param(
        key: str,
        allowed_values: Set[str],
        default: Optional[str] = None
    ) -> Optional[str]:
        """
        Get and validate enum query parameter.

        Args:
            key: Parameter name
            allowed_values: Set of allowed values
            default: Default value if not provided

        Returns:
            Validated enum value or default

        Raises:
            ValidationError: If value is not in allowed set
        """
        value = request.args.get(key, default)

        if value is None:
            return default

        if value not in allowed_values:
            raise ValidationError(
                f"Parameter '{key}' must be one of: {', '.join(sorted(allowed_values))}",
                field=key
            )

        return value

    @staticmethod
    def get_bool_param(key: str, default: bool = False) -> bool:
        """
        Get and validate boolean query parameter.

        Args:
            key: Parameter name
            default: Default value

        Returns:
            Boolean value
        """
        value = request.args.get(key)

        if value is None:
            return default

        return value.lower() in ('true', '1', 'yes', 'on')

    @staticmethod
    def get_pagination_params() -> Dict[str, int]:
        """
        Get and validate pagination parameters.

        Returns:
            Dict with 'page', 'per_page', 'offset' keys

        Raises:
            ValidationError: If pagination params are invalid
        """
        page = RequestValidator.get_int_param(
            'page',
            PaginationConfig.DEFAULT_PAGE,
            min_val=1
        )

        per_page = RequestValidator.get_int_param(
            'per_page',
            PaginationConfig.DEFAULT_PER_PAGE,
            min_val=PaginationConfig.MIN_PER_PAGE,
            max_val=PaginationConfig.MAX_PER_PAGE
        )

        # Support legacy 'limit' and 'offset' params
        if 'limit' in request.args:
            per_page = RequestValidator.get_int_param(
                'limit',
                PaginationConfig.DEFAULT_PER_PAGE,
                min_val=PaginationConfig.MIN_PER_PAGE,
                max_val=PaginationConfig.MAX_PER_PAGE
            )

        if 'offset' in request.args:
            offset = RequestValidator.get_int_param('offset', 0, min_val=0)
        else:
            offset = (page - 1) * per_page

        return {
            'page': page,
            'per_page': per_page,
            'offset': offset
        }

    @staticmethod
    def validate_email(email: str) -> str:
        """
        Validate email format.

        Args:
            email: Email address

        Returns:
            Validated email

        Raises:
            ValidationError: If email format is invalid
        """
        if not email:
            raise ValidationError("Email is required", field='email')

        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValidationError("Invalid email format", field='email')

        return email.lower().strip()

    @staticmethod
    def validate_language(language: str) -> str:
        """
        Validate programming language.

        Args:
            language: Language name

        Returns:
            Normalized language name

        Raises:
            ValidationError: If language is not supported
        """
        normalized = language.lower().strip()

        if normalized not in SUPPORTED_LANGUAGES:
            raise ValidationError(
                f"Language '{language}' is not supported. "
                f"Supported: {', '.join(sorted(SUPPORTED_LANGUAGES))}",
                field='language'
            )

        return normalized

    @staticmethod
    def validate_github_url(url: str) -> Dict[str, str]:
        """
        Validate and parse GitHub repository URL.

        Supports both HTTPS and SSH formats:
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - git@github.com:owner/repo.git

        Args:
            url: Repository URL

        Returns:
            Dict with 'owner' and 'repo' keys

        Raises:
            ValidationError: If URL format is invalid
        """
        if not url:
            raise ValidationError("Repository URL is required", field='repo_url')

        # SSH format: git@github.com:owner/repo.git
        ssh_match = re.match(
            r'^git@github\.com:([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(?:\.git)?$',
            url
        )
        if ssh_match:
            return {
                'owner': ssh_match.group(1),
                'repo': ssh_match.group(2)
            }

        # HTTPS format
        try:
            parsed = urlparse(url)
            if parsed.netloc != 'github.com':
                raise ValidationError(
                    "Invalid GitHub URL. Must be from github.com",
                    field='repo_url'
                )

            path_parts = parsed.path.strip('/').split('/')
            if len(path_parts) < 2:
                raise ValidationError(
                    "Invalid GitHub URL format. Expected: github.com/owner/repo",
                    field='repo_url'
                )

            owner = path_parts[0]
            repo = path_parts[1].replace('.git', '')

            # Validate owner/repo format
            if not re.match(r'^[a-zA-Z0-9_.-]+$', owner):
                raise ValidationError("Invalid repository owner name", field='repo_url')
            if not re.match(r'^[a-zA-Z0-9_.-]+$', repo):
                raise ValidationError("Invalid repository name", field='repo_url')

            return {'owner': owner, 'repo': repo}

        except Exception as e:
            if isinstance(e, ValidationError):
                raise
            raise ValidationError(
                "Invalid repository URL format",
                field='repo_url'
            )

    @staticmethod
    def validate_platform(platform: str) -> str:
        """
        Validate repository platform.

        Args:
            platform: Platform name

        Returns:
            Validated platform name

        Raises:
            ValidationError: If platform is not supported
        """
        normalized = platform.lower().strip()
        valid_platforms = {p.value for p in Platform}

        if normalized not in valid_platforms:
            raise ValidationError(
                f"Platform must be one of: {', '.join(sorted(valid_platforms))}",
                field='platform'
            )

        return normalized

    @staticmethod
    def validate_code_size(code: str) -> None:
        """
        Validate code size constraints.

        Args:
            code: Code content

        Raises:
            ValidationError: If code size is invalid
        """
        from src.constants import ReviewConfig

        if len(code) < ReviewConfig.MIN_CODE_SIZE_CHARS:
            raise ValidationError(
                f"Code must be at least {ReviewConfig.MIN_CODE_SIZE_CHARS} characters",
                field='code'
            )

        if len(code.encode('utf-8')) > ReviewConfig.MAX_CODE_SIZE_BYTES:
            raise ValidationError(
                f"Code exceeds maximum size of {ReviewConfig.MAX_CODE_SIZE_BYTES // 1_000_000}MB",
                field='code'
            )
