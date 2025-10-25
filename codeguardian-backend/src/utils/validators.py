"""
Validation utilities for CodeGuardian backend
"""
import re
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse


class ValidationError(Exception):
    """Custom exception for validation errors"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class Validator:
    """Base validator class with common validation methods"""
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        if not email:
            return False
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def validate_password(password: str) -> Dict[str, Any]:
        """
        Validate password strength
        Returns dict with 'valid' boolean and 'errors' list
        """
        errors = []
        
        if not password:
            errors.append("Password is required")
            return {'valid': False, 'errors': errors}
        
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long")
        
        if len(password) > 128:
            errors.append("Password must be less than 128 characters long")
        
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    @staticmethod
    def validate_username(username: str) -> Dict[str, Any]:
        """
        Validate username format
        Returns dict with 'valid' boolean and 'errors' list
        """
        errors = []
        
        if not username:
            errors.append("Username is required")
            return {'valid': False, 'errors': errors}
        
        if len(username) < 3:
            errors.append("Username must be at least 3 characters long")
        
        if len(username) > 50:
            errors.append("Username must be less than 50 characters long")
        
        if not re.match(r'^[a-zA-Z0-9_-]+$', username):
            errors.append("Username can only contain letters, numbers, hyphens, and underscores")
        
        if username.startswith('-') or username.endswith('-'):
            errors.append("Username cannot start or end with a hyphen")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    @staticmethod
    def validate_url(url: str, allowed_schemes: List[str] = None) -> bool:
        """Validate URL format"""
        if not url:
            return False
        
        if allowed_schemes is None:
            allowed_schemes = ['http', 'https']
        
        try:
            parsed = urlparse(url)
            return (
                parsed.scheme in allowed_schemes and
                bool(parsed.netloc) and
                bool(parsed.path or parsed.netloc)
            )
        except Exception:
            return False
    
    @staticmethod
    def validate_github_url(url: str) -> Dict[str, Any]:
        """
        Validate GitHub repository URL and extract owner/repo
        Returns dict with validation result and extracted data
        """
        if not url:
            return {'valid': False, 'error': 'URL is required'}
        
        # GitHub URL patterns
        patterns = [
            r'^https://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)/?$',
            r'^git@github\.com:([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)\.git$'
        ]
        
        for pattern in patterns:
            match = re.match(pattern, url)
            if match:
                owner, repo = match.groups()
                return {
                    'valid': True,
                    'owner': owner,
                    'repo': repo,
                    'full_name': f"{owner}/{repo}"
                }
        
        return {
            'valid': False,
            'error': 'Invalid GitHub repository URL format'
        }
    
    @staticmethod
    def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> List[str]:
        """
        Validate that all required fields are present and not empty
        Returns list of missing field names
        """
        missing_fields = []
        
        for field in required_fields:
            if field not in data or not data[field]:
                missing_fields.append(field)
        
        return missing_fields
    
    @staticmethod
    def validate_string_length(value: str, min_length: int = 0, max_length: int = None) -> bool:
        """Validate string length constraints"""
        if not isinstance(value, str):
            return False
        
        if len(value) < min_length:
            return False
        
        if max_length is not None and len(value) > max_length:
            return False
        
        return True
    
    @staticmethod
    def validate_integer_range(value: Any, min_value: int = None, max_value: int = None) -> bool:
        """Validate integer value within range"""
        try:
            int_value = int(value)
        except (ValueError, TypeError):
            return False
        
        if min_value is not None and int_value < min_value:
            return False
        
        if max_value is not None and int_value > max_value:
            return False
        
        return True
    
    @staticmethod
    def validate_enum_value(value: Any, allowed_values: List[Any]) -> bool:
        """Validate that value is in allowed list"""
        return value in allowed_values


class UserValidator(Validator):
    """Validator for user-related data"""
    
    @classmethod
    def validate_registration_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate user registration data
        Returns dict with validation result and errors
        """
        errors = {}
        
        # Check required fields
        required_fields = ['username', 'email', 'password']
        missing_fields = cls.validate_required_fields(data, required_fields)
        
        if missing_fields:
            errors['missing_fields'] = missing_fields
        
        # Validate username
        if 'username' in data:
            username_validation = cls.validate_username(data['username'])
            if not username_validation['valid']:
                errors['username'] = username_validation['errors']
        
        # Validate email
        if 'email' in data:
            if not cls.validate_email(data['email']):
                errors['email'] = ['Invalid email format']
        
        # Validate password
        if 'password' in data:
            password_validation = cls.validate_password(data['password'])
            if not password_validation['valid']:
                errors['password'] = password_validation['errors']
        
        # Validate optional fields
        if 'full_name' in data and data['full_name']:
            if not cls.validate_string_length(data['full_name'], max_length=100):
                errors['full_name'] = ['Full name must be less than 100 characters']
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    @classmethod
    def validate_login_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate user login data
        Returns dict with validation result and errors
        """
        errors = {}
        
        # Check required fields
        required_fields = ['email', 'password']
        missing_fields = cls.validate_required_fields(data, required_fields)
        
        if missing_fields:
            errors['missing_fields'] = missing_fields
        
        # Validate email format
        if 'email' in data and data['email']:
            if not cls.validate_email(data['email']):
                errors['email'] = ['Invalid email format']
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }


class RepositoryValidator(Validator):
    """Validator for repository-related data"""
    
    @classmethod
    def validate_connection_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate repository connection data
        Returns dict with validation result and errors
        """
        errors = {}
        
        # Check required fields
        required_fields = ['platform', 'repo_url', 'access_token']
        missing_fields = cls.validate_required_fields(data, required_fields)
        
        if missing_fields:
            errors['missing_fields'] = missing_fields
        
        # Validate platform
        if 'platform' in data:
            allowed_platforms = ['github', 'gitlab', 'bitbucket']
            if not cls.validate_enum_value(data['platform'], allowed_platforms):
                errors['platform'] = ['Platform must be one of: github, gitlab, bitbucket']
        
        # Validate repository URL
        if 'repo_url' in data and data['repo_url']:
            if data.get('platform') == 'github':
                github_validation = cls.validate_github_url(data['repo_url'])
                if not github_validation['valid']:
                    errors['repo_url'] = [github_validation['error']]
            else:
                if not cls.validate_url(data['repo_url']):
                    errors['repo_url'] = ['Invalid repository URL format']
        
        # Validate access token
        if 'access_token' in data and data['access_token']:
            if not cls.validate_string_length(data['access_token'], min_length=10):
                errors['access_token'] = ['Access token appears to be invalid']
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }


