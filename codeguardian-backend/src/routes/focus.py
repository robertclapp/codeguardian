"""
Focus Mode for CodeGuardian

Deep work support with distraction-free reviews, time-boxing, and session tracking.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc

from src.database import db
from src.responses import APIResponse
from src.services import EventService


focus_bp = Blueprint('focus', __name__)


# Focus Models

class FocusSession(db.Model):
    """Focus session for deep work"""
    __tablename__ = 'focus_sessions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)

    # Session info
    goal = db.Column(db.String(500))
    duration_minutes = db.Column(db.Integer, default=25)  # Pomodoro default
    session_type = db.Column(db.String(50), default='review')  # review, fix, learn

    # Priority settings
    priority_issues = db.Column(db.JSON, default=list)  # Issue IDs to focus on
    focus_categories = db.Column(db.JSON, default=list)  # security, performance, etc.

    # Session state
    status = db.Column(db.String(20), default='active')  # active, paused, completed, abandoned
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    paused_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    total_pause_time = db.Column(db.Integer, default=0)  # seconds

    # Progress tracking
    issues_reviewed = db.Column(db.Integer, default=0)
    issues_fixed = db.Column(db.Integer, default=0)
    files_reviewed = db.Column(db.Integer, default=0)
    comments_made = db.Column(db.Integer, default=0)

    # Session summary (populated on end)
    summary = db.Column(db.JSON)

    # Mood/energy tracking
    start_energy = db.Column(db.Integer)  # 1-5
    end_energy = db.Column(db.Integer)
    productivity_rating = db.Column(db.Integer)  # 1-5 self-rating

    # Relationships
    user = db.relationship('User', backref='focus_sessions')

    def to_dict(self) -> dict:
        elapsed = self._calculate_elapsed()
        return {
            'id': self.id,
            'goal': self.goal,
            'duration_minutes': self.duration_minutes,
            'session_type': self.session_type,
            'status': self.status,
            'priority_issues': self.priority_issues or [],
            'focus_categories': self.focus_categories or [],
            'timing': {
                'started_at': self.started_at.isoformat() if self.started_at else None,
                'ended_at': self.ended_at.isoformat() if self.ended_at else None,
                'elapsed_minutes': elapsed,
                'remaining_minutes': max(0, self.duration_minutes - elapsed),
                'total_pause_minutes': self.total_pause_time // 60
            },
            'progress': {
                'issues_reviewed': self.issues_reviewed,
                'issues_fixed': self.issues_fixed,
                'files_reviewed': self.files_reviewed,
                'comments_made': self.comments_made
            },
            'summary': self.summary,
            'ratings': {
                'start_energy': self.start_energy,
                'end_energy': self.end_energy,
                'productivity': self.productivity_rating
            }
        }

    def _calculate_elapsed(self) -> int:
        """Calculate elapsed time in minutes"""
        if not self.started_at:
            return 0

        end_time = self.ended_at or datetime.utcnow()
        elapsed_seconds = (end_time - self.started_at).total_seconds()
        elapsed_seconds -= self.total_pause_time

        return int(elapsed_seconds // 60)


class FocusStreak(db.Model):
    """Track focus session streaks"""
    __tablename__ = 'focus_streaks'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)

    current_streak = db.Column(db.Integer, default=0)
    longest_streak = db.Column(db.Integer, default=0)
    total_sessions = db.Column(db.Integer, default=0)
    total_focus_minutes = db.Column(db.Integer, default=0)

    last_session_date = db.Column(db.Date)

    def to_dict(self) -> dict:
        return {
            'current_streak': self.current_streak,
            'longest_streak': self.longest_streak,
            'total_sessions': self.total_sessions,
            'total_focus_minutes': self.total_focus_minutes,
            'total_focus_hours': round(self.total_focus_minutes / 60, 1)
        }


# API Routes

@focus_bp.route('/focus/start', methods=['POST'])
@jwt_required()
def start_focus_session():
    """Start a new focus session"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    # Check for existing active session
    existing = FocusSession.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()

    if existing:
        return APIResponse.error("You already have an active focus session", 409)

    # Also check for paused sessions
    paused = FocusSession.query.filter_by(
        user_id=user_id,
        status='paused'
    ).first()

    if paused:
        return APIResponse.error("You have a paused session. Resume or end it first.", 409)

    # Create new session
    session = FocusSession(
        user_id=user_id,
        goal=data.get('goal'),
        duration_minutes=data.get('duration_minutes', 25),
        session_type=data.get('session_type', 'review'),
        priority_issues=data.get('priority_issues', []),
        focus_categories=data.get('focus_categories', []),
        start_energy=data.get('energy_level')
    )

    db.session.add(session)
    db.session.commit()

    EventService.log(user_id, 'focus_started', {
        'session_id': session.id,
        'duration': session.duration_minutes,
        'type': session.session_type
    })

    return APIResponse.created(session.to_dict())


