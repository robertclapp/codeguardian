"""
CSRF Protection Middleware for CodeGuardian

Implements Cross-Site Request Forgery protection using tokens.
Compatible with JWT authentication and modern SPA architecture.
"""

import secrets
import hmac
import hashlib
import time
import logging
from functools import wraps
from flask import request, jsonify, current_app, session, g
from typing import Optional

logger = logging.getLogger(__name__)


class CSRFProtection:
    """
    CSRF protection manager

    Implements token-based CSRF protection with time-limited tokens
    """

    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize CSRF protection with Flask app"""
        self.app = app

        # Set default configuration
        app.config.setdefault('WTF_CSRF_ENABLED', True)
        app.config.setdefault('WTF_CSRF_TIME_LIMIT', 3600)  # 1 hour
        app.config.setdefault('WTF_CSRF_METHODS', ['POST', 'PUT', 'PATCH', 'DELETE'])
        app.config.setdefault('WTF_CSRF_HEADERS', ['X-CSRF-Token', 'X-CSRFToken'])
        app.config.setdefault('WTF_CSRF_FIELD_NAME', 'csrf_token')

        # Add CSRF token generation endpoint
        @app.route('/api/csrf-token', methods=['GET'])
        def get_csrf_token():
            """Get a CSRF token for the current session"""
            token = self.generate_csrf_token()
            return jsonify({
                'csrf_token': token,
                'expires_in': app.config['WTF_CSRF_TIME_LIMIT']
            }), 200

        logger.info("CSRF protection initialized")

    def generate_csrf_token(self) -> str:
        """
        Generate a new CSRF token

        Returns:
            CSRF token string
        """
        if 'csrf_token' not in session:
            session['csrf_token'] = secrets.token_hex(32)

        # Create time-limited token
        token_data = session['csrf_token']
        timestamp = str(int(time.time()))

        # Create HMAC signature
        secret_key = current_app.config['SECRET_KEY'].encode()
        message = f"{token_data}:{timestamp}".encode()
        signature = hmac.new(secret_key, message, hashlib.sha256).hexdigest()

        return f"{token_data}:{timestamp}:{signature}"

    def validate_csrf_token(self, token: Optional[str]) -> bool:
        """
        Validate a CSRF token

        Args:
            token: CSRF token to validate

        Returns:
            True if token is valid, False otherwise
        """
        if not token:
            return False

        if 'csrf_token' not in session:
            logger.warning("No CSRF token in session")
            return False

        try:
            # Parse token
            parts = token.split(':')
            if len(parts) != 3:
                logger.warning("Invalid CSRF token format")
                return False

            token_data, timestamp_str, signature = parts

            # Verify token data matches session
            if token_data != session['csrf_token']:
                logger.warning("CSRF token data mismatch")
                return False

            # Verify timestamp is within time limit
            timestamp = int(timestamp_str)
            now = int(time.time())
            time_limit = current_app.config['WTF_CSRF_TIME_LIMIT']

            if now - timestamp > time_limit:
                logger.warning(f"CSRF token expired (age: {now - timestamp}s, limit: {time_limit}s)")
                return False

            # Verify HMAC signature
            secret_key = current_app.config['SECRET_KEY'].encode()
            message = f"{token_data}:{timestamp_str}".encode()
            expected_signature = hmac.new(secret_key, message, hashlib.sha256).hexdigest()

            if not hmac.compare_digest(signature, expected_signature):
                logger.warning("CSRF token signature mismatch")
                return False

            return True

        except Exception as e:
            logger.error(f"Error validating CSRF token: {str(e)}")
            return False

    def get_csrf_token_from_request(self) -> Optional[str]:
        """
        Extract CSRF token from request

        Checks headers and form data
        """
        # Check custom headers
        csrf_headers = current_app.config['WTF_CSRF_HEADERS']
        for header in csrf_headers:
            token = request.headers.get(header)
            if token:
                return token

        # Check form data
        field_name = current_app.config['WTF_CSRF_FIELD_NAME']
        if request.is_json:
            data = request.get_json(silent=True)
            if data and field_name in data:
                return data[field_name]
        elif request.form:
            token = request.form.get(field_name)
            if token:
                return token

        return None

    def check_csrf_token(self):
        """
        Check CSRF token for current request

        Raises error if token is invalid
        """
        # Skip if CSRF protection is disabled
        if not current_app.config.get('WTF_CSRF_ENABLED', True):
            return

        # Skip for safe methods
        csrf_methods = current_app.config['WTF_CSRF_METHODS']
        if request.method not in csrf_methods:
            return

        # Skip for certain endpoints
        # - CSRF token endpoint itself
        # - Health check endpoint
        # - Static files
        if request.path in ['/api/csrf-token', '/health'] or request.path.startswith('/static/'):
            return

        # Skip for JWT-authenticated API requests (optional)
        # If using JWT tokens, CSRF is less critical as tokens are in headers
        # However, keeping CSRF provides defense in depth
        if current_app.config.get('CSRF_SKIP_JWT', False):
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                return

        # Get and validate token
        token = self.get_csrf_token_from_request()

        if not self.validate_csrf_token(token):
            logger.warning(f"CSRF validation failed for {request.method} {request.path}")
            raise CSRFError("CSRF token validation failed")


class CSRFError(Exception):
    """CSRF validation error"""
    pass


# Global CSRF protection instance
csrf = CSRFProtection()


def csrf_protect(f):
    """
    Decorator to require CSRF token for a route

    Usage:
        @app.route('/api/endpoint', methods=['POST'])
        @csrf_protect
        def endpoint():
            return {'data': 'value'}
    """
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            csrf.check_csrf_token()
        except CSRFError as e:
            return jsonify({
                'error': 'CSRF validation failed',
                'message': str(e)
            }), 403
        return f(*args, **kwargs)
    return wrapped


def csrf_exempt(f):
    """
    Decorator to exempt a route from CSRF protection

    Usage:
        @app.route('/api/webhook', methods=['POST'])
        @csrf_exempt
        def webhook():
            return {'status': 'received'}
    """
    @wraps(f)
    def wrapped(*args, **kwargs):
        g.csrf_exempt = True
        return f(*args, **kwargs)
    return wrapped


def init_csrf_protection(app):
    """Initialize CSRF protection for the Flask app"""
    global csrf

    csrf = CSRFProtection(app)

    @app.before_request
    def check_csrf():
        """Check CSRF token before processing request"""
        # Skip if route is marked as exempt
        if hasattr(g, 'csrf_exempt') and g.csrf_exempt:
            return None

        # Skip if CSRF is disabled
        if not app.config.get('WTF_CSRF_ENABLED', True):
            return None

        try:
            csrf.check_csrf_token()
        except CSRFError as e:
            response = jsonify({
                'error': 'CSRF validation failed',
                'message': str(e)
            })
            response.status_code = 403
            return response

        return None

    @app.after_request
    def set_csrf_cookie(response):
        """Set CSRF token in cookie for easy access by frontend"""
        # Only set for successful responses
        if response.status_code < 400:
            # Generate token if not in session
            if 'csrf_token' not in session:
                token = csrf.generate_csrf_token()
                # Optionally set as cookie
                if app.config.get('WTF_CSRF_COOKIE_NAME'):
                    cookie_name = app.config['WTF_CSRF_COOKIE_NAME']
                    response.set_cookie(
                        cookie_name,
                        token,
                        max_age=app.config['WTF_CSRF_TIME_LIMIT'],
                        httponly=False,  # Frontend needs to read this
                        secure=app.config.get('SESSION_COOKIE_SECURE', False),
                        samesite='Lax'
                    )

        return response

    logger.info(
        f"CSRF protection initialized "
        f"(enabled: {app.config.get('WTF_CSRF_ENABLED', True)})"
    )


# Helper function to generate token in templates or API responses
def generate_csrf_token():
    """Generate CSRF token for current request"""
    return csrf.generate_csrf_token()
