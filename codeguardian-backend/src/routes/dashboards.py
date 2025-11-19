"""
Custom Dashboards and Benchmarks routes for CodeGuardian

Provides customizable dashboards and industry benchmark comparisons.
"""

import logging
from typing import Any, Tuple, Dict, List
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

dashboards_bp = Blueprint('dashboards', __name__)


# In-memory dashboards (would be database in production)
_dashboards: Dict[int, Dict] = {}
_dashboard_counter = 0

# Available widgets
AVAILABLE_WIDGETS = [
    {'id': 'score_trend', 'name': 'Score Trend', 'type': 'chart', 'description': 'Code quality score over time'},
    {'id': 'issues_breakdown', 'name': 'Issues Breakdown', 'type': 'pie', 'description': 'Issues by category'},
    {'id': 'team_leaderboard', 'name': 'Team Leaderboard', 'type': 'table', 'description': 'Top contributors'},
    {'id': 'recent_reviews', 'name': 'Recent Reviews', 'type': 'list', 'description': 'Latest review activity'},
    {'id': 'health_gauge', 'name': 'Health Gauge', 'type': 'gauge', 'description': 'Repository health score'},
    {'id': 'coverage_chart', 'name': 'Coverage Chart', 'type': 'bar', 'description': 'Test coverage by module'},
    {'id': 'security_alerts', 'name': 'Security Alerts', 'type': 'list', 'description': 'Active security issues'},
    {'id': 'activity_heatmap', 'name': 'Activity Heatmap', 'type': 'heatmap', 'description': 'Review activity calendar'}
]