class ReviewValidator(Validator):
    """Validator for review-related data"""
    
    @classmethod
    def validate_review_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate review creation data
        Returns dict with validation result and errors
        """
        errors = {}
        
        # Check required fields
        required_fields = ['repository_id', 'pull_request_url', 'pull_request_number', 'pull_request_title']
        missing_fields = cls.validate_required_fields(data, required_fields)
        
        if missing_fields:
            errors['missing_fields'] = missing_fields
        
        # Validate repository_id
        if 'repository_id' in data:
            if not cls.validate_integer_range(data['repository_id'], min_value=1):
                errors['repository_id'] = ['Invalid repository ID']
        
        # Validate pull request URL
        if 'pull_request_url' in data and data['pull_request_url']:
            if not cls.validate_url(data['pull_request_url']):
                errors['pull_request_url'] = ['Invalid pull request URL format']
        
        # Validate pull request number
        if 'pull_request_number' in data:
            if not cls.validate_integer_range(data['pull_request_number'], min_value=1):
                errors['pull_request_number'] = ['Invalid pull request number']
        
        # Validate pull request title
        if 'pull_request_title' in data and data['pull_request_title']:
            if not cls.validate_string_length(data['pull_request_title'], min_length=1, max_length=200):
                errors['pull_request_title'] = ['Pull request title must be between 1 and 200 characters']
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }


def validate_pagination_params(page: Any, per_page: Any) -> Dict[str, Any]:
    """
    Validate pagination parameters
    Returns dict with validated values or errors
    """
    errors = {}
    validated = {}
    
    # Validate page
    try:
        page_int = int(page) if page is not None else 1
        if page_int < 1:
            errors['page'] = ['Page must be a positive integer']
        else:
            validated['page'] = page_int
    except (ValueError, TypeError):
        errors['page'] = ['Page must be a valid integer']
    
    # Validate per_page
    try:
        per_page_int = int(per_page) if per_page is not None else 20
        if per_page_int < 1 or per_page_int > 100:
            errors['per_page'] = ['Per page must be between 1 and 100']
        else:
            validated['per_page'] = per_page_int
    except (ValueError, TypeError):
        errors['per_page'] = ['Per page must be a valid integer']
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'validated': validated
    }


def sanitize_input(value: str, max_length: int = None) -> str:
    """
    Sanitize input string by removing dangerous characters
    """
    if not isinstance(value, str):
        return str(value) if value is not None else ''
    
    # Remove null bytes and control characters
    sanitized = ''.join(char for char in value if ord(char) >= 32 or char in '\t\n\r')
    
    # Trim whitespace
    sanitized = sanitized.strip()
    
    # Limit length if specified
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized

