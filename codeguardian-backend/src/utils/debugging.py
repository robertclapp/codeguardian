"""
Debugging and monitoring utilities for CodeGuardian backend
"""
import time
import functools
import logging
import traceback
import sys
from typing import Any, Callable, Dict, Optional
from datetime import datetime
from flask import request, g
import psutil
import os


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/codeguardian.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor application performance and resource usage"""
    
    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.error_count = 0
        self.slow_requests = []
    
    def log_request_start(self):
        """Log the start of a request"""
        g.request_start_time = time.time()
        self.request_count += 1
    
    def log_request_end(self, response_status: int = 200):
        """Log the end of a request"""
        if hasattr(g, 'request_start_time'):
            duration = time.time() - g.request_start_time
            
            # Log slow requests (> 1 second)
            if duration > 1.0:
                self.slow_requests.append({
                    'url': request.url,
                    'method': request.method,
                    'duration': duration,
                    'timestamp': datetime.now().isoformat()
                })
                logger.warning(f"Slow request: {request.method} {request.url} took {duration:.2f}s")
            
            # Log errors
            if response_status >= 400:
                self.error_count += 1
                logger.error(f"Error response: {response_status} for {request.method} {request.url}")
            
            logger.info(f"{request.method} {request.url} - {response_status} - {duration:.3f}s")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        uptime = time.time() - self.start_time
        
        # Get system resource usage
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        cpu_percent = process.cpu_percent()
        
        return {
            'uptime_seconds': uptime,
            'total_requests': self.request_count,
            'error_count': self.error_count,
            'error_rate': self.error_count / max(self.request_count, 1),
            'slow_requests_count': len(self.slow_requests),
            'recent_slow_requests': self.slow_requests[-10:],  # Last 10 slow requests
            'memory_usage_mb': memory_info.rss / 1024 / 1024,
            'cpu_percent': cpu_percent,
            'threads': process.num_threads()
        }


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def timing_decorator(func: Callable) -> Callable:
    """Decorator to measure function execution time"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"{func.__name__} executed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"{func.__name__} failed after {duration:.3f}s: {str(e)}")
            raise
    return wrapper


def log_function_calls(include_args: bool = False, include_result: bool = False):
    """Decorator to log function calls with optional arguments and results"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            func_name = f"{func.__module__}.{func.__name__}"
            
            # Log function entry
            log_msg = f"Calling {func_name}"
            if include_args and (args or kwargs):
                log_msg += f" with args={args}, kwargs={kwargs}"
            logger.debug(log_msg)
            
            try:
                result = func(*args, **kwargs)
                
                # Log successful completion
                log_msg = f"Completed {func_name}"
                if include_result:
                    log_msg += f" -> {result}"
                logger.debug(log_msg)
                
                return result
            except Exception as e:
                logger.error(f"Error in {func_name}: {str(e)}")
                logger.debug(f"Traceback: {traceback.format_exc()}")
                raise
        return wrapper
    return decorator


class ErrorTracker:
    """Track and analyze application errors"""
    
    def __init__(self):
        self.errors = []
        self.error_counts = {}
    
    def log_error(self, error: Exception, context: Dict[str, Any] = None):
        """Log an error with context information"""
        error_info = {
            'timestamp': datetime.now().isoformat(),
            'type': type(error).__name__,
            'message': str(error),
            'traceback': traceback.format_exc(),
            'context': context or {}
        }
        
        # Add request context if available
        if request:
            error_info['request'] = {
                'method': request.method,
                'url': request.url,
                'remote_addr': request.remote_addr,
                'user_agent': request.headers.get('User-Agent')
            }
        
        self.errors.append(error_info)
        
        # Keep only last 100 errors to prevent memory issues
        if len(self.errors) > 100:
            self.errors = self.errors[-100:]
        
        # Update error counts
        error_type = type(error).__name__
        self.error_counts[error_type] = self.error_counts.get(error_type, 0) + 1
        
        logger.error(f"Error tracked: {error_type} - {str(error)}")
    
    def get_error_summary(self) -> Dict[str, Any]:
        """Get summary of tracked errors"""
        return {
            'total_errors': len(self.errors),
            'error_types': self.error_counts,
            'recent_errors': self.errors[-10:],  # Last 10 errors
            'most_common_errors': sorted(
                self.error_counts.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
        }


# Global error tracker instance
error_tracker = ErrorTracker()


def handle_exceptions(func: Callable) -> Callable:
    """Decorator to handle and track exceptions"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            error_tracker.log_error(e, {
                'function': func.__name__,
                'args': str(args)[:200],  # Limit length
                'kwargs': str(kwargs)[:200]
            })
            raise
    return wrapper


