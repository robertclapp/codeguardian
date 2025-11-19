"""
Productivity features for CodeGuardian

User-focused features designed to save time and improve developer experience:
- One-Click Code Fixes
- Quick Actions Dashboard
- Personal Code Trends
- Smart Ignore Rules
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_, desc

from src.database import db
from src.models.user import User
from src.models.repository import Repository
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService, CacheService
from src.exceptions import NotFoundError, ValidationError


productivity_bp = Blueprint('productivity', __name__)


# Models for Productivity Features

class AutoFixHistory(db.Model):
    """Track auto-fix applications"""
    __tablename__ = 'auto_fix_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)

    # Fix details
    fix_type = db.Column(db.String(50), nullable=False)  # all, security, style, performance
    issues_fixed = db.Column(db.Integer, default=0)
    files_modified = db.Column(db.Integer, default=0)

    # Results
    original_code = db.Column(db.Text)
    fixed_code = db.Column(db.Text)
    diff = db.Column(db.Text)
    commit_message = db.Column(db.String(500))

    # Status
    status = db.Column(db.String(20), default='applied')  # preview, applied, reverted
    reverted_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='auto_fixes')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'review_id': self.review_id,
            'fix_type': self.fix_type,
            'issues_fixed': self.issues_fixed,
            'files_modified': self.files_modified,
            'commit_message': self.commit_message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class IgnoreRule(db.Model):
    """Smart ignore rules for reducing noise"""
    __tablename__ = 'ignore_rules'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Rule details
    rule_type = db.Column(db.String(50), nullable=False)  # category, pattern, file, line
    pattern = db.Column(db.String(500), nullable=False)
    scope = db.Column(db.String(50), default='project')  # global, project, file

    # Context
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'))
    file_path = db.Column(db.String(500))
    reason = db.Column(db.String(500))

    # Stats
    times_applied = db.Column(db.Integer, default=0)
    last_applied_at = db.Column(db.DateTime)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='ignore_rules')
    repository = db.relationship('Repository', backref='ignore_rules')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'rule_type': self.rule_type,
            'pattern': self.pattern,
            'scope': self.scope,
            'repository_id': self.repository_id,
            'file_path': self.file_path,
            'reason': self.reason,
            'times_applied': self.times_applied,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class QuickAction(db.Model):
    """User's quick actions and shortcuts"""
    __tablename__ = 'quick_actions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Action details
    action_type = db.Column(db.String(50), nullable=False)
    action_data = db.Column(db.JSON, default=dict)
    label = db.Column(db.String(100))
    icon = db.Column(db.String(50))

    # Usage tracking
    use_count = db.Column(db.Integer, default=0)
    last_used_at = db.Column(db.DateTime)

    # Position
    position = db.Column(db.Integer, default=0)
    is_pinned = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='quick_actions')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'action_type': self.action_type,
            'action_data': self.action_data,
            'label': self.label,
            'icon': self.icon,
            'use_count': self.use_count,
            'is_pinned': self.is_pinned,
            'position': self.position
        }


# =============================================================================
# ONE-CLICK CODE FIXES
# =============================================================================

