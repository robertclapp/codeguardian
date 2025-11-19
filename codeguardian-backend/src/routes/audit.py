"""
Audit Logging routes for CodeGuardian

Provides comprehensive audit trail for compliance and security.
"""

import logging
from typing import Any, Tuple
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.collaboration import AuditLog, Team, TeamMember
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, AuthorizationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

audit_bp = Blueprint('audit', __name__)


@audit_bp.route('/audit/logs', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def query_audit_logs() -> Tuple[Any, int]:
    """
    Query audit logs with filtering.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        team_id (int): Filter by team
        user_id (int): Filter by user
        action (str): Filter by action type
        resource_type (str): Filter by resource type
        start_date (str): Start date (ISO format)
        end_date (str): End date (ISO format)

    Returns:
        Paginated audit logs.
    """
    user = request.current_user

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param('per_page', 50, min_val=1, max_val=200)

    query = AuditLog.query

    # Filter by team (user must be admin)
    team_id = request.args.get('team_id', type=int)
    if team_id:
        member = TeamMember.query.filter_by(
            team_id=team_id, user_id=user.id, is_active=True
        ).first()
        if not member or member.role not in ['owner', 'admin']:
            raise AuthorizationError("Only team admins can view audit logs")
        query = query.filter_by(team_id=team_id)
    else:
        # Show only user's own logs
        query = query.filter_by(user_id=user.id)

    # Apply filters
    filter_user_id = request.args.get('user_id', type=int)
    if filter_user_id:
        query = query.filter_by(user_id=filter_user_id)

    action = request.args.get('action', '')
    if action:
        query = query.filter_by(action=action)

    resource_type = request.args.get('resource_type', '')
    if resource_type:
        query = query.filter_by(resource_type=resource_type)

    start_date = request.args.get('start_date', '')
    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))

    end_date = request.args.get('end_date', '')
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))

    query = query.order_by(AuditLog.created_at.desc())

    total = query.count()
    logs = query.offset((page - 1) * per_page).limit(per_page).all()

    return APIResponse.paginated(
        items=[log.to_dict() for log in logs],
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} audit logs"
    )


