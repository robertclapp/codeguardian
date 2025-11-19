"""
Notification Center routes for CodeGuardian

Provides notification management and preference settings.
"""

import logging
from typing import Any, Tuple
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.collaboration import Notification, NotificationPreference
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/notifications', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_notifications() -> Tuple[Any, int]:
    """
    List notifications for the current user.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        unread_only (bool): Only show unread notifications
        type (str): Filter by notification type

    Returns:
        Paginated list of notifications.
    """
    user = request.current_user

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param('per_page', 20, min_val=1, max_val=100)
    unread_only = RequestValidator.get_bool_param('unread_only', False)
    notif_type = request.args.get('type', '')

    query = Notification.query.filter_by(user_id=user.id, is_archived=False)

    if unread_only:
        query = query.filter_by(is_read=False)

    if notif_type:
        query = query.filter_by(type=notif_type)

    query = query.order_by(Notification.created_at.desc())

    total = query.count()
    unread_count = Notification.query.filter_by(user_id=user.id, is_read=False, is_archived=False).count()
    notifications = query.offset((page - 1) * per_page).limit(per_page).all()

    return APIResponse.paginated(
        items=[n.to_dict() for n in notifications],
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} notifications ({unread_count} unread)"
    )


@notifications_bp.route('/notifications/<int:notification_id>/read', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def mark_as_read(notification_id: int) -> Tuple[Any, int]:
    """
    Mark a notification as read.

    Path Parameters:
        notification_id: ID of the notification

    Returns:
        Updated notification.
    """
    user = request.current_user

    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user.id:
        raise NotFoundError("Notification", notification_id)

    notification.is_read = True
    notification.read_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success(
        data=notification.to_dict(),
        message="Notification marked as read"
    )


@notifications_bp.route('/notifications/read-all', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def mark_all_read() -> Tuple[Any, int]:
    """
    Mark all notifications as read.

    Returns:
        Count of notifications marked as read.
    """
    user = request.current_user

    count = Notification.query.filter_by(
        user_id=user.id, is_read=False
    ).update({
        'is_read': True,
        'read_at': datetime.utcnow()
    })

    db.session.commit()

    return APIResponse.success(
        data={'count': count},
        message=f"Marked {count} notifications as read"
    )


@notifications_bp.route('/notifications/<int:notification_id>/archive', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def archive_notification(notification_id: int) -> Tuple[Any, int]:
    """
    Archive a notification.

    Path Parameters:
        notification_id: ID of the notification

    Returns:
        Confirmation.
    """
    user = request.current_user

    notification = Notification.query.get(notification_id)
    if not notification or notification.user_id != user.id:
        raise NotFoundError("Notification", notification_id)

    notification.is_archived = True
    db.session.commit()

    return APIResponse.success(message="Notification archived")


@notifications_bp.route('/notifications/preferences', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_preferences() -> Tuple[Any, int]:
    """
    Get notification preferences.

    Returns:
        Notification preferences.
    """
    user = request.current_user

    prefs = NotificationPreference.query.filter_by(user_id=user.id).first()

    if not prefs:
        # Create default preferences
        prefs = NotificationPreference(user_id=user.id)
        db.session.add(prefs)
        db.session.commit()

    return APIResponse.success(
        data=prefs.to_dict(),
        message="Preferences retrieved"
    )


@notifications_bp.route('/notifications/preferences', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_preferences() -> Tuple[Any, int]:
    """
    Update notification preferences.

    Request Body:
        email (dict): Email notification settings
        inapp (dict): In-app notification settings
        push (dict): Push notification settings
        quiet_hours (dict): Quiet hours settings

    Returns:
        Updated preferences.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    prefs = NotificationPreference.query.filter_by(user_id=user.id).first()

    if not prefs:
        prefs = NotificationPreference(user_id=user.id)
        db.session.add(prefs)

    # Update email preferences
    if 'email' in data:
        email = data['email']
        if 'enabled' in email:
            prefs.email_enabled = email['enabled']
        if 'digest' in email:
            prefs.email_digest = email['digest']
        if 'review_complete' in email:
            prefs.email_review_complete = email['review_complete']
        if 'team_invites' in email:
            prefs.email_team_invites = email['team_invites']
        if 'mentions' in email:
            prefs.email_mentions = email['mentions']
        if 'marketing' in email:
            prefs.email_marketing = email['marketing']

    # Update in-app preferences
    if 'inapp' in data:
        inapp = data['inapp']
        if 'enabled' in inapp:
            prefs.inapp_enabled = inapp['enabled']
        if 'review_complete' in inapp:
            prefs.inapp_review_complete = inapp['review_complete']
        if 'team_activity' in inapp:
            prefs.inapp_team_activity = inapp['team_activity']
        if 'mentions' in inapp:
            prefs.inapp_mentions = inapp['mentions']
        if 'system' in inapp:
            prefs.inapp_system = inapp['system']

    # Update push preferences
    if 'push' in data:
        push = data['push']
        if 'enabled' in push:
            prefs.push_enabled = push['enabled']

    # Update quiet hours
    if 'quiet_hours' in data:
        qh = data['quiet_hours']
        if 'enabled' in qh:
            prefs.quiet_hours_enabled = qh['enabled']
        if 'start' in qh:
            prefs.quiet_hours_start = qh['start']
        if 'end' in qh:
            prefs.quiet_hours_end = qh['end']
        if 'timezone' in qh:
            prefs.timezone = qh['timezone']

    db.session.commit()

    return APIResponse.success(
        data=prefs.to_dict(),
        message="Preferences updated"
    )


@notifications_bp.route('/notifications/test', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def send_test_notification() -> Tuple[Any, int]:
    """
    Send a test notification to yourself.

    Returns:
        Confirmation.
    """
    user = request.current_user

    notification = Notification(
        user_id=user.id,
        type='test',
        title='Test Notification',
        message='This is a test notification from CodeGuardian.',
        icon='bell'
    )
    db.session.add(notification)
    db.session.commit()

    return APIResponse.success(
        data=notification.to_dict(),
        message="Test notification sent"
    )


@notifications_bp.route('/notifications/unread-count', methods=['GET'])
@cross_origin()
@require_auth
@handle_errors
def get_unread_count() -> Tuple[Any, int]:
    """
    Get count of unread notifications.

    Returns:
        Unread notification count.
    """
    user = request.current_user

    count = Notification.query.filter_by(
        user_id=user.id, is_read=False, is_archived=False
    ).count()

    return APIResponse.success(
        data={'count': count},
        message=f"{count} unread notifications"
    )
