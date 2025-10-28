"""
Rate Limiting Middleware for CodeGuardian

Implements request rate limiting with Redis backend or in-memory fallback.
Supports per-user and per-IP rate limits with configurable windows.
"""

import time
import logging
from functools import wraps
from flask import request, jsonify, current_app, g
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Rate limiter with Redis backend or in-memory fallback

    Implements sliding window rate limiting with automatic cleanup
    """

    def __init__(self):
        self.redis_client = None
        self.memory_store = defaultdict(list)
        self.last_cleanup = time.time()
        self._initialize_redis()

    def _initialize_redis(self):
        """Initialize Redis connection if available"""
        try:
            import redis
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Rate limiter using Redis backend")
        except Exception as e:
            logger.warning(f"Redis not available, using in-memory rate limiting: {str(e)}")
            self.redis_client = None

    def _get_key(self, identifier: str, window: str) -> str:
        """Generate rate limit key"""
        return f"ratelimit:{window}:{identifier}"

    def _cleanup_memory_store(self):
        """Clean up old entries from memory store"""
        now = time.time()
        if now - self.last_cleanup > 60:  # Cleanup every minute
            cutoff = now - 3600  # Keep last hour
            for key in list(self.memory_store.keys()):
                self.memory_store[key] = [
                    ts for ts in self.memory_store[key] if ts > cutoff
                ]
                if not self.memory_store[key]:
                    del self.memory_store[key]
            self.last_cleanup = now

    def _check_rate_limit_redis(
        self,
        identifier: str,
        limit: int,
        window: int
    ) -> Tuple[bool, int, int]:
        """
        Check rate limit using Redis

        Returns: (is_allowed, remaining, reset_time)
        """
        key = self._get_key(identifier, f"{window}s")
        now = time.time()

        try:
            pipe = self.redis_client.pipeline()

            # Remove old entries
            pipe.zremrangebyscore(key, 0, now - window)

            # Count current requests
            pipe.zcard(key)

            # Add current request
            pipe.zadd(key, {str(now): now})

            # Set expiry
            pipe.expire(key, window)

            results = pipe.execute()
            count = results[1]

            is_allowed = count < limit
            remaining = max(0, limit - count - 1)

            # Calculate reset time
            if count > 0:
                oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    reset_time = int(oldest[0][1] + window)
                else:
                    reset_time = int(now + window)
            else:
                reset_time = int(now + window)

            return is_allowed, remaining, reset_time

        except Exception as e:
            logger.error(f"Redis rate limit check failed: {str(e)}")
            # Fallback to allowing the request
            return True, limit, int(now + window)

    def _check_rate_limit_memory(
        self,
        identifier: str,
        limit: int,
        window: int
    ) -> Tuple[bool, int, int]:
        """
        Check rate limit using in-memory store

        Returns: (is_allowed, remaining, reset_time)
        """
        self._cleanup_memory_store()

        key = self._get_key(identifier, f"{window}s")
        now = time.time()
        cutoff = now - window

        # Remove old entries
        self.memory_store[key] = [
            ts for ts in self.memory_store[key] if ts > cutoff
        ]

        count = len(self.memory_store[key])
        is_allowed = count < limit
        remaining = max(0, limit - count - 1)

        if is_allowed:
            self.memory_store[key].append(now)

        # Calculate reset time
        if self.memory_store[key]:
            reset_time = int(self.memory_store[key][0] + window)
        else:
            reset_time = int(now + window)

        return is_allowed, remaining, reset_time

    def check_rate_limit(
        self,
        identifier: str,
        limit: int,
        window: int
    ) -> Tuple[bool, int, int]:
        """
        Check if request is within rate limit

        Args:
            identifier: Unique identifier (user_id or IP)
            limit: Maximum number of requests
            window: Time window in seconds

        Returns:
            Tuple of (is_allowed, remaining, reset_time)
        """
        if self.redis_client:
            return self._check_rate_limit_redis(identifier, limit, window)
        else:
            return self._check_rate_limit_memory(identifier, limit, window)


# Global rate limiter instance
rate_limiter = RateLimiter()


def parse_rate_limit(rate_string: str) -> Tuple[int, int]:
    """
    Parse rate limit string like '100 per hour' or '10/minute'

    Returns: (limit, window_seconds)
    """
    if not rate_string:
        return None, None

    rate_string = rate_string.lower().strip()

    # Handle formats: "100 per hour", "100/hour", "100 per 1 hour"
    parts = rate_string.replace('/', ' per ').split()

    if len(parts) < 3:
        logger.warning(f"Invalid rate limit format: {rate_string}")
        return None, None

    try:
        limit = int(parts[0])
        unit = parts[-1].rstrip('s')  # Remove trailing 's' if present

        # Convert to seconds
        unit_map = {
            'second': 1,
            'minute': 60,
            'hour': 3600,
            'day': 86400
        }

        window = unit_map.get(unit)
        if window is None:
            logger.warning(f"Unknown time unit: {unit}")
            return None, None

        return limit, window

    except (ValueError, IndexError) as e:
        logger.warning(f"Error parsing rate limit '{rate_string}': {str(e)}")
        return None, None


def get_identifier() -> str:
    """Get unique identifier for rate limiting (user_id or IP)"""
    # Try to get authenticated user ID
    if hasattr(g, 'user_id'):
        return f"user:{g.user_id}"

    # Try to get from request context (set by auth decorator)
    if hasattr(request, 'current_user') and request.current_user:
        return f"user:{request.current_user.id}"

    # Fall back to IP address
    # Handle proxied requests
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        ip = request.headers.get('X-Real-IP')
    else:
        ip = request.remote_addr or 'unknown'

    return f"ip:{ip}"


def rate_limit(limit_string: Optional[str] = None):
    """
    Decorator to apply rate limiting to routes

    Usage:
        @app.route('/api/endpoint')
        @rate_limit('100 per hour')
        def endpoint():
            return {'data': 'value'}

    Args:
        limit_string: Rate limit string (e.g., '100 per hour')
                     If None, uses app config RATE_LIMIT
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            # Get rate limit from decorator or config
            rate_string = limit_string or current_app.config.get('RATE_LIMIT')

            if not rate_string:
                # No rate limiting configured
                return f(*args, **kwargs)

            # Parse rate limit
            limit, window = parse_rate_limit(rate_string)
            if limit is None or window is None:
                # Invalid rate limit, allow request
                logger.warning(f"Invalid rate limit configuration: {rate_string}")
                return f(*args, **kwargs)

            # Get identifier
            identifier = get_identifier()

            # Check rate limit
            is_allowed, remaining, reset_time = rate_limiter.check_rate_limit(
                identifier, limit, window
            )

            # Add rate limit headers
            response = None
            if is_allowed:
                response = f(*args, **kwargs)
                if hasattr(response, 'headers'):
                    response.headers['X-RateLimit-Limit'] = str(limit)
                    response.headers['X-RateLimit-Remaining'] = str(remaining)
                    response.headers['X-RateLimit-Reset'] = str(reset_time)
            else:
                # Rate limit exceeded
                retry_after = reset_time - int(time.time())
                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Please try again in {retry_after} seconds.',
                    'retry_after': retry_after
                }), 429

                if isinstance(response, tuple):
                    response_obj, status_code = response
                    response_obj.headers['X-RateLimit-Limit'] = str(limit)
                    response_obj.headers['X-RateLimit-Remaining'] = '0'
                    response_obj.headers['X-RateLimit-Reset'] = str(reset_time)
                    response_obj.headers['Retry-After'] = str(retry_after)
                    return response_obj, status_code

            return response

        return wrapped
    return decorator