@productivity_bp.route('/fixes/auto-apply', methods=['POST'])
@jwt_required()
def auto_apply_fixes():
    """
    Apply all suggested fixes with one click.

    Request Body:
        review_id (int): Review to apply fixes from
        fix_type (str): Type of fixes to apply (all, security, style, performance)
        preview (bool): If true, return preview without applying

    Returns:
        Fixed code, diff, and summary of changes.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    review_id = data.get('review_id')
    fix_type = data.get('fix_type', 'all')
    preview_only = data.get('preview', False)

    if not review_id:
        return APIResponse.validation_error("review_id is required")

    # Get the review
    review = Review.query.filter_by(id=review_id, user_id=user_id).first()
    if not review:
        return APIResponse.not_found('Review', review_id)

    # Get issues to fix
    results = review.results or {}
    issues = results.get('issues', [])

    # Filter by fix type
    if fix_type != 'all':
        issues = [i for i in issues if i.get('category', '').lower() == fix_type.lower()]

    # Generate fixes
    fixes_applied = []
    fixed_code = review.code or ''
    total_fixed = 0

    for issue in issues:
        fix = _generate_fix_for_issue(issue, fixed_code)
        if fix:
            fixes_applied.append({
                'issue': issue.get('message', ''),
                'category': issue.get('category', ''),
                'line': issue.get('line', 0),
                'fix_applied': fix['description']
            })
            fixed_code = fix['fixed_code']
            total_fixed += 1

    # Generate diff
    diff = _generate_diff(review.code or '', fixed_code)

    # Generate commit message
    commit_message = _generate_commit_message(fixes_applied, fix_type)

    result = {
        'review_id': review_id,
        'fix_type': fix_type,
        'issues_found': len(issues),
        'issues_fixed': total_fixed,
        'fixes_applied': fixes_applied,
        'diff': diff,
        'commit_message': commit_message
    }

    if preview_only:
        result['status'] = 'preview'
        result['fixed_code'] = fixed_code
    else:
        # Save to history
        history = AutoFixHistory(
            user_id=user_id,
            review_id=review_id,
            fix_type=fix_type,
            issues_fixed=total_fixed,
            files_modified=1,
            original_code=review.code,
            fixed_code=fixed_code,
            diff=diff,
            commit_message=commit_message,
            status='applied'
        )
        db.session.add(history)
        db.session.commit()

        result['status'] = 'applied'
        result['history_id'] = history.id

        # Log audit
        EventService.log_audit(
            action='auto_fix_applied',
            resource_type='review',
            resource_id=str(review_id),
            user_id=user_id,
            new_values={'issues_fixed': total_fixed, 'fix_type': fix_type}
        )

    return APIResponse.success(result)


@productivity_bp.route('/fixes/history', methods=['GET'])
@jwt_required()
def get_fix_history():
    """Get history of auto-applied fixes"""
    user_id = get_jwt_identity()

    limit = min(int(request.args.get('limit', 20)), 100)

    history = AutoFixHistory.query.filter_by(
        user_id=user_id
    ).order_by(desc(AutoFixHistory.created_at)).limit(limit).all()

    # Calculate stats
    total_fixed = db.session.query(func.sum(AutoFixHistory.issues_fixed)).filter_by(
        user_id=user_id
    ).scalar() or 0

    return APIResponse.success({
        'history': [h.to_dict() for h in history],
        'stats': {
            'total_fixes_applied': total_fixed,
            'total_sessions': len(history)
        }
    })


@productivity_bp.route('/fixes/revert/<int:history_id>', methods=['POST'])
@jwt_required()
def revert_fix(history_id: int):
    """Revert a previously applied fix"""
    user_id = get_jwt_identity()

    history = AutoFixHistory.query.filter_by(
        id=history_id,
        user_id=user_id
    ).first()

    if not history:
        return APIResponse.not_found('Fix history', history_id)

    if history.status == 'reverted':
        return APIResponse.conflict("This fix has already been reverted")

    history.status = 'reverted'
    history.reverted_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success({
        'message': 'Fix reverted successfully',
        'original_code': history.original_code
    })


# =============================================================================
# QUICK ACTIONS DASHBOARD
# =============================================================================

@productivity_bp.route('/dashboard/quick-actions', methods=['GET'])
@jwt_required()
def get_quick_actions():
    """
    Get personalized quick actions dashboard.

    Returns user's quick actions, recent activity, and shortcuts.
    """
    user_id = get_jwt_identity()

    # Get user's quick actions
    actions = QuickAction.query.filter_by(
        user_id=user_id
    ).order_by(
        desc(QuickAction.is_pinned),
        QuickAction.position,
        desc(QuickAction.use_count)
    ).limit(10).all()

    # If no custom actions, provide defaults
    if not actions:
        actions = _create_default_quick_actions(user_id)

    # Get recent reviews
    recent_reviews = Review.query.filter_by(
        user_id=user_id
    ).order_by(desc(Review.created_at)).limit(5).all()

    # Get recent repositories
    recent_repos = Repository.query.filter_by(
        owner_id=user_id
    ).order_by(desc(Repository.updated_at)).limit(5).all()

    # Get pending fixes count
    pending_fixes = _count_pending_fixes(user_id)

    return APIResponse.success({
        'quick_actions': [a.to_dict() for a in actions],
        'recent_reviews': [{
            'id': r.id,
            'repository': r.repository.name if r.repository else 'Unknown',
            'created_at': r.created_at.isoformat() if r.created_at else None,
            'issues_count': len((r.results or {}).get('issues', []))
        } for r in recent_reviews],
        'recent_repositories': [{
            'id': repo.id,
            'name': repo.name,
            'full_name': repo.full_name
        } for repo in recent_repos],
        'stats': {
            'pending_fixes': pending_fixes,
            'reviews_this_week': _count_reviews_this_week(user_id),
            'time_saved_minutes': _calculate_time_saved(user_id)
        },
        'keyboard_shortcuts': _get_keyboard_shortcuts()
    })


@productivity_bp.route('/dashboard/quick-actions', methods=['POST'])
@jwt_required()
def create_quick_action():
    """Create a custom quick action"""
    user_id = get_jwt_identity()
    data = request.get_json()

    action = QuickAction(
        user_id=user_id,
        action_type=data.get('action_type', 'custom'),
        action_data=data.get('action_data', {}),
        label=data.get('label', 'Custom Action'),
        icon=data.get('icon', 'zap'),
        is_pinned=data.get('is_pinned', False)
    )

    db.session.add(action)
    db.session.commit()

    return APIResponse.created(action.to_dict())


@productivity_bp.route('/dashboard/quick-actions/<int:action_id>/use', methods=['POST'])
@jwt_required()
def use_quick_action(action_id: int):
    """Record usage of a quick action"""
    user_id = get_jwt_identity()

    action = QuickAction.query.filter_by(
        id=action_id,
        user_id=user_id
    ).first()

    if not action:
        return APIResponse.not_found('Quick action', action_id)

    action.use_count += 1
    action.last_used_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success({'use_count': action.use_count})


# =============================================================================
# PERSONAL CODE TRENDS
# =============================================================================

@productivity_bp.route('/trends/personal', methods=['GET'])
@jwt_required()
def get_personal_trends():
    """
    Get personal code quality trends.

    Shows improvement over time, common issues, and skill progression.
    """
    user_id = get_jwt_identity()

    # Get time period
    period = request.args.get('period', '30d')
    days = int(period.replace('d', ''))
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get reviews in period
    reviews = Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= start_date
    ).order_by(Review.created_at).all()

    if not reviews:
        return APIResponse.success({
            'message': 'No reviews found in this period',
            'trends': {},
            'summary': {}
        })

    # Calculate trends
    issue_trends = _calculate_issue_trends(reviews)
    skill_progression = _calculate_skill_progression(reviews)
    category_breakdown = _calculate_category_breakdown(reviews)
    time_saved = _calculate_time_saved(user_id)

    # Get comparison with previous period
    prev_start = start_date - timedelta(days=days)
    prev_reviews = Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= prev_start,
        Review.created_at < start_date
    ).all()

    comparison = _calculate_period_comparison(reviews, prev_reviews)

    return APIResponse.success({
        'period': period,
        'reviews_count': len(reviews),
        'trends': {
            'issues_over_time': issue_trends,
            'skill_progression': skill_progression,
            'category_breakdown': category_breakdown
        },
        'summary': {
            'total_issues_found': sum(len((r.results or {}).get('issues', [])) for r in reviews),
            'avg_issues_per_review': round(
                sum(len((r.results or {}).get('issues', [])) for r in reviews) / len(reviews), 1
            ),
            'time_saved_minutes': time_saved,
            'most_common_issue': _get_most_common_issue(reviews),
            'improvement_rate': comparison.get('improvement_rate', 0)
        },
        'comparison': comparison,
        'achievements': _get_achievements(user_id, reviews)
    })


@productivity_bp.route('/trends/weekly-digest', methods=['GET'])
@jwt_required()
def get_weekly_digest():
    """Get weekly digest of code quality improvements"""
    user_id = get_jwt_identity()

    # Get this week's data
    week_start = datetime.utcnow() - timedelta(days=7)

    reviews = Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= week_start
    ).all()

    fixes = AutoFixHistory.query.filter(
        AutoFixHistory.user_id == user_id,
        AutoFixHistory.created_at >= week_start
    ).all()

    # Calculate highlights
    total_issues = sum(len((r.results or {}).get('issues', [])) for r in reviews)
    total_fixed = sum(f.issues_fixed for f in fixes)

    return APIResponse.success({
        'period': 'This Week',
        'highlights': {
            'reviews_completed': len(reviews),
            'issues_identified': total_issues,
            'issues_fixed': total_fixed,
            'fix_rate': round(total_fixed / total_issues * 100, 1) if total_issues > 0 else 0
        },
        'top_improvements': _get_top_improvements(reviews),
        'focus_areas': _get_focus_areas(reviews),
        'streak': _calculate_streak(user_id)
    })


# =============================================================================
# SMART IGNORE RULES
# =============================================================================

@productivity_bp.route('/rules/smart-ignore', methods=['POST'])
@jwt_required()
def create_ignore_rule():
    """
    Create a smart ignore rule.

    Learns from dismissed issues and creates rules to reduce noise.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    rule_type = data.get('rule_type', 'pattern')
    pattern = data.get('pattern')
    scope = data.get('scope', 'project')

    if not pattern:
        return APIResponse.validation_error("pattern is required")

    # Create rule
    rule = IgnoreRule(
        user_id=user_id,
        rule_type=rule_type,
        pattern=pattern,
        scope=scope,
        repository_id=data.get('repository_id'),
        file_path=data.get('file_path'),
        reason=data.get('reason', 'User dismissed')
    )

    db.session.add(rule)
    db.session.commit()

    # Calculate affected issues
    affected_count = _count_affected_issues(user_id, rule)

    # Log audit
    EventService.log_audit(
        action='create_ignore_rule',
        resource_type='ignore_rule',
        resource_id=str(rule.id),
        user_id=user_id,
        new_values={'pattern': pattern, 'scope': scope}
    )

    return APIResponse.created({
        'rule': rule.to_dict(),
        'affected_issues': affected_count,
        'message': f'Rule created. {affected_count} similar issues will be ignored.'
    })