@dashboards_bp.route('/dashboards', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_dashboards() -> Tuple[Any, int]:
    """
    List user's dashboards.

    Returns:
        List of dashboards.
    """
    user = request.current_user

    user_dashboards = [d for d in _dashboards.values() if d['user_id'] == user.id]
    user_dashboards.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return APIResponse.success(
        data={'dashboards': user_dashboards, 'total': len(user_dashboards)},
        message=f"Found {len(user_dashboards)} dashboards"
    )


@dashboards_bp.route('/dashboards', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def create_dashboard() -> Tuple[Any, int]:
    """
    Create a new custom dashboard.

    Request Body:
        name (str): Dashboard name
        description (str, optional): Description
        widgets (list): List of widget configurations
        is_default (bool, optional): Set as default dashboard

    Returns:
        Created dashboard.
    """
    global _dashboard_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    name = RequestValidator.get_required_field(data, 'name', str)
    description = RequestValidator.get_optional_field(data, 'description', '', str)
    widgets = RequestValidator.get_optional_field(data, 'widgets', [], list)
    is_default = RequestValidator.get_optional_field(data, 'is_default', False, bool)

    _dashboard_counter += 1
    dashboard_id = _dashboard_counter

    dashboard = {
        'id': dashboard_id,
        'user_id': user.id,
        'name': name,
        'description': description,
        'widgets': widgets,
        'is_default': is_default,
        'is_shared': False,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }

    _dashboards[dashboard_id] = dashboard

    # If default, unset other defaults
    if is_default:
        for d in _dashboards.values():
            if d['user_id'] == user.id and d['id'] != dashboard_id:
                d['is_default'] = False

    return APIResponse.created(data=dashboard, message="Dashboard created")


@dashboards_bp.route('/dashboards/<int:dashboard_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_dashboard(dashboard_id: int) -> Tuple[Any, int]:
    """Get dashboard by ID."""
    user = request.current_user

    dashboard = _dashboards.get(dashboard_id)
    if not dashboard:
        raise NotFoundError("Dashboard", dashboard_id)

    if dashboard['user_id'] != user.id and not dashboard.get('is_shared'):
        raise ValidationError("Access denied")

    return APIResponse.success(data=dashboard, message="Dashboard retrieved")


@dashboards_bp.route('/dashboards/<int:dashboard_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_dashboard(dashboard_id: int) -> Tuple[Any, int]:
    """Update a dashboard."""
    user = request.current_user
    data = RequestValidator.get_json_body()

    dashboard = _dashboards.get(dashboard_id)
    if not dashboard or dashboard['user_id'] != user.id:
        raise NotFoundError("Dashboard", dashboard_id)

    # Update fields
    for field in ['name', 'description', 'widgets', 'is_default', 'is_shared']:
        if field in data:
            dashboard[field] = data[field]

    dashboard['updated_at'] = datetime.utcnow().isoformat()

    return APIResponse.success(data=dashboard, message="Dashboard updated")


@dashboards_bp.route('/dashboards/<int:dashboard_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_dashboard(dashboard_id: int) -> Tuple[Any, int]:
    """Delete a dashboard."""
    user = request.current_user

    dashboard = _dashboards.get(dashboard_id)
    if not dashboard or dashboard['user_id'] != user.id:
        raise NotFoundError("Dashboard", dashboard_id)

    del _dashboards[dashboard_id]

    return APIResponse.success(message="Dashboard deleted")


@dashboards_bp.route('/dashboards/<int:dashboard_id>/widgets', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def add_widget(dashboard_id: int) -> Tuple[Any, int]:
    """Add a widget to dashboard."""
    user = request.current_user
    data = RequestValidator.get_json_body()

    dashboard = _dashboards.get(dashboard_id)
    if not dashboard or dashboard['user_id'] != user.id:
        raise NotFoundError("Dashboard", dashboard_id)

    widget_id = RequestValidator.get_required_field(data, 'widget_id', str)
    position = RequestValidator.get_optional_field(data, 'position', {}, dict)
    config = RequestValidator.get_optional_field(data, 'config', {}, dict)

    widget = {
        'widget_id': widget_id,
        'position': position,
        'config': config,
        'added_at': datetime.utcnow().isoformat()
    }

    dashboard['widgets'].append(widget)
    dashboard['updated_at'] = datetime.utcnow().isoformat()

    return APIResponse.success(data=dashboard, message="Widget added")


@dashboards_bp.route('/dashboards/<int:dashboard_id>/share', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def share_dashboard(dashboard_id: int) -> Tuple[Any, int]:
    """Generate share link for dashboard."""
    user = request.current_user

    dashboard = _dashboards.get(dashboard_id)
    if not dashboard or dashboard['user_id'] != user.id:
        raise NotFoundError("Dashboard", dashboard_id)

    dashboard['is_shared'] = True
    share_token = f"share_{dashboard_id}_{datetime.utcnow().timestamp()}"

    return APIResponse.success(
        data={'share_url': f'/dashboards/shared/{share_token}', 'token': share_token},
        message="Dashboard shared"
    )


@dashboards_bp.route('/widgets', methods=['GET'])
@cross_origin()
@require_auth
@handle_errors
def get_available_widgets() -> Tuple[Any, int]:
    """Get available widgets for dashboards."""
    return APIResponse.success(
        data={'widgets': AVAILABLE_WIDGETS},
        message=f"Found {len(AVAILABLE_WIDGETS)} available widgets"
    )


@dashboards_bp.route('/widgets/<widget_id>/data', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_widget_data(widget_id: str) -> Tuple[Any, int]:
    """Get data for a specific widget."""
    # Generate widget data based on type
    widget_data = {
        'score_trend': {
            'data': [
                {'date': (datetime.utcnow() - timedelta(days=i)).strftime('%Y-%m-%d'),
                 'score': 75 + (i % 10)} for i in range(30, 0, -1)
            ]
        },
        'issues_breakdown': {
            'data': [
                {'category': 'Security', 'count': 15},
                {'category': 'Performance', 'count': 22},
                {'category': 'Maintainability', 'count': 18},
                {'category': 'Style', 'count': 45}
            ]
        },
        'team_leaderboard': {
            'data': [
                {'rank': 1, 'user': 'alice', 'score': 95.5, 'reviews': 45},
                {'rank': 2, 'user': 'bob', 'score': 92.0, 'reviews': 38},
                {'rank': 3, 'user': 'charlie', 'score': 88.5, 'reviews': 32}
            ]
        },
        'recent_reviews': {
            'data': [
                {'id': 1, 'repo': 'frontend', 'score': 88, 'time': '2 hours ago'},
                {'id': 2, 'repo': 'backend', 'score': 92, 'time': '4 hours ago'},
                {'id': 3, 'repo': 'api', 'score': 85, 'time': '1 day ago'}
            ]
        },
        'health_gauge': {
            'data': {'score': 82.5, 'trend': 'up', 'change': 3.5}
        }
    }

    data = widget_data.get(widget_id, {'data': []})

    return APIResponse.success(data=data, message="Widget data retrieved")


# Benchmarks

@dashboards_bp.route('/benchmarks/industry', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_industry_benchmarks() -> Tuple[Any, int]:
    """
    Get industry benchmark data.

    Query Parameters:
        industry (str): Industry filter
        language (str): Language filter

    Returns:
        Industry benchmark comparisons.
    """
    industry = request.args.get('industry', 'technology')
    language = request.args.get('language', '')

    benchmarks = {
        'industry': industry,
        'sample_size': 5000,
        'updated_at': datetime.utcnow().isoformat(),
        'metrics': {
            'code_quality': {
                'percentile_25': 68,
                'percentile_50': 78,
                'percentile_75': 86,
                'percentile_90': 92
            },
            'security': {
                'percentile_25': 72,
                'percentile_50': 82,
                'percentile_75': 89,
                'percentile_90': 95
            },
            'test_coverage': {
                'percentile_25': 45,
                'percentile_50': 65,
                'percentile_75': 80,
                'percentile_90': 90
            },
            'documentation': {
                'percentile_25': 50,
                'percentile_50': 68,
                'percentile_75': 82,
                'percentile_90': 92
            }
        }
    }

    return APIResponse.success(data=benchmarks, message="Industry benchmarks retrieved")


@dashboards_bp.route('/benchmarks/peers', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_peer_comparisons() -> Tuple[Any, int]:
    """
    Get peer comparison data (anonymized).

    Returns:
        Peer comparison metrics.
    """
    user = request.current_user

    # Simulated peer comparison
    comparison = {
        'your_score': 82.5,
        'peer_average': 78.0,
        'percentile': 72,
        'categories': {
            'code_quality': {'you': 85, 'peers': 78, 'percentile': 78},
            'security': {'you': 82, 'peers': 80, 'percentile': 62},
            'test_coverage': {'you': 70, 'peers': 68, 'percentile': 55},
            'documentation': {'you': 75, 'peers': 72, 'percentile': 58}
        },
        'trends': {
            'improving_faster': True,
            'weekly_change': 2.5,
            'peer_weekly_change': 1.2
        }
    }

    return APIResponse.success(data=comparison, message="Peer comparison retrieved")


@dashboards_bp.route('/benchmarks/history', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_benchmark_history() -> Tuple[Any, int]:
    """
    Get historical benchmark comparisons.

    Query Parameters:
        days (int): Number of days of history

    Returns:
        Historical benchmark data.
    """
    days = RequestValidator.get_int_param('days', 30, min_val=7, max_val=90)

    history = []
    for i in range(days, 0, -1):
        date = datetime.utcnow() - timedelta(days=i)
        history.append({
            'date': date.strftime('%Y-%m-%d'),
            'your_score': 75 + (i % 10),
            'industry_avg': 78,
            'peer_avg': 76 + (i % 5)
        })

    return APIResponse.success(
        data={'history': history, 'days': days},
        message="Benchmark history retrieved"
    )


@dashboards_bp.route('/benchmarks/report', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_benchmark_report() -> Tuple[Any, int]:
    """
    Generate comprehensive benchmark report.

    Returns:
        Full benchmark report.
    """
    user = request.current_user

    report = {
        'generated_at': datetime.utcnow().isoformat(),
        'summary': {
            'overall_percentile': 72,
            'strengths': ['Security', 'Code Quality'],
            'areas_for_improvement': ['Test Coverage', 'Documentation'],
            'trend': 'improving'
        },
        'recommendations': [
            {
                'category': 'Test Coverage',
                'message': 'Your test coverage is in the 55th percentile. Adding tests for critical paths could move you to 75th percentile.',
                'potential_gain': 20,
                'effort': 'medium'
            },
            {
                'category': 'Documentation',
                'message': 'Improving documentation would put you above 70% of peers.',
                'potential_gain': 15,
                'effort': 'low'
            }
        ],
        'achievements': [
            {'name': 'Security Leader', 'description': 'Top 25% in security'},
            {'name': 'Quality Champion', 'description': 'Above average code quality'}
        ]
    }

    return APIResponse.success(data=report, message="Benchmark report generated")