def init_rate_limiting(app):
    """Initialize rate limiting for the Flask app"""
    global rate_limiter

    with app.app_context():
        rate_limiter = RateLimiter()

    @app.before_request
    def check_global_rate_limit():
        """Apply global rate limiting to all requests"""
        # Skip for static files and health checks
        if request.path.startswith('/static/') or request.path == '/health':
            return None

        # Get global rate limit from config
        rate_string = app.config.get('RATE_LIMIT')
        if not rate_string:
            return None

        # Parse rate limit
        limit, window = parse_rate_limit(rate_string)
        if limit is None or window is None:
            return None

        # Get identifier
        identifier = get_identifier()

        # Check rate limit
        is_allowed, remaining, reset_time = rate_limiter.check_rate_limit(
            identifier, limit, window
        )

        # Store in g for use in after_request
        g.rate_limit_remaining = remaining
        g.rate_limit_reset = reset_time
        g.rate_limit_limit = limit

        if not is_allowed:
            retry_after = reset_time - int(time.time())
            response = jsonify({
                'error': 'Rate limit exceeded',
                'message': f'Too many requests. Please try again in {retry_after} seconds.',
                'retry_after': retry_after
            })
            response.status_code = 429
            response.headers['X-RateLimit-Limit'] = str(limit)
            response.headers['X-RateLimit-Remaining'] = '0'
            response.headers['X-RateLimit-Reset'] = str(reset_time)
            response.headers['Retry-After'] = str(retry_after)
            return response

        return None

    @app.after_request
    def add_rate_limit_headers(response):
        """Add rate limit headers to all responses"""
        if hasattr(g, 'rate_limit_limit'):
            response.headers['X-RateLimit-Limit'] = str(g.rate_limit_limit)
            response.headers['X-RateLimit-Remaining'] = str(g.rate_limit_remaining)
            response.headers['X-RateLimit-Reset'] = str(g.rate_limit_reset)
        return response

    logger.info("Rate limiting initialized")
