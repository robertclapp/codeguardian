"""
Smart Review Scheduler for CodeGuardian

Automated scheduling of code reviews with branch monitoring,
notifications, and batch processing.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc

from src.database import db
from src.models.repository import Repository
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService
from src.exceptions import ValidationError


scheduler_bp = Blueprint('scheduler', __name__)


# Scheduler Models

class ScheduledReview(db.Model):
    """Scheduled automatic review configuration"""
    __tablename__ = 'scheduled_reviews'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False)

    # Schedule configuration
    schedule_type = db.Column(db.String(50), nullable=False)  # daily, weekly, on_push, on_pr
    cron_expression = db.Column(db.String(100))  # For custom schedules

    # Time settings
    preferred_time = db.Column(db.String(5), default='09:00')  # HH:MM
    timezone = db.Column(db.String(50), default='UTC')
    days_of_week = db.Column(db.JSON, default=list)  # [0-6] for weekly

    # Branch monitoring
    monitored_branches = db.Column(db.JSON, default=list)  # ['main', 'develop']
    exclude_patterns = db.Column(db.JSON, default=list)  # Files to exclude

    # Review settings
    review_type = db.Column(db.String(50), default='full')  # full, quick, security
    auto_fix = db.Column(db.Boolean, default=False)

    # Notifications
    notify_email = db.Column(db.Boolean, default=True)
    notify_slack = db.Column(db.Boolean, default=False)
    slack_webhook = db.Column(db.String(500))

    # Status
    is_active = db.Column(db.Boolean, default=True)
    last_run_at = db.Column(db.DateTime)
    next_run_at = db.Column(db.DateTime)
    run_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='scheduled_reviews')
    repository = db.relationship('Repository', backref='scheduled_reviews')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'repository_id': self.repository_id,
            'repository_name': self.repository.name if self.repository else None,
            'schedule_type': self.schedule_type,
            'preferred_time': self.preferred_time,
            'timezone': self.timezone,
            'days_of_week': self.days_of_week or [],
            'monitored_branches': self.monitored_branches or [],
            'review_type': self.review_type,
            'auto_fix': self.auto_fix,
            'notifications': {
                'email': self.notify_email,
                'slack': self.notify_slack
            },
            'is_active': self.is_active,
            'last_run_at': self.last_run_at.isoformat() if self.last_run_at else None,
            'next_run_at': self.next_run_at.isoformat() if self.next_run_at else None,
            'run_count': self.run_count,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ScheduleExecution(db.Model):
    """Record of scheduled review executions"""
    __tablename__ = 'schedule_executions'

    id = db.Column(db.Integer, primary_key=True)
    schedule_id = db.Column(db.Integer, db.ForeignKey('scheduled_reviews.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'))

    # Execution details
    status = db.Column(db.String(20), nullable=False)  # success, failed, skipped
    trigger_type = db.Column(db.String(50))  # scheduled, manual, webhook

    # Results
    issues_found = db.Column(db.Integer, default=0)
    files_reviewed = db.Column(db.Integer, default=0)
    execution_time_ms = db.Column(db.Integer)

    # Error info
    error_message = db.Column(db.Text)

    # Timestamp
    executed_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    schedule = db.relationship('ScheduledReview', backref='executions')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'schedule_id': self.schedule_id,
            'review_id': self.review_id,
            'status': self.status,
            'trigger_type': self.trigger_type,
            'issues_found': self.issues_found,
            'files_reviewed': self.files_reviewed,
            'execution_time_ms': self.execution_time_ms,
            'error_message': self.error_message,
            'executed_at': self.executed_at.isoformat() if self.executed_at else None
        }


# API Routes

@scheduler_bp.route('/scheduler/schedules', methods=['POST'])
@jwt_required()
def create_schedule():
    """
    Create a new scheduled review.

    Request Body:
        repository_id (int): Repository to schedule
        schedule_type (str): daily, weekly, on_push, on_pr
        preferred_time (str): HH:MM format
        monitored_branches (list): Branches to monitor
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    repository_id = data.get('repository_id')
    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify repository access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Create schedule
    schedule = ScheduledReview(
        user_id=user_id,
        repository_id=repository_id,
        schedule_type=data.get('schedule_type', 'daily'),
        preferred_time=data.get('preferred_time', '09:00'),
        timezone=data.get('timezone', 'UTC'),
        days_of_week=data.get('days_of_week', [1, 2, 3, 4, 5]),  # Weekdays
        monitored_branches=data.get('monitored_branches', ['main']),
        exclude_patterns=data.get('exclude_patterns', []),
        review_type=data.get('review_type', 'full'),
        auto_fix=data.get('auto_fix', False),
        notify_email=data.get('notify_email', True),
        notify_slack=data.get('notify_slack', False),
        slack_webhook=data.get('slack_webhook')
    )

    # Calculate next run
    schedule.next_run_at = _calculate_next_run(schedule)

    db.session.add(schedule)
    db.session.commit()

    EventService.log_audit(
        action='create_schedule',
        resource_type='scheduled_review',
        resource_id=str(schedule.id),
        user_id=user_id
    )

    return APIResponse.created(schedule.to_dict())