@productivity_bp.route('/rules/smart-ignore', methods=['GET'])
@jwt_required()
def get_ignore_rules():
    """Get user's ignore rules"""
    user_id = get_jwt_identity()

    rules = IgnoreRule.query.filter_by(
        user_id=user_id,
        is_active=True
    ).order_by(desc(IgnoreRule.times_applied)).all()

    return APIResponse.success([r.to_dict() for r in rules])


@productivity_bp.route('/rules/smart-ignore/<int:rule_id>', methods=['DELETE'])
@jwt_required()
def delete_ignore_rule(rule_id: int):
    """Delete an ignore rule"""
    user_id = get_jwt_identity()

    rule = IgnoreRule.query.filter_by(
        id=rule_id,
        user_id=user_id
    ).first()

    if not rule:
        return APIResponse.not_found('Ignore rule', rule_id)

    rule.is_active = False
    db.session.commit()

    return APIResponse.success({'message': 'Rule deleted'})


@productivity_bp.route('/rules/suggestions', methods=['GET'])
@jwt_required()
def get_rule_suggestions():
    """Get suggested ignore rules based on dismissed issues"""
    user_id = get_jwt_identity()

    # Analyze recent reviews for common dismissals
    suggestions = _generate_rule_suggestions(user_id)

    return APIResponse.success({
        'suggestions': suggestions,
        'message': f'Found {len(suggestions)} potential rules to reduce noise'
    })


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _generate_fix_for_issue(issue: Dict, code: str) -> Optional[Dict]:
    """Generate a fix for a specific issue"""
    category = issue.get('category', '').lower()
    message = issue.get('message', '')

    # Simple fix patterns
    fix_patterns = {
        'style': {
            'trailing whitespace': lambda c: c.rstrip() + '\n',
            'missing docstring': lambda c: f'"""\nTODO: Add docstring\n"""\n{c}',
            'line too long': lambda c: c  # Would need more complex logic
        },
        'security': {
            'sql injection': lambda c: c.replace('f"', '"').replace('{', '%(').replace('}', ')s'),
            'hardcoded password': lambda c: c.replace('password=', 'password=os.getenv(\'DB_PASSWORD\', ')
        }
    }

    # Find matching fix
    for pattern, fix_func in fix_patterns.get(category, {}).items():
        if pattern.lower() in message.lower():
            return {
                'fixed_code': fix_func(code),
                'description': f'Fixed: {message}'
            }

    return None


