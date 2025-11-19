"""
Repository Health Score routes for CodeGuardian

Provides comprehensive health metrics and scoring for repositories
including technical debt, dependency health, and security analysis.
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.user import User
from src.models.repository import Repository
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)


# Health score weights
HEALTH_WEIGHTS = {
    'code_quality': 0.25,
    'security': 0.25,
    'maintainability': 0.15,
    'test_coverage': 0.15,
    'dependencies': 0.10,
    'documentation': 0.10
}


# In-memory storage for health data (would be database in production)
_health_snapshots: Dict[int, List[Dict[str, Any]]] = {}
_technical_debt: Dict[int, Dict[str, Any]] = {}


@health_bp.route('/repositories/<int:repo_id>/health', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_repository_health(repo_id: int) -> Tuple[Any, int]:
    """
    Get comprehensive health score for a repository.

    Path Parameters:
        repo_id: ID of the repository

    Returns:
        Repository health metrics and scores.
    """
    user = request.current_user

    # Get repository (would verify ownership in production)
    repository = Repository.query.get(repo_id)
    if not repository:
        raise NotFoundError("Repository", repo_id)

    # Generate health report
    health = _calculate_repository_health(repo_id, repository)

    return APIResponse.success(
        data=health,
        message="Repository health score calculated"
    )


def _calculate_repository_health(repo_id: int, repository: Repository) -> Dict[str, Any]:
    """Calculate comprehensive health metrics for a repository."""
    now = datetime.utcnow()

    # Individual category scores (simulated - would come from actual analysis)
    categories = {
        'code_quality': _calculate_code_quality_score(repo_id),
        'security': _calculate_security_score(repo_id),
        'maintainability': _calculate_maintainability_score(repo_id),
        'test_coverage': _calculate_test_coverage_score(repo_id),
        'dependencies': _calculate_dependency_score(repo_id),
        'documentation': _calculate_documentation_score(repo_id)
    }

    # Calculate overall score
    overall_score = sum(
        score['score'] * HEALTH_WEIGHTS[category]
        for category, score in categories.items()
    )

    # Get grade
    grade = _score_to_grade(overall_score)

    # Get trend (compared to last week)
    trend = _calculate_trend(repo_id, overall_score)

    # Get recommendations
    recommendations = _generate_recommendations(categories)

    # Get technical debt estimate
    tech_debt = _estimate_technical_debt(repo_id, categories)

    return {
        'repository': {
            'id': repo_id,
            'name': repository.name if repository else f'repo-{repo_id}',
            'url': repository.url if repository else None
        },
        'overall': {
            'score': round(overall_score, 1),
            'grade': grade,
            'trend': trend,
            'last_updated': now.isoformat()
        },
        'categories': categories,
        'technical_debt': tech_debt,
        'recommendations': recommendations,
        'badges': _get_earned_badges(categories)
    }


def _calculate_code_quality_score(repo_id: int) -> Dict[str, Any]:
    """Calculate code quality score."""
    # Simulated metrics
    return {
        'score': 82.5,
        'grade': 'B',
        'metrics': {
            'complexity': {'value': 8.2, 'target': 10, 'status': 'good'},
            'duplication': {'value': 3.5, 'target': 5, 'status': 'good'},
            'code_smells': {'value': 12, 'target': 20, 'status': 'good'},
            'bugs': {'value': 2, 'target': 0, 'status': 'warning'}
        },
        'issues': [
            {
                'type': 'bug',
                'severity': 'medium',
                'file': 'src/utils/parser.py',
                'line': 45,
                'message': 'Potential null reference'
            },
            {
                'type': 'code_smell',
                'severity': 'low',
                'file': 'src/services/user.py',
                'line': 120,
                'message': 'Function has too many parameters'
            }
        ]
    }


def _calculate_security_score(repo_id: int) -> Dict[str, Any]:
    """Calculate security score."""
    return {
        'score': 78.0,
        'grade': 'C',
        'metrics': {
            'vulnerabilities': {'critical': 0, 'high': 1, 'medium': 3, 'low': 5},
            'exposed_secrets': {'value': 0, 'status': 'good'},
            'unsafe_dependencies': {'value': 2, 'status': 'warning'}
        },
        'issues': [
            {
                'type': 'vulnerability',
                'severity': 'high',
                'title': 'SQL Injection Risk',
                'file': 'src/database.py',
                'line': 78,
                'cve': None,
                'fix_available': True
            },
            {
                'type': 'dependency',
                'severity': 'medium',
                'package': 'requests',
                'current_version': '2.25.0',
                'recommended_version': '2.31.0',
                'vulnerabilities': ['CVE-2023-32681']
            }
        ]
    }


def _calculate_maintainability_score(repo_id: int) -> Dict[str, Any]:
    """Calculate maintainability score."""
    return {
        'score': 85.0,
        'grade': 'B',
        'metrics': {
            'avg_function_length': {'value': 25, 'target': 30, 'status': 'good'},
            'avg_file_length': {'value': 180, 'target': 250, 'status': 'good'},
            'cyclomatic_complexity': {'value': 6.5, 'target': 10, 'status': 'good'},
            'cognitive_complexity': {'value': 12, 'target': 15, 'status': 'good'}
        },
        'hotspots': [
            {
                'file': 'src/services/review.py',
                'complexity': 18,
                'reason': 'High cyclomatic complexity',
                'priority': 'medium'
            }
        ]
    }


def _calculate_test_coverage_score(repo_id: int) -> Dict[str, Any]:
    """Calculate test coverage score."""
    return {
        'score': 72.0,
        'grade': 'C',
        'metrics': {
            'line_coverage': {'value': 68, 'target': 80, 'status': 'warning'},
            'branch_coverage': {'value': 55, 'target': 70, 'status': 'warning'},
            'function_coverage': {'value': 78, 'target': 80, 'status': 'good'}
        },
        'uncovered_files': [
            {'file': 'src/routes/webhooks.py', 'coverage': 45},
            {'file': 'src/services/ai.py', 'coverage': 52}
        ]
    }


def _calculate_dependency_score(repo_id: int) -> Dict[str, Any]:
    """Calculate dependency health score."""
    return {
        'score': 88.0,
        'grade': 'B',
        'metrics': {
            'total_dependencies': 45,
            'outdated': 8,
            'deprecated': 0,
            'unused': 2
        },
        'outdated_dependencies': [
            {
                'name': 'flask',
                'current': '2.2.0',
                'latest': '3.0.0',
                'breaking_changes': True
            },
            {
                'name': 'sqlalchemy',
                'current': '1.4.0',
                'latest': '2.0.0',
                'breaking_changes': True
            }
        ]
    }


def _calculate_documentation_score(repo_id: int) -> Dict[str, Any]:
    """Calculate documentation score."""
    return {
        'score': 75.0,
        'grade': 'C',
        'metrics': {
            'readme_quality': {'value': 85, 'status': 'good'},
            'docstring_coverage': {'value': 65, 'target': 80, 'status': 'warning'},
            'api_documentation': {'value': 70, 'status': 'warning'},
            'inline_comments': {'value': 78, 'status': 'good'}
        },
        'missing_docs': [
            {'type': 'function', 'name': 'process_review', 'file': 'src/services/review.py'},
            {'type': 'class', 'name': 'WebhookHandler', 'file': 'src/handlers/webhook.py'}
        ]
    }


def _score_to_grade(score: float) -> str:
    """Convert numeric score to letter grade."""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'


def _calculate_trend(repo_id: int, current_score: float) -> Dict[str, Any]:
    """Calculate score trend over time."""
    # Simulated trend data
    previous_score = 78.5  # Would come from historical data

    change = current_score - previous_score
    direction = 'up' if change > 0 else 'down' if change < 0 else 'stable'

    return {
        'direction': direction,
        'change': round(abs(change), 1),
        'previous_score': previous_score,
        'period': '7 days'
    }


def _generate_recommendations(categories: Dict[str, Dict]) -> List[Dict[str, Any]]:
    """Generate actionable recommendations based on scores."""
    recommendations = []

    # Check each category for issues
    for category, data in categories.items():
        score = data['score']

        if score < 70:
            priority = 'high'
        elif score < 80:
            priority = 'medium'
        else:
            continue  # Skip good scores

        if category == 'code_quality':
            recommendations.append({
                'category': category,
                'priority': priority,
                'title': 'Improve Code Quality',
                'description': 'Address code smells and reduce complexity',
                'actions': [
                    'Refactor functions with high complexity',
                    'Remove duplicate code',
                    'Fix identified bugs'
                ],
                'estimated_effort': '2-3 days'
            })

        elif category == 'security':
            recommendations.append({
                'category': category,
                'priority': 'high',  # Security is always high priority
                'title': 'Address Security Vulnerabilities',
                'description': 'Fix security issues to protect the application',
                'actions': [
                    'Update vulnerable dependencies',
                    'Fix SQL injection vulnerabilities',
                    'Implement input validation'
                ],
                'estimated_effort': '1-2 days'
            })

        elif category == 'test_coverage':
            recommendations.append({
                'category': category,
                'priority': priority,
                'title': 'Increase Test Coverage',
                'description': 'Add tests for critical paths',
                'actions': [
                    'Write unit tests for uncovered functions',
                    'Add integration tests for API endpoints',
                    'Implement edge case testing'
                ],
                'estimated_effort': '3-5 days'
            })

        elif category == 'documentation':
            recommendations.append({
                'category': category,
                'priority': priority,
                'title': 'Improve Documentation',
                'description': 'Add missing documentation',
                'actions': [
                    'Add docstrings to undocumented functions',
                    'Update API documentation',
                    'Create developer guides'
                ],
                'estimated_effort': '1-2 days'
            })

    # Sort by priority
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    recommendations.sort(key=lambda x: priority_order.get(x['priority'], 3))

    return recommendations


def _estimate_technical_debt(repo_id: int, categories: Dict) -> Dict[str, Any]:
    """Estimate technical debt for the repository."""
    # Calculate debt based on issues
    debt_hours = 0
    debt_items = []

    for category, data in categories.items():
        issues = data.get('issues', []) + data.get('hotspots', []) + data.get('missing_docs', [])

        for issue in issues:
            severity = issue.get('severity', issue.get('priority', 'medium'))
            hours = {'critical': 4, 'high': 2, 'medium': 1, 'low': 0.5}.get(severity, 1)
            debt_hours += hours

            debt_items.append({
                'category': category,
                'item': issue.get('message', issue.get('title', issue.get('type', 'Issue'))),
                'hours': hours
            })

    return {
        'total_hours': round(debt_hours, 1),
        'total_days': round(debt_hours / 8, 1),
        'items': debt_items[:10],  # Top 10 items
        'cost_estimate': f"${int(debt_hours * 100)}",  # Assuming $100/hour
        'trend': 'increasing'  # Would be calculated from historical data
    }


def _get_earned_badges(categories: Dict) -> List[Dict[str, str]]:
    """Get badges earned based on scores."""
    badges = []

    if categories['security']['score'] >= 90:
        badges.append({
            'id': 'security_champion',
            'name': 'Security Champion',
            'description': 'Achieved 90%+ security score',
            'icon': '🛡️'
        })

    if categories['test_coverage']['score'] >= 80:
        badges.append({
            'id': 'well_tested',
            'name': 'Well Tested',
            'description': '80%+ test coverage',
            'icon': '🧪'
        })

    if categories['documentation']['score'] >= 85:
        badges.append({
            'id': 'well_documented',
            'name': 'Well Documented',
            'description': 'Excellent documentation',
            'icon': '📚'
        })

    if categories['maintainability']['score'] >= 85:
        badges.append({
            'id': 'clean_code',
            'name': 'Clean Code',
            'description': 'High maintainability score',
            'icon': '✨'
        })

    if all(cat['score'] >= 80 for cat in categories.values()):
        badges.append({
            'id': 'all_rounder',
            'name': 'All-Rounder',
            'description': '80%+ in all categories',
            'icon': '🏆'
        })

    return badges


@health_bp.route('/repositories/<int:repo_id>/health/history', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_health_history(repo_id: int) -> Tuple[Any, int]:
    """
    Get historical health scores for a repository.

    Path Parameters:
        repo_id: ID of the repository

    Query Parameters:
        days (int): Number of days of history (default: 30)

    Returns:
        Historical health data.
    """
    days = RequestValidator.get_int_param('days', 30, min_val=1, max_val=365)

    # Generate historical data (simulated)
    history = []
    base_score = 75.0
    now = datetime.utcnow()

    for i in range(days, 0, -1):
        date = now - timedelta(days=i)
        # Simulate gradual improvement
        score = min(100, base_score + (days - i) * 0.2 + (i % 5))

        history.append({
            'date': date.strftime('%Y-%m-%d'),
            'score': round(score, 1),
            'grade': _score_to_grade(score)
        })

    return APIResponse.success(
        data={
            'repository_id': repo_id,
            'history': history,
            'period': f'{days} days'
        },
        message=f"Health history for {days} days"
    )


@health_bp.route('/repositories/<int:repo_id>/health/dependencies', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_dependency_analysis(repo_id: int) -> Tuple[Any, int]:
    """
    Get detailed dependency analysis for a repository.

    Path Parameters:
        repo_id: ID of the repository

    Returns:
        Dependency analysis data.
    """
    # Simulated dependency analysis
    analysis = {
        'summary': {
            'total': 45,
            'direct': 20,
            'transitive': 25,
            'outdated': 8,
            'vulnerable': 2,
            'deprecated': 0
        },
        'dependencies': [
            {
                'name': 'flask',
                'version': '2.2.0',
                'latest': '3.0.0',
                'type': 'direct',
                'license': 'BSD-3-Clause',
                'vulnerabilities': [],
                'outdated': True,
                'update_type': 'major'
            },
            {
                'name': 'requests',
                'version': '2.25.0',
                'latest': '2.31.0',
                'type': 'direct',
                'license': 'Apache-2.0',
                'vulnerabilities': ['CVE-2023-32681'],
                'outdated': True,
                'update_type': 'minor'
            },
            {
                'name': 'sqlalchemy',
                'version': '1.4.0',
                'latest': '2.0.23',
                'type': 'direct',
                'license': 'MIT',
                'vulnerabilities': [],
                'outdated': True,
                'update_type': 'major'
            }
        ],
        'security_advisories': [
            {
                'package': 'requests',
                'cve': 'CVE-2023-32681',
                'severity': 'medium',
                'title': 'Unintended leak of Proxy-Authorization header',
                'fix': 'Upgrade to 2.31.0'
            }
        ],
        'recommendations': [
            'Update requests to fix security vulnerability',
            'Consider upgrading Flask to version 3.x for new features',
            'SQLAlchemy 2.0 has breaking changes - plan migration carefully'
        ]
    }

    return APIResponse.success(
        data=analysis,
        message="Dependency analysis complete"
    )


@health_bp.route('/repositories/<int:repo_id>/health/scan', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def trigger_health_scan(repo_id: int) -> Tuple[Any, int]:
    """
    Trigger a new health scan for a repository.

    Path Parameters:
        repo_id: ID of the repository

    Returns:
        Scan status.
    """
    user = request.current_user

    # Verify repository exists
    repository = Repository.query.get(repo_id)
    if not repository:
        raise NotFoundError("Repository", repo_id)

    # In production, this would queue a background job
    logger.info(f"User {user.id} triggered health scan for repository {repo_id}")

    return APIResponse.accepted(
        data={
            'repository_id': repo_id,
            'scan_id': f'scan_{repo_id}_{datetime.utcnow().timestamp()}',
            'status': 'queued',
            'estimated_completion': (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        },
        message="Health scan queued successfully"
    )


@health_bp.route('/health/compare', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def compare_repositories() -> Tuple[Any, int]:
    """
    Compare health scores of multiple repositories.

    Request Body:
        repository_ids (list): List of repository IDs to compare

    Returns:
        Comparison data.
    """
    data = RequestValidator.get_json_body()
    repo_ids = RequestValidator.get_required_field(data, 'repository_ids', list)

    if len(repo_ids) < 2:
        raise ValidationError("At least 2 repositories required for comparison")
    if len(repo_ids) > 10:
        raise ValidationError("Maximum 10 repositories can be compared")

    # Generate comparison data
    comparisons = []

    for repo_id in repo_ids:
        repository = Repository.query.get(repo_id)
        repo_name = repository.name if repository else f'repo-{repo_id}'

        # Simulated scores
        comparisons.append({
            'repository_id': repo_id,
            'name': repo_name,
            'overall_score': 75 + (repo_id % 20),
            'categories': {
                'code_quality': 80 + (repo_id % 15),
                'security': 75 + (repo_id % 20),
                'maintainability': 82 + (repo_id % 12),
                'test_coverage': 70 + (repo_id % 25),
                'dependencies': 85 + (repo_id % 10),
                'documentation': 72 + (repo_id % 18)
            }
        })

    # Find best/worst in each category
    insights = {
        'best_overall': max(comparisons, key=lambda x: x['overall_score'])['name'],
        'needs_most_work': min(comparisons, key=lambda x: x['overall_score'])['name'],
        'category_leaders': {}
    }

    for category in ['code_quality', 'security', 'maintainability', 'test_coverage']:
        leader = max(comparisons, key=lambda x: x['categories'][category])
        insights['category_leaders'][category] = leader['name']

    return APIResponse.success(
        data={
            'comparisons': comparisons,
            'insights': insights
        },
        message=f"Compared {len(repo_ids)} repositories"
    )