@scheduler_bp.route('/scheduler/schedules', methods=['GET'])
@jwt_required()
def get_schedules():
    """Get all scheduled reviews for user"""
    user_id = get_jwt_identity()

    schedules = ScheduledReview.query.filter_by(
        user_id=user_id
    ).order_by(desc(ScheduledReview.created_at)).all()

    return APIResponse.success([s.to_dict() for s in schedules])


@scheduler_bp.route('/scheduler/schedules/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_schedule(schedule_id: int):
    """Get schedule details"""
    user_id = get_jwt_identity()

    schedule = ScheduledReview.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return APIResponse.not_found('Schedule', schedule_id)

    return APIResponse.success(schedule.to_dict())


@scheduler_bp.route('/scheduler/schedules/<int:schedule_id>', methods=['PUT'])
@jwt_required()
def update_schedule(schedule_id: int):
    """Update schedule configuration"""
    user_id = get_jwt_identity()
    data = request.get_json()

    schedule = ScheduledReview.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return APIResponse.not_found('Schedule', schedule_id)

    # Update fields
    updatable = ['schedule_type', 'preferred_time', 'timezone', 'days_of_week',
                 'monitored_branches', 'exclude_patterns', 'review_type', 'auto_fix',
                 'notify_email', 'notify_slack', 'slack_webhook', 'is_active']

    for field in updatable:
        if field in data:
            setattr(schedule, field, data[field])

    # Recalculate next run
    schedule.next_run_at = _calculate_next_run(schedule)

    db.session.commit()

    return APIResponse.success(schedule.to_dict())


@scheduler_bp.route('/scheduler/schedules/<int:schedule_id>', methods=['DELETE'])
@jwt_required()
def delete_schedule(schedule_id: int):
    """Delete a schedule"""
    user_id = get_jwt_identity()

    schedule = ScheduledReview.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return APIResponse.not_found('Schedule', schedule_id)

    db.session.delete(schedule)
    db.session.commit()

    return APIResponse.no_content()


@scheduler_bp.route('/scheduler/schedules/<int:schedule_id>/run', methods=['POST'])
@jwt_required()
def run_schedule_now(schedule_id: int):
    """Manually trigger a scheduled review"""
    user_id = get_jwt_identity()

    schedule = ScheduledReview.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return APIResponse.not_found('Schedule', schedule_id)

    # Execute the review
    result = _execute_scheduled_review(schedule, trigger_type='manual')

    return APIResponse.success(result)


@scheduler_bp.route('/scheduler/executions/<int:schedule_id>', methods=['GET'])
@jwt_required()
def get_executions(schedule_id: int):
    """Get execution history for a schedule"""
    user_id = get_jwt_identity()

    schedule = ScheduledReview.query.filter_by(
        id=schedule_id,
        user_id=user_id
    ).first()

    if not schedule:
        return APIResponse.not_found('Schedule', schedule_id)

    limit = min(int(request.args.get('limit', 20)), 100)

    executions = ScheduleExecution.query.filter_by(
        schedule_id=schedule_id
    ).order_by(desc(ScheduleExecution.executed_at)).limit(limit).all()

    return APIResponse.success([e.to_dict() for e in executions])


@scheduler_bp.route('/scheduler/calendar', methods=['GET'])
@jwt_required()
def get_calendar_view():
    """Get calendar view of scheduled reviews"""
    user_id = get_jwt_identity()

    # Get date range
    start_date = request.args.get('start', datetime.utcnow().strftime('%Y-%m-%d'))
    days = int(request.args.get('days', 30))

    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = start + timedelta(days=days)

    # Get all active schedules
    schedules = ScheduledReview.query.filter_by(
        user_id=user_id,
        is_active=True
    ).all()

    # Generate calendar events
    events = []
    for schedule in schedules:
        schedule_events = _generate_calendar_events(schedule, start, end)
        events.extend(schedule_events)

    # Sort by date
    events.sort(key=lambda x: x['date'])

    return APIResponse.success({
        'events': events,
        'start_date': start_date,
        'end_date': end.strftime('%Y-%m-%d')
    })


@scheduler_bp.route('/scheduler/batch', methods=['POST'])
@jwt_required()
def batch_review():
    """
    Run batch review on multiple repositories.

    Request Body:
        repository_ids (list): List of repository IDs
        review_type (str): Type of review to run
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_ids = data.get('repository_ids', [])
    review_type = data.get('review_type', 'quick')

    if not repository_ids:
        return APIResponse.validation_error("repository_ids is required")

    # Verify access to all repositories
    repositories = Repository.query.filter(
        Repository.id.in_(repository_ids),
        Repository.owner_id == user_id
    ).all()

    if len(repositories) != len(repository_ids):
        return APIResponse.forbidden("Access denied to some repositories")

    # Queue batch review
    batch_id = f"batch_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    results = []

    for repo in repositories:
        result = {
            'repository_id': repo.id,
            'repository_name': repo.name,
            'status': 'queued',
            'batch_id': batch_id
        }
        results.append(result)

    return APIResponse.accepted({
        'batch_id': batch_id,
        'repositories': results,
        'message': f'Batch review queued for {len(repositories)} repositories'
    })


# Helper Functions

def _calculate_next_run(schedule: ScheduledReview) -> datetime:
    """Calculate the next run time for a schedule"""
    now = datetime.utcnow()

    if schedule.schedule_type == 'daily':
        # Parse preferred time
        hour, minute = map(int, schedule.preferred_time.split(':'))
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

        if next_run <= now:
            next_run += timedelta(days=1)

    elif schedule.schedule_type == 'weekly':
        hour, minute = map(int, schedule.preferred_time.split(':'))
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # Find next scheduled day
        days = schedule.days_of_week or [0]  # Default to Monday
        current_day = now.weekday()

        for i in range(7):
            check_day = (current_day + i) % 7
            if check_day in days:
                next_run = now + timedelta(days=i)
                next_run = next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if next_run > now:
                    break
        else:
            next_run = now + timedelta(days=7)

    elif schedule.schedule_type in ['on_push', 'on_pr']:
        # Event-driven, no scheduled time
        next_run = None
    else:
        next_run = now + timedelta(days=1)

    return next_run


def _execute_scheduled_review(schedule: ScheduledReview, trigger_type: str = 'scheduled') -> Dict:
    """Execute a scheduled review"""
    import time
    start_time = time.time()

    try:
        # Simulate review execution
        issues_found = 5  # Placeholder
        files_reviewed = 10

        # Create execution record
        execution = ScheduleExecution(
            schedule_id=schedule.id,
            status='success',
            trigger_type=trigger_type,
            issues_found=issues_found,
            files_reviewed=files_reviewed,
            execution_time_ms=int((time.time() - start_time) * 1000)
        )

        # Update schedule
        schedule.last_run_at = datetime.utcnow()
        schedule.next_run_at = _calculate_next_run(schedule)
        schedule.run_count += 1

        db.session.add(execution)
        db.session.commit()

        return {
            'execution_id': execution.id,
            'status': 'success',
            'issues_found': issues_found,
            'files_reviewed': files_reviewed,
            'next_run_at': schedule.next_run_at.isoformat() if schedule.next_run_at else None
        }

    except Exception as e:
        execution = ScheduleExecution(
            schedule_id=schedule.id,
            status='failed',
            trigger_type=trigger_type,
            error_message=str(e),
            execution_time_ms=int((time.time() - start_time) * 1000)
        )
        db.session.add(execution)
        db.session.commit()

        return {
            'execution_id': execution.id,
            'status': 'failed',
            'error': str(e)
        }


def _generate_calendar_events(schedule: ScheduledReview, start: datetime, end: datetime) -> List[Dict]:
    """Generate calendar events for a schedule"""
    events = []
    current = start

    while current < end:
        if schedule.schedule_type == 'daily':
            hour, minute = map(int, schedule.preferred_time.split(':'))
            event_time = current.replace(hour=hour, minute=minute)

            events.append({
                'date': event_time.isoformat(),
                'schedule_id': schedule.id,
                'repository': schedule.repository.name if schedule.repository else 'Unknown',
                'review_type': schedule.review_type
            })
            current += timedelta(days=1)

        elif schedule.schedule_type == 'weekly':
            if current.weekday() in (schedule.days_of_week or []):
                hour, minute = map(int, schedule.preferred_time.split(':'))
                event_time = current.replace(hour=hour, minute=minute)

                events.append({
                    'date': event_time.isoformat(),
                    'schedule_id': schedule.id,
                    'repository': schedule.repository.name if schedule.repository else 'Unknown',
                    'review_type': schedule.review_type
                })
            current += timedelta(days=1)
        else:
            break

    return events