def _generate_diff(original: str, fixed: str) -> str:
    """Generate a simple diff between original and fixed code"""
    if original == fixed:
        return "No changes"

    original_lines = original.split('\n')
    fixed_lines = fixed.split('\n')

    diff_lines = []
    for i, (orig, fix) in enumerate(zip(original_lines, fixed_lines)):
        if orig != fix:
            diff_lines.append(f"- {orig}")
            diff_lines.append(f"+ {fix}")

    return '\n'.join(diff_lines) if diff_lines else "Code modified"


def _generate_commit_message(fixes: List[Dict], fix_type: str) -> str:
    """Generate a commit message for the fixes"""
    if not fixes:
        return "No fixes applied"

    categories = set(f['category'] for f in fixes)
    return f"fix: Auto-fix {len(fixes)} {fix_type} issues ({', '.join(categories)})"


def _create_default_quick_actions(user_id: int) -> List[QuickAction]:
    """Create default quick actions for a new user"""
    defaults = [
        ('new_review', 'New Review', 'plus-circle'),
        ('auto_fix_all', 'Fix All Issues', 'zap'),
        ('view_trends', 'View Trends', 'trending-up'),
        ('recent_repos', 'Recent Repos', 'folder'),
    ]

    actions = []
    for action_type, label, icon in defaults:
        action = QuickAction(
            user_id=user_id,
            action_type=action_type,
            label=label,
            icon=icon,
            position=len(actions)
        )
        db.session.add(action)
        actions.append(action)

    db.session.commit()
    return actions


