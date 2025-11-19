"""
Centralized services for CodeGuardian backend

Provides reusable business logic components:
- AuthorizationService: Permission and access control
- EventService: Audit logging and notifications
- QueryService: Optimized database queries
- CacheService: In-memory caching
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from functools import wraps
import hashlib
import json
import time

from flask import request, g
from sqlalchemy import func, and_
from sqlalchemy.orm import joinedload

from src.database import db
from src.models.user import User
from src.models.collaboration import (
    Team, TeamMember, AuditLog, Notification,
    TeamActivity, NotificationPreference
)
from src.exceptions import AuthorizationError, NotFoundError


class AuthorizationService:
    """
    Centralized authorization service for team and resource permissions.

    Provides consistent permission checking across all routes.
    """

    # Role hierarchy: higher values have more permissions
    ROLE_HIERARCHY = {
        'member': 1,
        'reviewer': 2,
        'admin': 3,
        'owner': 4
    }

    # Permission mappings for each role
    ROLE_PERMISSIONS = {
        'member': ['view'],
        'reviewer': ['view', 'review', 'comment'],
        'admin': ['view', 'review', 'comment', 'manage_repos', 'manage_rules', 'invite'],
        'owner': ['view', 'review', 'comment', 'manage_repos', 'manage_rules', 'invite',
                  'manage_team', 'billing', 'delete']
    }

    @staticmethod
    def get_team_member(team_id: int, user_id: int) -> Optional[TeamMember]:
        """Get team membership for a user"""
        return TeamMember.query.filter_by(
            team_id=team_id,
            user_id=user_id,
            is_active=True
        ).first()

    @staticmethod
    def check_team_permission(
        team_id: int,
        user_id: int,
        permission: str
    ) -> bool:
        """
        Check if user has specific permission in team.

        Args:
            team_id: Team ID to check
            user_id: User ID to check
            permission: Permission to check (view, manage_repos, etc.)

        Returns:
            True if user has permission, False otherwise
        """
        member = AuthorizationService.get_team_member(team_id, user_id)
        if not member:
            return False

        # Check role permissions
        role_perms = AuthorizationService.ROLE_PERMISSIONS.get(member.role, [])
        if permission in role_perms:
            return True

        # Check specific permission flags
        permission_map = {
            'invite': member.can_invite,
            'manage_repos': member.can_manage_repos,
            'manage_rules': member.can_manage_rules,
            'view_analytics': member.can_view_analytics
        }

        return permission_map.get(permission, False)

    @staticmethod
    def require_team_permission(team_id: int, user_id: int, permission: str) -> None:
        """
        Require team permission, raising AuthorizationError if not granted.

        Args:
            team_id: Team ID
            user_id: User ID
            permission: Required permission

        Raises:
            AuthorizationError: If permission not granted
        """
        if not AuthorizationService.check_team_permission(team_id, user_id, permission):
            raise AuthorizationError(
                f"You don't have {permission} permission for this team",
                {'team_id': team_id, 'permission': permission}
            )

    @staticmethod
    def check_role_minimum(
        team_id: int,
        user_id: int,
        minimum_role: str
    ) -> bool:
        """
        Check if user has at least the minimum role level.

        Args:
            team_id: Team ID
            user_id: User ID
            minimum_role: Minimum required role

        Returns:
            True if user's role >= minimum role
        """
        member = AuthorizationService.get_team_member(team_id, user_id)
        if not member:
            return False

        user_level = AuthorizationService.ROLE_HIERARCHY.get(member.role, 0)
        required_level = AuthorizationService.ROLE_HIERARCHY.get(minimum_role, 0)

        return user_level >= required_level

    @staticmethod
    def get_user_teams(user_id: int) -> List[Dict]:
        """
        Get all teams a user belongs to with their role.

        Args:
            user_id: User ID

        Returns:
            List of team dictionaries with role info
        """
        memberships = TeamMember.query.filter_by(
            user_id=user_id,
            is_active=True
        ).options(joinedload(TeamMember.team)).all()

        return [
            {
                'team': m.team.to_dict(),
                'role': m.role,
                'joined_at': m.joined_at.isoformat() if m.joined_at else None
            }
            for m in memberships
        ]

    @staticmethod
    def is_team_owner(team_id: int, user_id: int) -> bool:
        """Check if user is team owner"""
        team = Team.query.get(team_id)
        return team and team.owner_id == user_id


class EventService:
    """
    Centralized event and notification service.

    Handles audit logging, notifications, and team activities.
    """

    @staticmethod
    def log_audit(
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[int] = None,
        team_id: Optional[int] = None,
        old_values: Optional[Dict] = None,
        new_values: Optional[Dict] = None,
        status: str = 'success',
        error_message: Optional[str] = None
    ) -> AuditLog:
        """
        Create an audit log entry.

        Args:
            action: Action performed (create, update, delete, etc.)
            resource_type: Type of resource affected
            resource_id: ID of affected resource
            user_id: User who performed action
            team_id: Team context (if applicable)
            old_values: Previous values for updates
            new_values: New values for updates
            status: Action status (success, failure)
            error_message: Error message if status is failure

        Returns:
            Created AuditLog instance
        """
        # Get request context if available
        ip_address = None
        user_agent = None
        request_id = None

        try:
            ip_address = request.remote_addr
            user_agent = request.user_agent.string[:500] if request.user_agent else None
            request_id = request.headers.get('X-Request-ID')
        except RuntimeError:
            # Outside request context
            pass

        audit_log = AuditLog(
            user_id=user_id,
            team_id=team_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            old_values=old_values,
            new_values=new_values,
            status=status,
            error_message=error_message
        )

        db.session.add(audit_log)
        db.session.commit()

        return audit_log

    @staticmethod
    def create_notification(
        user_id: int,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        icon: Optional[str] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None,
        action_url: Optional[str] = None
    ) -> Notification:
        """
        Create a user notification.

        Args:
            user_id: Recipient user ID
            notification_type: Type of notification
            title: Notification title
            message: Notification body
            icon: Icon identifier
            related_type: Related resource type
            related_id: Related resource ID
            action_url: URL for notification action

        Returns:
            Created Notification instance
        """
        notification = Notification(
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            icon=icon,
            related_type=related_type,
            related_id=related_id,
            action_url=action_url
        )

        db.session.add(notification)
        db.session.commit()

        return notification

    @staticmethod
    def create_team_activity(
        team_id: int,
        activity_type: str,
        title: str,
        description: Optional[str] = None,
        user_id: Optional[int] = None,
        metadata: Optional[Dict] = None,
        related_type: Optional[str] = None,
        related_id: Optional[int] = None
    ) -> TeamActivity:
        """
        Create a team activity entry.

        Args:
            team_id: Team ID
            activity_type: Type of activity
            title: Activity title
            description: Activity description
            user_id: User who performed action
            metadata: Additional metadata
            related_type: Related resource type
            related_id: Related resource ID

        Returns:
            Created TeamActivity instance
        """
        activity = TeamActivity(
            team_id=team_id,
            user_id=user_id,
            activity_type=activity_type,
            title=title,
            description=description,
            metadata=metadata or {},
            related_type=related_type,
            related_id=related_id
        )

        db.session.add(activity)
        db.session.commit()

        return activity

    @staticmethod
    def notify_team_members(
        team_id: int,
        notification_type: str,
        title: str,
        message: Optional[str] = None,
        exclude_user_id: Optional[int] = None,
        min_role: str = 'member',
        **kwargs
    ) -> List[Notification]:
        """
        Send notification to all team members.

        Args:
            team_id: Team ID
            notification_type: Type of notification
            title: Notification title
            message: Notification body
            exclude_user_id: User to exclude from notification
            min_role: Minimum role to receive notification
            **kwargs: Additional notification parameters

        Returns:
            List of created notifications
        """
        members = TeamMember.query.filter_by(
            team_id=team_id,
            is_active=True
        ).all()

        notifications = []
        for member in members:
            # Skip excluded user
            if member.user_id == exclude_user_id:
                continue

            # Check minimum role
            if not AuthorizationService.check_role_minimum(
                team_id, member.user_id, min_role
            ):
                continue

            notification = EventService.create_notification(
                user_id=member.user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                **kwargs
            )
            notifications.append(notification)

        return notifications


class QueryService:
    """
    Centralized database query service.

    Provides optimized queries to avoid N+1 problems and
    standardize common data access patterns.
    """

    @staticmethod
    def get_user_with_stats(user_id: int) -> Optional[Dict]:
        """
        Get user with aggregated statistics using efficient query.

        Args:
            user_id: User ID

        Returns:
            User dictionary with stats or None if not found
        """
        from src.models.repository import Repository
        from src.models.review import Review

        user = User.query.get(user_id)
        if not user:
            return None

        # Get stats with single aggregation query
        stats = db.session.query(
            func.count(Repository.id).label('repo_count'),
            func.count(Review.id).label('review_count')
        ).select_from(User).outerjoin(
            Repository, Repository.owner_id == User.id
        ).outerjoin(
            Review, Review.user_id == User.id
        ).filter(User.id == user_id).first()

        user_dict = user.to_dict()
        user_dict['stats'] = {
            'repository_count': stats.repo_count if stats else 0,
            'review_count': stats.review_count if stats else 0
        }

        return user_dict

    @staticmethod
    def get_team_with_stats(team_id: int) -> Optional[Dict]:
        """
        Get team with aggregated statistics.

        Args:
            team_id: Team ID

        Returns:
            Team dictionary with stats or None
        """
        team = Team.query.options(
            joinedload(Team.members)
        ).get(team_id)

        if not team:
            return None

        team_dict = team.to_dict(include_members=True)
        team_dict['stats'] = {
            'member_count': len(team.members),
            'active_members': sum(1 for m in team.members if m.is_active)
        }

        return team_dict

    @staticmethod
    def paginate_query(
        query,
        page: int = 1,
        per_page: int = 20,
        max_per_page: int = 100
    ) -> Tuple[List, int]:
        """
        Paginate a SQLAlchemy query.

        Args:
            query: SQLAlchemy query
            page: Page number (1-indexed)
            per_page: Items per page
            max_per_page: Maximum allowed per_page

        Returns:
            Tuple of (items, total_count)
        """
        # Ensure valid pagination parameters
        page = max(1, page)
        per_page = min(max(1, per_page), max_per_page)

        # Get total count
        total = query.count()

        # Get paginated items
        items = query.offset((page - 1) * per_page).limit(per_page).all()

        return items, total

    @staticmethod
    def get_notifications_paginated(
        user_id: int,
        page: int = 1,
        per_page: int = 20,
        unread_only: bool = False
    ) -> Tuple[List[Dict], int]:
        """
        Get paginated notifications for user.

        Args:
            user_id: User ID
            page: Page number
            per_page: Items per page
            unread_only: Only return unread notifications

        Returns:
            Tuple of (notification dicts, total count)
        """
        query = Notification.query.filter_by(
            user_id=user_id,
            is_archived=False
        ).order_by(Notification.created_at.desc())

        if unread_only:
            query = query.filter_by(is_read=False)

        items, total = QueryService.paginate_query(query, page, per_page)

        return [n.to_dict() for n in items], total

    @staticmethod
    def get_audit_logs_paginated(
        page: int = 1,
        per_page: int = 50,
        user_id: Optional[int] = None,
        team_id: Optional[int] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Tuple[List[Dict], int]:
        """
        Get paginated audit logs with filters.

        Args:
            page: Page number
            per_page: Items per page
            user_id: Filter by user
            team_id: Filter by team
            action: Filter by action type
            resource_type: Filter by resource type
            start_date: Filter by start date
            end_date: Filter by end date

        Returns:
            Tuple of (audit log dicts, total count)
        """
        query = AuditLog.query.options(
            joinedload(AuditLog.user)
        ).order_by(AuditLog.created_at.desc())

        if user_id:
            query = query.filter_by(user_id=user_id)
        if team_id:
            query = query.filter_by(team_id=team_id)
        if action:
            query = query.filter_by(action=action)
        if resource_type:
            query = query.filter_by(resource_type=resource_type)
        if start_date:
            query = query.filter(AuditLog.created_at >= start_date)
        if end_date:
            query = query.filter(AuditLog.created_at <= end_date)

        items, total = QueryService.paginate_query(query, page, per_page, 100)

        return [log.to_dict() for log in items], total


class CacheService:
    """
    Simple in-memory cache service with TTL support.

    For production, replace with Redis or similar.
    """

    _cache: Dict[str, Tuple[Any, float]] = {}
    _default_ttl = 300  # 5 minutes

    @classmethod
    def get(cls, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if key not in cls._cache:
            return None

        value, expires_at = cls._cache[key]

        if time.time() > expires_at:
            del cls._cache[key]
            return None

        return value

    @classmethod
    def set(cls, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (default: 5 minutes)
        """
        ttl = ttl or cls._default_ttl
        expires_at = time.time() + ttl
        cls._cache[key] = (value, expires_at)

    @classmethod
    def delete(cls, key: str) -> None:
        """Delete value from cache"""
        if key in cls._cache:
            del cls._cache[key]

    @classmethod
    def clear(cls) -> None:
        """Clear all cached values"""
        cls._cache.clear()

    @classmethod
    def cache_key(cls, *args) -> str:
        """
        Generate cache key from arguments.

        Args:
            *args: Key components

        Returns:
            Hashed cache key
        """
        key_str = ':'.join(str(arg) for arg in args)
        return hashlib.md5(key_str.encode()).hexdigest()

    @classmethod
    def cached(cls, ttl: Optional[int] = None):
        """
        Decorator to cache function results.

        Args:
            ttl: Cache TTL in seconds

        Returns:
            Decorator function
        """
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key from function and arguments
                key = cls.cache_key(
                    func.__name__,
                    args,
                    json.dumps(kwargs, sort_keys=True, default=str)
                )

                # Check cache
                cached_value = cls.get(key)
                if cached_value is not None:
                    return cached_value

                # Call function and cache result
                result = func(*args, **kwargs)
                cls.set(key, result, ttl)

                return result
            return wrapper
        return decorator


# Export all services
__all__ = [
    'AuthorizationService',
    'EventService',
    'QueryService',
    'CacheService'
]
