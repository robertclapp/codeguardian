"""
Analytics routes for CodeGuardian

Provides dashboard data, trends, and insights for code quality metrics.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple
from flask import Blueprint, request
from flask_cors import cross_origin
from sqlalchemy import func, and_

from src.database import db
from src.models.review import Review, ReviewComment
from src.models.repository import Repository, PullRequest
from src.models.user import User
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request
from src.validation import RequestValidator
from src.constants import ReviewConfig

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/dashboard', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_dashboard() -> Tuple[Any, int]:
    """
    Get comprehensive dashboard data for the authenticated user.

    Query Parameters:
        days (int): Number of days to include in analysis (default: 30)

    Returns:
        Dashboard data including overview metrics, trends, and insights.
    """
    user = request.current_user
    days = RequestValidator.get_int_param(
        'days',
        ReviewConfig.STATS_DEFAULT_DAYS,
        min_val=1,
        max_val=ReviewConfig.MAX_STATS_DAYS
    )

    start_date = datetime.utcnow() - timedelta(days=days)

    # Get user's reviews
    reviews_query = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user.id,
        Review.created_at >= start_date
    )

    reviews = reviews_query.all()
    total_reviews = len(reviews)

    # Calculate overview metrics
    if total_reviews > 0:
        avg_score = sum(r.overall_score or 0 for r in reviews) / total_reviews
        avg_security = sum(r.security_score or 0 for r in reviews) / total_reviews
        avg_performance = sum(r.performance_score or 0 for r in reviews) / total_reviews
        avg_maintainability = sum(r.maintainability_score or 0 for r in reviews) / total_reviews
    else:
        avg_score = avg_security = avg_performance = avg_maintainability = 0

    # Count issues fixed (comments with suggestions applied)
    issues_fixed = db.session.query(func.count(ReviewComment.id)).join(
        Review
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user.id,
        Review.created_at >= start_date,
        ReviewComment.severity.in_(['high', 'critical'])
    ).scalar() or 0

    # Calculate time saved (estimate: 5 minutes per issue)
    time_saved_hours = round(issues_fixed * 5 / 60, 1)

    # Get daily scores for trend chart
    daily_scores = _calculate_daily_scores(user.id, start_date)

    # Get category breakdown
    category_breakdown = {
        'security': round(avg_security, 1),
        'performance': round(avg_performance, 1),
        'maintainability': round(avg_maintainability, 1)
    }

    # Get top issues
    top_issues = _get_top_issues(user.id, start_date)

    # Get improvement trend
    improvement = _calculate_improvement(user.id, days)

    dashboard_data = {
        'overview': {
            'total_reviews': total_reviews,
            'avg_score': round(avg_score, 1),
            'issues_fixed': issues_fixed,
            'time_saved_hours': time_saved_hours
        },
        'recent_scores': daily_scores,
        'category_breakdown': category_breakdown,
        'top_issues': top_issues,
        'improvement': improvement,
        'period_days': days
    }

    return APIResponse.success(
        data=dashboard_data,
        message=f"Dashboard data for last {days} days"
    )


@analytics_bp.route('/trends', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_trends() -> Tuple[Any, int]:
    """
    Get historical trend data for code quality metrics.

    Query Parameters:
        days (int): Number of days to include (default: 30)
        metric (str): Specific metric to analyze (optional)

    Returns:
        Trend data with daily/weekly breakdowns.
    """
    user = request.current_user
    days = RequestValidator.get_int_param(
        'days',
        ReviewConfig.STATS_DEFAULT_DAYS,
        min_val=7,
        max_val=ReviewConfig.MAX_STATS_DAYS
    )
    metric = RequestValidator.get_enum_param(
        'metric',
        {'overall', 'security', 'performance', 'maintainability'},
        default='overall'
    )

    start_date = datetime.utcnow() - timedelta(days=days)

    # Get daily metrics
    daily_metrics = _calculate_daily_scores(user.id, start_date, metric)

    # Calculate weekly averages
    weekly_metrics = _calculate_weekly_averages(daily_metrics)

    # Calculate trend direction
    trend_direction = 'stable'
    if len(daily_metrics) >= 7:
        first_week_avg = sum(d['score'] for d in daily_metrics[:7]) / 7
        last_week_avg = sum(d['score'] for d in daily_metrics[-7:]) / 7
        diff = last_week_avg - first_week_avg
        if diff > 2:
            trend_direction = 'improving'
        elif diff < -2:
            trend_direction = 'declining'

    trends_data = {
        'daily': daily_metrics,
        'weekly': weekly_metrics,
        'trend_direction': trend_direction,
        'metric': metric,
        'period_days': days
    }

    return APIResponse.success(
        data=trends_data,
        message=f"{metric.title()} trends for last {days} days"
    )


@analytics_bp.route('/repositories', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_repository_analytics() -> Tuple[Any, int]:
    """
    Get analytics breakdown by repository.

    Returns:
        Analytics data for each repository.
    """
    user = request.current_user
    days = RequestValidator.get_int_param('days', 30, min_val=1, max_val=365)

    start_date = datetime.utcnow() - timedelta(days=days)

    # Get repositories with review stats
    repos = db.session.query(Repository).filter(
        Repository.user_id == user.id
    ).all()

    repo_analytics = []
    for repo in repos:
        # Get review stats for this repo
        repo_reviews = db.session.query(Review).join(
            PullRequest
        ).filter(
            PullRequest.repository_id == repo.id,
            Review.created_at >= start_date
        ).all()

        if repo_reviews:
            avg_score = sum(r.overall_score or 0 for r in repo_reviews) / len(repo_reviews)
            total_issues = db.session.query(func.count(ReviewComment.id)).join(
                Review
            ).filter(
                Review.id.in_([r.id for r in repo_reviews])
            ).scalar() or 0
        else:
            avg_score = 0
            total_issues = 0

        repo_analytics.append({
            'repository_id': repo.id,
            'name': repo.name,
            'full_name': repo.full_name,
            'review_count': len(repo_reviews),
            'avg_score': round(avg_score, 1),
            'total_issues': total_issues,
            'language': repo.language
        })

    # Sort by review count
    repo_analytics.sort(key=lambda x: x['review_count'], reverse=True)

    return APIResponse.success(
        data={'repositories': repo_analytics},
        message=f"Analytics for {len(repos)} repositories"
    )


@analytics_bp.route('/leaderboard', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_leaderboard() -> Tuple[Any, int]:
    """
    Get leaderboard data for gamification.

    Returns:
        User rankings and achievement data.
    """
    user = request.current_user
    days = RequestValidator.get_int_param('days', 30, min_val=7, max_val=90)

    start_date = datetime.utcnow() - timedelta(days=days)

    # Calculate user's stats
    user_reviews = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user.id,
        Review.created_at >= start_date
    ).all()

    if user_reviews:
        user_avg_score = sum(r.overall_score or 0 for r in user_reviews) / len(user_reviews)
        user_review_count = len(user_reviews)
    else:
        user_avg_score = 0
        user_review_count = 0

    # Calculate points (simplified scoring)
    points = int(user_avg_score * user_review_count)

    # Determine badges
    badges = _calculate_badges(user.id, user_reviews)

    # Calculate streak (consecutive days with reviews)
    streak = _calculate_review_streak(user.id)

    leaderboard_data = {
        'user_stats': {
            'points': points,
            'avg_score': round(user_avg_score, 1),
            'review_count': user_review_count,
            'streak_days': streak
        },
        'badges': badges,
        'achievements': _get_recent_achievements(user.id),
        'rank': 1,  # Simplified - would calculate actual rank
        'period_days': days
    }

    return APIResponse.success(
        data=leaderboard_data,
        message="Leaderboard data retrieved"
    )


@analytics_bp.route('/export', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def export_analytics() -> Tuple[Any, int]:
    """
    Export analytics data in various formats.

    Request Body:
        format (str): Export format (json, csv)
        days (int): Number of days to export

    Returns:
        Exported data or download URL.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    export_format = data.get('format', 'json')
    days = data.get('days', 30)

    if export_format not in ['json', 'csv']:
        from src.exceptions import ValidationError
        raise ValidationError("Format must be 'json' or 'csv'", field='format')

    start_date = datetime.utcnow() - timedelta(days=days)

    # Get all review data for export
    reviews = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user.id,
        Review.created_at >= start_date
    ).order_by(Review.created_at.desc()).all()

    export_data = []
    for review in reviews:
        export_data.append({
            'date': review.created_at.isoformat(),
            'repository': review.pull_request.repository.full_name,
            'pr_number': review.pull_request.number,
            'overall_score': review.overall_score,
            'security_score': review.security_score,
            'performance_score': review.performance_score,
            'maintainability_score': review.maintainability_score,
            'status': review.status
        })

    return APIResponse.success(
        data={
            'format': export_format,
            'record_count': len(export_data),
            'data': export_data
        },
        message=f"Exported {len(export_data)} records"
    )