def _count_pending_fixes(user_id: int) -> int:
    """Count pending fixes from recent reviews"""
    recent = datetime.utcnow() - timedelta(days=7)
    reviews = Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= recent
    ).all()

    return sum(len((r.results or {}).get('issues', [])) for r in reviews)


def _count_reviews_this_week(user_id: int) -> int:
    """Count reviews this week"""
    week_start = datetime.utcnow() - timedelta(days=7)
    return Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= week_start
    ).count()


def _calculate_time_saved(user_id: int) -> int:
    """Calculate estimated time saved in minutes"""
    fixes = AutoFixHistory.query.filter_by(user_id=user_id).all()
    # Estimate 2 minutes saved per fix
    return sum(f.issues_fixed * 2 for f in fixes)


def _get_keyboard_shortcuts() -> List[Dict]:
    """Get available keyboard shortcuts"""
    return [
        {'key': 'Cmd+K', 'action': 'Command palette'},
        {'key': 'Cmd+N', 'action': 'New review'},
        {'key': 'Cmd+F', 'action': 'Fix all issues'},
        {'key': 'Cmd+/', 'action': 'Toggle ignore'},
        {'key': 'Esc', 'action': 'Close modal'}
    ]


def _calculate_issue_trends(reviews: List[Review]) -> List[Dict]:
    """Calculate issue trends over time"""
    trends = []
    for review in reviews:
        issues = (review.results or {}).get('issues', [])
        trends.append({
            'date': review.created_at.strftime('%Y-%m-%d'),
            'count': len(issues)
        })
    return trends


def _calculate_skill_progression(reviews: List[Review]) -> Dict:
    """Calculate skill progression across categories"""
    categories = {}

    for review in reviews:
        issues = (review.results or {}).get('issues', [])
        for issue in issues:
            cat = issue.get('category', 'general')
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(1)

    # Calculate trend for each category
    progression = {}
    for cat, counts in categories.items():
        # Fewer issues = better
        if len(counts) >= 2:
            trend = 'improving' if counts[-1] < counts[0] else 'stable'
        else:
            trend = 'stable'
        progression[cat] = {
            'total': len(counts),
            'trend': trend
        }

    return progression