class DatabaseQueryLogger:
    """Log and analyze database queries"""
    
    def __init__(self):
        self.queries = []
        self.slow_queries = []
    
    def log_query(self, query: str, params: Any = None, duration: float = None):
        """Log a database query"""
        query_info = {
            'timestamp': datetime.now().isoformat(),
            'query': query,
            'params': params,
            'duration': duration
        }
        
        self.queries.append(query_info)
        
        # Keep only last 50 queries
        if len(self.queries) > 50:
            self.queries = self.queries[-50:]
        
        # Track slow queries (> 100ms)
        if duration and duration > 0.1:
            self.slow_queries.append(query_info)
            logger.warning(f"Slow query ({duration:.3f}s): {query[:100]}...")
        
        logger.debug(f"Query executed in {duration:.3f}s: {query[:100]}...")
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get database query statistics"""
        if not self.queries:
            return {'total_queries': 0}
        
        durations = [q['duration'] for q in self.queries if q['duration']]
        
        return {
            'total_queries': len(self.queries),
            'slow_queries_count': len(self.slow_queries),
            'average_duration': sum(durations) / len(durations) if durations else 0,
            'max_duration': max(durations) if durations else 0,
            'recent_queries': self.queries[-10:],
            'slow_queries': self.slow_queries[-5:]
        }


# Global database query logger
db_query_logger = DatabaseQueryLogger()


def debug_route(func: Callable) -> Callable:
    """Decorator for debugging Flask routes"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        # Log request details
        logger.debug(f"Route called: {request.method} {request.url}")
        logger.debug(f"Headers: {dict(request.headers)}")
        
        if request.is_json:
            logger.debug(f"JSON data: {request.get_json()}")
        elif request.form:
            logger.debug(f"Form data: {dict(request.form)}")
        
        # Execute route
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"Route completed in {duration:.3f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Route failed after {duration:.3f}s: {str(e)}")
            raise
    return wrapper