@focus_bp.route('/focus/current', methods=['GET'])
@jwt_required()
def get_current_session():
    """Get current active or paused focus session"""
    user_id = get_jwt_identity()

    session = FocusSession.query.filter(
        FocusSession.user_id == user_id,
        FocusSession.status.in_(['active', 'paused'])
    ).first()

    if not session:
        return APIResponse.success(None)

    return APIResponse.success(session.to_dict())


@focus_bp.route('/focus/pause', methods=['POST'])
@jwt_required()
def pause_focus_session():
    """Pause current focus session"""
    user_id = get_jwt_identity()

    session = FocusSession.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()

    if not session:
        return APIResponse.not_found('Active session', user_id)

    session.status = 'paused'
    session.paused_at = datetime.utcnow()

    db.session.commit()

    return APIResponse.success(session.to_dict())


@focus_bp.route('/focus/resume', methods=['POST'])
@jwt_required()
def resume_focus_session():
    """Resume paused focus session"""
    user_id = get_jwt_identity()

    session = FocusSession.query.filter_by(
        user_id=user_id,
        status='paused'
    ).first()

    if not session:
        return APIResponse.not_found('Paused session', user_id)

    # Calculate pause duration
    if session.paused_at:
        pause_duration = (datetime.utcnow() - session.paused_at).total_seconds()
        session.total_pause_time += int(pause_duration)

    session.status = 'active'
    session.paused_at = None

    db.session.commit()

    return APIResponse.success(session.to_dict())


@focus_bp.route('/focus/end', methods=['POST'])
@jwt_required()
def end_focus_session():
    """End focus session with summary"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    session = FocusSession.query.filter(
        FocusSession.user_id == user_id,
        FocusSession.status.in_(['active', 'paused'])
    ).first()

    if not session:
        return APIResponse.not_found('Active session', user_id)

    # Update session
    session.status = 'completed'
    session.ended_at = datetime.utcnow()
    session.end_energy = data.get('energy_level')
    session.productivity_rating = data.get('productivity_rating')

    # Update progress if provided
    if 'progress' in data:
        progress = data['progress']
        session.issues_reviewed = progress.get('issues_reviewed', session.issues_reviewed)
        session.issues_fixed = progress.get('issues_fixed', session.issues_fixed)
        session.files_reviewed = progress.get('files_reviewed', session.files_reviewed)
        session.comments_made = progress.get('comments_made', session.comments_made)

    # Generate summary
    elapsed = session._calculate_elapsed()
    session.summary = {
        'duration_actual': elapsed,
        'duration_planned': session.duration_minutes,
        'completion_rate': min(100, round(elapsed / session.duration_minutes * 100)) if session.duration_minutes else 0,
        'issues_per_minute': round(session.issues_reviewed / elapsed, 2) if elapsed > 0 else 0,
        'goal_achieved': data.get('goal_achieved', None),
        'notes': data.get('notes')
    }

    # Update streak
    _update_streak(user_id, elapsed)

    db.session.commit()

    EventService.log(user_id, 'focus_ended', {
        'session_id': session.id,
        'duration': elapsed,
        'issues_reviewed': session.issues_reviewed,
        'issues_fixed': session.issues_fixed
    })

    return APIResponse.success(session.to_dict())


@focus_bp.route('/focus/abandon', methods=['POST'])
@jwt_required()
def abandon_focus_session():
    """Abandon current session without counting it"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    session = FocusSession.query.filter(
        FocusSession.user_id == user_id,
        FocusSession.status.in_(['active', 'paused'])
    ).first()

    if not session:
        return APIResponse.not_found('Active session', user_id)

    session.status = 'abandoned'
    session.ended_at = datetime.utcnow()
    session.summary = {
        'reason': data.get('reason', 'User abandoned'),
        'notes': data.get('notes')
    }

    db.session.commit()

    return APIResponse.success({'abandoned': True})