# Helper functions

def _calculate_daily_scores(
    user_id: int,
    start_date: datetime,
    metric: str = 'overall'
) -> List[Dict[str, Any]]:
    """Calculate daily score averages."""
    score_column = {
        'overall': Review.overall_score,
        'security': Review.security_score,
        'performance': Review.performance_score,
        'maintainability': Review.maintainability_score
    }.get(metric, Review.overall_score)

    results = db.session.query(
        func.date(Review.created_at).label('date'),
        func.avg(score_column).label('avg_score'),
        func.count(Review.id).label('count')
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user_id,
        Review.created_at >= start_date,
        score_column.isnot(None)
    ).group_by(
        func.date(Review.created_at)
    ).order_by('date').all()

    return [
        {
            'date': str(r.date),
            'score': round(float(r.avg_score or 0), 1),
            'count': r.count
        }
        for r in results
    ]


def _calculate_weekly_averages(daily_scores: List[Dict]) -> List[Dict[str, Any]]:
    """Calculate weekly averages from daily scores."""
    if not daily_scores:
        return []

    weekly = {}
    for day in daily_scores:
        # Get week start (Monday)
        date = datetime.strptime(day['date'], '%Y-%m-%d')
        week_start = date - timedelta(days=date.weekday())
        week_key = week_start.strftime('%Y-%m-%d')

        if week_key not in weekly:
            weekly[week_key] = {'total': 0, 'count': 0}

        weekly[week_key]['total'] += day['score']
        weekly[week_key]['count'] += 1

    return [
        {
            'week_start': week,
            'score': round(data['total'] / data['count'], 1)
        }
        for week, data in sorted(weekly.items())
    ]