def get_system_health() -> Dict[str, Any]:
    """Get overall system health information"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get application metrics
        perf_stats = performance_monitor.get_stats()
        error_summary = error_tracker.get_error_summary()
        query_stats = db_query_logger.get_query_stats()
        
        return {
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_mb': memory.available / 1024 / 1024,
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / 1024 / 1024 / 1024
            },
            'application': perf_stats,
            'errors': error_summary,
            'database': query_stats
        }
    except Exception as e:
        logger.error(f"Error getting system health: {str(e)}")
        return {
            'status': 'error',
            'timestamp': datetime.now().isoformat(),
            'error': str(e)
        }


def log_analysis_request(user_id: Any, language: str, code_length: int, options: Dict[str, Any] = None):
    """
    Log an analysis request with relevant metadata

    Args:
        user_id: ID of the user making the request
        language: Programming language being analyzed
        code_length: Length of code in characters
        options: Analysis options dictionary
    """
    try:
        log_data = {
            'event': 'analysis_request',
            'user_id': user_id,
            'language': language,
            'code_length': code_length,
            'timestamp': datetime.now().isoformat()
        }

        # Add selected options if provided
        if options:
            log_data['options'] = {
                'model': options.get('model', 'default'),
                'team_mode': options.get('team_mode', False),
                'mentorship_mode': options.get('mentorship_mode', False),
                'security_focus': options.get('security_focus', False),
                'performance_focus': options.get('performance_focus', False)
            }

        logger.info(f"Analysis request: {log_data}")

    except Exception as e:
        logger.error(f"Error logging analysis request: {str(e)}")


def log_analysis_result(user_id: Any, overall_score: float, comment_count: int, analysis_type: str = 'standard'):
    """
    Log the result of an analysis

    Args:
        user_id: ID of the user who requested the analysis
        overall_score: Overall quality score (0-100)
        comment_count: Number of comments/suggestions generated
        analysis_type: Type of analysis performed
    """
    try:
        log_data = {
            'event': 'analysis_completed',
            'user_id': user_id,
            'overall_score': overall_score,
            'comment_count': comment_count,
            'analysis_type': analysis_type,
            'timestamp': datetime.now().isoformat()
        }

        logger.info(f"Analysis completed: {log_data}")

        # Track analysis quality metrics
        if overall_score < 50:
            logger.warning(f"Low quality code detected for user {user_id}: score {overall_score}")

    except Exception as e:
        logger.error(f"Error logging analysis result: {str(e)}")


def log_ai_api_call(model: str, prompt_tokens: int = 0, completion_tokens: int = 0, duration: float = 0):
    """
    Log AI API calls for monitoring and billing purposes

    Args:
        model: Name of the AI model used
        prompt_tokens: Number of tokens in the prompt
        completion_tokens: Number of tokens in the completion
        duration: API call duration in seconds
    """
    try:
        log_data = {
            'event': 'ai_api_call',
            'model': model,
            'prompt_tokens': prompt_tokens,
            'completion_tokens': completion_tokens,
            'total_tokens': prompt_tokens + completion_tokens,
            'duration': duration,
            'timestamp': datetime.now().isoformat()
        }

        logger.info(f"AI API call: {log_data}")

        # Warn on expensive calls
        total_tokens = prompt_tokens + completion_tokens
        if total_tokens > 50000:
            logger.warning(f"High token usage: {total_tokens} tokens for model {model}")

        if duration > 30:
            logger.warning(f"Slow AI API call: {duration:.2f}s for model {model}")

    except Exception as e:
        logger.error(f"Error logging AI API call: {str(e)}")


def log_user_activity(user_id: Any, activity_type: str, details: Dict[str, Any] = None):
    """
    Log user activity for analytics and auditing

    Args:
        user_id: ID of the user
        activity_type: Type of activity (login, review_created, etc.)
        details: Additional details about the activity
    """
    try:
        log_data = {
            'event': 'user_activity',
            'user_id': user_id,
            'activity_type': activity_type,
            'timestamp': datetime.now().isoformat()
        }

        if details:
            log_data['details'] = details

        logger.info(f"User activity: {log_data}")

    except Exception as e:
        logger.error(f"Error logging user activity: {str(e)}")


def create_debug_middleware(app):
    """Create debugging middleware for Flask app"""

    @app.before_request
    def before_request():
        performance_monitor.log_request_start()

    @app.after_request
    def after_request(response):
        performance_monitor.log_request_end(response.status_code)
        return response

    @app.errorhandler(Exception)
    def handle_exception(e):
        error_tracker.log_error(e)
        logger.error(f"Unhandled exception: {str(e)}")
        logger.debug(f"Traceback: {traceback.format_exc()}")

        # Return JSON error response
        return {
            'error': 'Internal server error',
            'message': str(e) if app.debug else 'An error occurred'
        }, 500

    # Add health check endpoint
    @app.route('/health')
    def health_check():
        return get_system_health()

    # Add debug info endpoint (only in debug mode)
    if app.debug:
        @app.route('/debug/stats')
        def debug_stats():
            return {
                'performance': performance_monitor.get_stats(),
                'errors': error_tracker.get_error_summary(),
                'database': db_query_logger.get_query_stats(),
                'system': get_system_health()
            }

    return app