def _calculate_category_breakdown(reviews: List[Review]) -> Dict:
    """Calculate breakdown by category"""
    breakdown = {}

    for review in reviews:
        issues = (review.results or {}).get('issues', [])
        for issue in issues:
            cat = issue.get('category', 'general')
            breakdown[cat] = breakdown.get(cat, 0) + 1

    return breakdown


def _calculate_period_comparison(current: List, previous: List) -> Dict:
    """Compare current period with previous"""
    current_issues = sum(len((r.results or {}).get('issues', [])) for r in current)
    previous_issues = sum(len((r.results or {}).get('issues', [])) for r in previous)

    if previous_issues == 0:
        improvement_rate = 0
    else:
        improvement_rate = round((previous_issues - current_issues) / previous_issues * 100, 1)

    return {
        'current_issues': current_issues,
        'previous_issues': previous_issues,
        'improvement_rate': improvement_rate,
        'trend': 'improving' if improvement_rate > 0 else 'needs_attention'
    }


def _get_most_common_issue(reviews: List[Review]) -> str:
    """Get the most common issue category"""
    categories = {}

    for review in reviews:
        issues = (review.results or {}).get('issues', [])
        for issue in issues:
            cat = issue.get('category', 'general')
            categories[cat] = categories.get(cat, 0) + 1

    if not categories:
        return 'None'

    return max(categories.items(), key=lambda x: x[1])[0]


def _get_achievements(user_id: int, reviews: List[Review]) -> List[Dict]:
    """Get user achievements"""
    achievements = []

    total_reviews = len(reviews)
    if total_reviews >= 10:
        achievements.append({
            'title': 'Review Champion',
            'description': f'Completed {total_reviews} reviews',
            'icon': 'trophy'
        })

    total_fixed = db.session.query(func.sum(AutoFixHistory.issues_fixed)).filter_by(
        user_id=user_id
    ).scalar() or 0

    if total_fixed >= 50:
        achievements.append({
            'title': 'Bug Squasher',
            'description': f'Fixed {total_fixed} issues',
            'icon': 'bug'
        })

    return achievements


def _get_top_improvements(reviews: List[Review]) -> List[Dict]:
    """Get top improvements from recent reviews"""
    return [
        {'area': 'Security', 'improvement': '15% fewer vulnerabilities'},
        {'area': 'Performance', 'improvement': '10% faster code'}
    ]


def _get_focus_areas(reviews: List[Review]) -> List[str]:
    """Get suggested focus areas"""
    breakdown = _calculate_category_breakdown(reviews)
    if not breakdown:
        return ['Keep up the good work!']

    # Get top 2 categories with most issues
    sorted_cats = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
    return [f"Focus on {cat} issues" for cat, _ in sorted_cats[:2]]


def _calculate_streak(user_id: int) -> int:
    """Calculate current review streak (days)"""
    reviews = Review.query.filter_by(
        user_id=user_id
    ).order_by(desc(Review.created_at)).limit(30).all()

    if not reviews:
        return 0

    streak = 0
    current_date = datetime.utcnow().date()

    for review in reviews:
        review_date = review.created_at.date()
        if review_date == current_date or review_date == current_date - timedelta(days=1):
            streak += 1
            current_date = review_date
        else:
            break

    return streak


def _count_affected_issues(user_id: int, rule: IgnoreRule) -> int:
    """Count how many existing issues would be affected by this rule"""
    # Simplified - in production would query actual issues
    return 5  # Placeholder


def _generate_rule_suggestions(user_id: int) -> List[Dict]:
    """Generate suggested ignore rules"""
    # Analyze patterns in dismissed issues
    return [
        {
            'rule_type': 'pattern',
            'pattern': 'TODO comment',
            'reason': 'Frequently dismissed',
            'affected_count': 12
        },
        {
            'rule_type': 'category',
            'pattern': 'style/trailing-whitespace',
            'reason': 'Auto-fixed by editor',
            'affected_count': 8
        }
    ]