@audit_bp.route('/audit/logs/<int:log_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_audit_log(log_id: int) -> Tuple[Any, int]:
    """
    Get a specific audit log entry.

    Path Parameters:
        log_id: ID of the audit log

    Returns:
        Audit log details.
    """
    user = request.current_user

    log = AuditLog.query.get(log_id)
    if not log:
        raise NotFoundError("Audit log", log_id)

    # Check access
    if log.team_id:
        member = TeamMember.query.filter_by(
            team_id=log.team_id, user_id=user.id, is_active=True
        ).first()
        if not member or member.role not in ['owner', 'admin']:
            raise AuthorizationError("Access denied")
    elif log.user_id != user.id:
        raise AuthorizationError("Access denied")

    return APIResponse.success(
        data=log.to_dict(),
        message="Audit log retrieved"
    )


@audit_bp.route('/audit/export', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def export_audit_logs() -> Tuple[Any, int]:
    """
    Export audit logs for compliance.

    Request Body:
        team_id (int): Team ID
        format (str): Export format (json, csv)
        start_date (str): Start date
        end_date (str): End date

    Returns:
        Export data or download URL.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    team_id = RequestValidator.get_required_field(data, 'team_id', int)
    export_format = RequestValidator.get_optional_field(data, 'format', 'json', str)
    start_date = RequestValidator.get_optional_field(data, 'start_date', '', str)
    end_date = RequestValidator.get_optional_field(data, 'end_date', '', str)

    # Verify admin access
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()
    if not member or member.role not in ['owner', 'admin']:
        raise AuthorizationError("Only team admins can export audit logs")

    query = AuditLog.query.filter_by(team_id=team_id)

    if start_date:
        query = query.filter(AuditLog.created_at >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(AuditLog.created_at <= datetime.fromisoformat(end_date))

    logs = query.order_by(AuditLog.created_at.desc()).all()

    # Create export
    export_data = {
        'team_id': team_id,
        'exported_at': datetime.utcnow().isoformat(),
        'exported_by': user.username,
        'count': len(logs),
        'logs': [log.to_dict() for log in logs]
    }

    return APIResponse.success(
        data=export_data,
        message=f"Exported {len(logs)} audit logs"
    )


@audit_bp.route('/audit/reports', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def generate_compliance_report() -> Tuple[Any, int]:
    """
    Generate compliance report summary.

    Query Parameters:
        team_id (int): Team ID
        period (str): Report period (7d, 30d, 90d)

    Returns:
        Compliance report.
    """
    user = request.current_user

    team_id = request.args.get('team_id', type=int)
    period = request.args.get('period', '30d')

    if not team_id:
        raise ValidationError("team_id is required", field='team_id')

    # Verify admin access
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()
    if not member or member.role not in ['owner', 'admin']:
        raise AuthorizationError("Only team admins can view compliance reports")

    # Calculate date range
    days = {'7d': 7, '30d': 30, '90d': 90}.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    # Query logs
    logs = AuditLog.query.filter(
        AuditLog.team_id == team_id,
        AuditLog.created_at >= start_date
    ).all()

    # Generate report
    action_counts = {}
    resource_counts = {}
    user_activity = {}
    failed_actions = 0

    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
        resource_counts[log.resource_type] = resource_counts.get(log.resource_type, 0) + 1

        if log.user_id:
            user_activity[log.user_id] = user_activity.get(log.user_id, 0) + 1

        if log.status == 'failure':
            failed_actions += 1

    report = {
        'team_id': team_id,
        'period': period,
        'generated_at': datetime.utcnow().isoformat(),
        'summary': {
            'total_events': len(logs),
            'unique_users': len(user_activity),
            'failed_actions': failed_actions,
            'success_rate': round((1 - failed_actions / max(len(logs), 1)) * 100, 2)
        },
        'by_action': [{'action': k, 'count': v} for k, v in sorted(action_counts.items(), key=lambda x: -x[1])],
        'by_resource': [{'resource': k, 'count': v} for k, v in sorted(resource_counts.items(), key=lambda x: -x[1])],
        'top_users': sorted([{'user_id': k, 'events': v} for k, v in user_activity.items()], key=lambda x: -x['events'])[:10]
    }

    return APIResponse.success(
        data=report,
        message="Compliance report generated"
    )


@audit_bp.route('/audit/user/<int:target_user_id>/activity', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_user_activity(target_user_id: int) -> Tuple[Any, int]:
    """
    Get activity report for a specific user.

    Path Parameters:
        target_user_id: ID of the user

    Query Parameters:
        team_id (int): Team context
        days (int): Number of days (default: 30)

    Returns:
        User activity report.
    """
    user = request.current_user

    team_id = request.args.get('team_id', type=int)
    days = RequestValidator.get_int_param('days', 30, min_val=1, max_val=365)

    # Self-access or admin access
    if target_user_id != user.id:
        if not team_id:
            raise AuthorizationError("Team context required to view other users' activity")

        member = TeamMember.query.filter_by(
            team_id=team_id, user_id=user.id, is_active=True
        ).first()
        if not member or member.role not in ['owner', 'admin']:
            raise AuthorizationError("Only team admins can view other users' activity")

    start_date = datetime.utcnow() - timedelta(days=days)

    query = AuditLog.query.filter(
        AuditLog.user_id == target_user_id,
        AuditLog.created_at >= start_date
    )

    if team_id:
        query = query.filter_by(team_id=team_id)

    logs = query.order_by(AuditLog.created_at.desc()).all()

    # Summarize activity
    action_counts = {}
    daily_activity = {}

    for log in logs:
        action_counts[log.action] = action_counts.get(log.action, 0) + 1
        day = log.created_at.strftime('%Y-%m-%d')
        daily_activity[day] = daily_activity.get(day, 0) + 1

    return APIResponse.success(
        data={
            'user_id': target_user_id,
            'period_days': days,
            'total_actions': len(logs),
            'by_action': action_counts,
            'daily_activity': [{'date': k, 'count': v} for k, v in sorted(daily_activity.items())]
        },
        message="User activity report generated"
    )