def _get_top_issues(user_id: int, start_date: datetime) -> List[Dict[str, Any]]:
    """Get most common issue types."""
    results = db.session.query(
        ReviewComment.category,
        func.count(ReviewComment.id).label('count')
    ).join(
        Review
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user_id,
        Review.created_at >= start_date,
        ReviewComment.category.isnot(None)
    ).group_by(
        ReviewComment.category
    ).order_by(func.count(ReviewComment.id).desc()).limit(5).all()

    return [
        {'type': r.category, 'count': r.count}
        for r in results
    ]


def _calculate_improvement(user_id: int, days: int) -> Dict[str, Any]:
    """Calculate improvement compared to previous period."""
    now = datetime.utcnow()
    current_start = now - timedelta(days=days)
    previous_start = current_start - timedelta(days=days)

    # Current period average
    current_avg = db.session.query(
        func.avg(Review.overall_score)
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user_id,
        Review.created_at >= current_start
    ).scalar() or 0

    # Previous period average
    previous_avg = db.session.query(
        func.avg(Review.overall_score)
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user_id,
        Review.created_at >= previous_start,
        Review.created_at < current_start
    ).scalar() or 0

    change = current_avg - previous_avg
    percentage = (change / previous_avg * 100) if previous_avg > 0 else 0

    return {
        'current_avg': round(float(current_avg), 1),
        'previous_avg': round(float(previous_avg), 1),
        'change': round(float(change), 1),
        'percentage': round(float(percentage), 1)
    }


def _calculate_badges(user_id: int, reviews: List[Review]) -> List[Dict[str, Any]]:
    """Calculate earned badges based on performance."""
    badges = []

    if not reviews:
        return badges

    avg_score = sum(r.overall_score or 0 for r in reviews) / len(reviews)
    avg_security = sum(r.security_score or 0 for r in reviews) / len(reviews)

    # Score-based badges
    if avg_score >= 90:
        badges.append({
            'id': 'code_master',
            'name': 'Code Master',
            'description': 'Maintained 90+ average score',
            'icon': '🏆'
        })
    elif avg_score >= 80:
        badges.append({
            'id': 'quality_coder',
            'name': 'Quality Coder',
            'description': 'Maintained 80+ average score',
            'icon': '⭐'
        })

    # Security badge
    if avg_security >= 95:
        badges.append({
            'id': 'security_champion',
            'name': 'Security Champion',
            'description': 'Excellent security practices',
            'icon': '🛡️'
        })

    # Volume badge
    if len(reviews) >= 50:
        badges.append({
            'id': 'prolific_reviewer',
            'name': 'Prolific Reviewer',
            'description': '50+ reviews completed',
            'icon': '📊'
        })
    elif len(reviews) >= 10:
        badges.append({
            'id': 'active_reviewer',
            'name': 'Active Reviewer',
            'description': '10+ reviews completed',
            'icon': '✅'
        })

    return badges


def _calculate_review_streak(user_id: int) -> int:
    """Calculate consecutive days with reviews."""
    # Get dates with reviews
    dates = db.session.query(
        func.date(Review.created_at).label('review_date')
    ).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Repository.user_id == user_id
    ).distinct().order_by(
        func.date(Review.created_at).desc()
    ).all()

    if not dates:
        return 0

    streak = 1
    today = datetime.utcnow().date()
    expected_date = today

    for row in dates:
        review_date = row.review_date
        if review_date == expected_date or review_date == expected_date - timedelta(days=1):
            if review_date != expected_date:
                streak += 1
                expected_date = review_date
        else:
            break

    return streak


def _get_recent_achievements(user_id: int) -> List[Dict[str, Any]]:
    """Get recent achievements (simplified)."""
    # This would be expanded with a proper achievements system
    return [
        {
            'id': 'first_review',
            'name': 'First Review',
            'description': 'Completed your first code review',
            'earned_at': '2025-10-28T10:00:00'
        }
    ]