@focus_bp.route('/focus/progress', methods=['POST'])
@jwt_required()
def update_focus_progress():
    """Update progress during a focus session"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No progress data provided")

    session = FocusSession.query.filter_by(
        user_id=user_id,
        status='active'
    ).first()

    if not session:
        return APIResponse.not_found('Active session', user_id)

    # Increment counters
    if 'issues_reviewed' in data:
        session.issues_reviewed += data['issues_reviewed']
    if 'issues_fixed' in data:
        session.issues_fixed += data['issues_fixed']
    if 'files_reviewed' in data:
        session.files_reviewed += data['files_reviewed']
    if 'comments_made' in data:
        session.comments_made += data['comments_made']

    db.session.commit()

    return APIResponse.success(session.to_dict())


@focus_bp.route('/focus/history', methods=['GET'])
@jwt_required()
def get_focus_history():
    """Get session history"""
    user_id = get_jwt_identity()

    limit = min(int(request.args.get('limit', 20)), 100)
    session_type = request.args.get('type')

    query = FocusSession.query.filter_by(user_id=user_id)

    if session_type:
        query = query.filter_by(session_type=session_type)

    sessions = query.order_by(desc(FocusSession.started_at)).limit(limit).all()

    return APIResponse.success([s.to_dict() for s in sessions])


@focus_bp.route('/focus/stats', methods=['GET'])
@jwt_required()
def get_focus_stats():
    """Get focus statistics"""
    user_id = get_jwt_identity()

    # Get streak info
    streak = FocusStreak.query.filter_by(user_id=user_id).first()

    # Get completed sessions stats
    completed_sessions = FocusSession.query.filter_by(
        user_id=user_id,
        status='completed'
    ).all()

    if not completed_sessions:
        return APIResponse.success({
            'streak': streak.to_dict() if streak else None,
            'stats': {
                'total_sessions': 0,
                'avg_duration': 0,
                'avg_issues_per_session': 0,
                'completion_rate': 0,
                'best_time_of_day': None
            }
        })

    # Calculate stats
    total_duration = sum(s._calculate_elapsed() for s in completed_sessions)
    total_issues = sum(s.issues_reviewed for s in completed_sessions)
    total_fixed = sum(s.issues_fixed for s in completed_sessions)

    # Find best time of day
    hour_counts = {}
    for session in completed_sessions:
        if session.started_at:
            hour = session.started_at.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1

    best_hour = max(hour_counts, key=hour_counts.get) if hour_counts else None

    # Weekly trend
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_sessions = [s for s in completed_sessions if s.started_at and s.started_at > week_ago]

    return APIResponse.success({
        'streak': streak.to_dict() if streak else None,
        'stats': {
            'total_sessions': len(completed_sessions),
            'avg_duration': round(total_duration / len(completed_sessions)),
            'total_focus_hours': round(total_duration / 60, 1),
            'avg_issues_per_session': round(total_issues / len(completed_sessions), 1),
            'fix_rate': round(total_fixed / total_issues * 100) if total_issues else 0,
            'best_time_of_day': f"{best_hour}:00" if best_hour is not None else None,
            'sessions_this_week': len(recent_sessions)
        },
        'productivity_ratings': _get_productivity_distribution(completed_sessions)
    })


@focus_bp.route('/focus/suggestions', methods=['GET'])
@jwt_required()
def get_focus_suggestions():
    """Get personalized focus session suggestions"""
    user_id = get_jwt_identity()

    # Analyze past sessions
    sessions = FocusSession.query.filter_by(
        user_id=user_id,
        status='completed'
    ).order_by(desc(FocusSession.started_at)).limit(20).all()

    suggestions = []

    if not sessions:
        # Default suggestions for new users
        suggestions = [
            {
                'type': 'duration',
                'value': 25,
                'reason': 'Start with a 25-minute Pomodoro session'
            },
            {
                'type': 'goal',
                'value': 'Review 5 issues',
                'reason': 'Set small, achievable goals to build momentum'
            }
        ]
    else:
        # Analyze patterns
        avg_duration = sum(s._calculate_elapsed() for s in sessions) / len(sessions)
        avg_issues = sum(s.issues_reviewed for s in sessions) / len(sessions)

        # Duration suggestion
        productive_sessions = [s for s in sessions if s.productivity_rating and s.productivity_rating >= 4]
        if productive_sessions:
            optimal_duration = sum(s._calculate_elapsed() for s in productive_sessions) / len(productive_sessions)
            suggestions.append({
                'type': 'duration',
                'value': round(optimal_duration),
                'reason': f'Your most productive sessions average {round(optimal_duration)} minutes'
            })

        # Category suggestion based on pending issues
        if any(s.focus_categories for s in sessions):
            all_categories = []
            for s in sessions:
                if s.focus_categories:
                    all_categories.extend(s.focus_categories)
            if all_categories:
                from collections import Counter
                most_common = Counter(all_categories).most_common(1)[0][0]
                suggestions.append({
                    'type': 'category',
                    'value': most_common,
                    'reason': f'You frequently focus on {most_common} issues'
                })

        # Time suggestion
        hour_productivity = {}
        for s in sessions:
            if s.started_at and s.productivity_rating:
                hour = s.started_at.hour
                if hour not in hour_productivity:
                    hour_productivity[hour] = []
                hour_productivity[hour].append(s.productivity_rating)

        if hour_productivity:
            best_hour = max(hour_productivity, key=lambda h: sum(hour_productivity[h])/len(hour_productivity[h]))
            suggestions.append({
                'type': 'time',
                'value': f'{best_hour}:00',
                'reason': f'You tend to be most productive around {best_hour}:00'
            })

    return APIResponse.success({
        'suggestions': suggestions,
        'based_on_sessions': len(sessions)
    })


@focus_bp.route('/focus/templates', methods=['GET'])
@jwt_required()
def get_focus_templates():
    """Get pre-defined focus session templates"""
    templates = [
        {
            'id': 'pomodoro',
            'name': 'Pomodoro',
            'duration_minutes': 25,
            'session_type': 'review',
            'description': 'Classic 25-minute focused work session'
        },
        {
            'id': 'deep_work',
            'name': 'Deep Work',
            'duration_minutes': 90,
            'session_type': 'review',
            'description': 'Extended session for complex reviews'
        },
        {
            'id': 'quick_fix',
            'name': 'Quick Fix',
            'duration_minutes': 15,
            'session_type': 'fix',
            'description': 'Short session to fix specific issues'
        },
        {
            'id': 'security_audit',
            'name': 'Security Audit',
            'duration_minutes': 45,
            'session_type': 'review',
            'focus_categories': ['security'],
            'description': 'Focused security review session'
        },
        {
            'id': 'learning',
            'name': 'Learning Session',
            'duration_minutes': 30,
            'session_type': 'learn',
            'description': 'Learn from code patterns and explanations'
        }
    ]

    return APIResponse.success(templates)


# Helper Functions

def _update_streak(user_id: int, session_duration: int):
    """Update user's focus streak"""
    streak = FocusStreak.query.filter_by(user_id=user_id).first()

    if not streak:
        streak = FocusStreak(user_id=user_id)
        db.session.add(streak)

    today = datetime.utcnow().date()

    # Update totals
    streak.total_sessions += 1
    streak.total_focus_minutes += session_duration

    # Update streak
    if streak.last_session_date:
        days_since = (today - streak.last_session_date).days

        if days_since == 0:
            # Same day, streak continues
            pass
        elif days_since == 1:
            # Consecutive day
            streak.current_streak += 1
        else:
            # Streak broken
            streak.current_streak = 1
    else:
        streak.current_streak = 1

    # Update longest streak
    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_session_date = today


def _get_productivity_distribution(sessions) -> Dict[int, int]:
    """Get distribution of productivity ratings"""
    distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}

    for session in sessions:
        if session.productivity_rating:
            distribution[session.productivity_rating] += 1

    return distribution
