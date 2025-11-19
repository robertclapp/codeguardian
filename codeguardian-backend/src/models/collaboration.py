"""
Team and collaboration models for CodeGuardian

Provides database models for team management, memberships, and collaboration.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Index
from src.database import db


class Team(db.Model):
    """Team workspace model"""
    __tablename__ = 'teams'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), unique=True, nullable=False, index=True)
    description = db.Column(db.Text)
    avatar_url = db.Column(db.String(500))

    # Owner
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Settings
    is_private = db.Column(db.Boolean, default=True)
    allow_member_invites = db.Column(db.Boolean, default=False)
    default_review_rules = db.Column(db.JSON, default=dict)
    notification_settings = db.Column(db.JSON, default=dict)

    # Subscription
    plan_type = db.Column(db.String(50), default='free')
    max_members = db.Column(db.Integer, default=5)
    max_repositories = db.Column(db.Integer, default=10)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = db.relationship('User', backref='owned_teams', foreign_keys=[owner_id])
    members = db.relationship('TeamMember', back_populates='team', cascade='all, delete-orphan')
    invitations = db.relationship('TeamInvitation', back_populates='team', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_team_owner', 'owner_id'),
        Index('idx_team_created', 'created_at'),
    )

    def to_dict(self, include_members: bool = False) -> dict:
        """Convert team to dictionary"""
        data = {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'avatar_url': self.avatar_url,
            'owner_id': self.owner_id,
            'is_private': self.is_private,
            'plan_type': self.plan_type,
            'max_members': self.max_members,
            'max_repositories': self.max_repositories,
            'member_count': len(self.members),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_members:
            data['members'] = [m.to_dict() for m in self.members]

        return data


class TeamMember(db.Model):
    """Team membership model"""
    __tablename__ = 'team_members'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Role: owner, admin, reviewer, member
    role = db.Column(db.String(50), default='member')

    # Permissions
    can_invite = db.Column(db.Boolean, default=False)
    can_manage_repos = db.Column(db.Boolean, default=False)
    can_manage_rules = db.Column(db.Boolean, default=False)
    can_view_analytics = db.Column(db.Boolean, default=True)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active_at = db.Column(db.DateTime)

    # Relationships
    team = db.relationship('Team', back_populates='members')
    user = db.relationship('User', backref='team_memberships')

    __table_args__ = (
        db.UniqueConstraint('team_id', 'user_id', name='unique_team_member'),
        Index('idx_member_user', 'user_id'),
        Index('idx_member_team', 'team_id'),
    )

    def to_dict(self) -> dict:
        """Convert membership to dictionary"""
        return {
            'id': self.id,
            'team_id': self.team_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'email': self.user.email if self.user else None,
            'role': self.role,
            'can_invite': self.can_invite,
            'can_manage_repos': self.can_manage_repos,
            'can_manage_rules': self.can_manage_rules,
            'can_view_analytics': self.can_view_analytics,
            'is_active': self.is_active,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'last_active_at': self.last_active_at.isoformat() if self.last_active_at else None
        }


class TeamInvitation(db.Model):
    """Team invitation model"""
    __tablename__ = 'team_invitations'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)

    # Invitation details
    email = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), default='member')
    token = db.Column(db.String(100), unique=True, nullable=False, index=True)
    message = db.Column(db.Text)

    # Invited by
    invited_by_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Status
    status = db.Column(db.String(50), default='pending')  # pending, accepted, declined, expired
    expires_at = db.Column(db.DateTime, nullable=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime)

    # Relationships
    team = db.relationship('Team', back_populates='invitations')
    invited_by = db.relationship('User', backref='sent_invitations')

    __table_args__ = (
        Index('idx_invitation_email', 'email'),
        Index('idx_invitation_status', 'status'),
    )

    def to_dict(self) -> dict:
        """Convert invitation to dictionary"""
        return {
            'id': self.id,
            'team_id': self.team_id,
            'team_name': self.team.name if self.team else None,
            'email': self.email,
            'role': self.role,
            'message': self.message,
            'invited_by': self.invited_by.username if self.invited_by else None,
            'status': self.status,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TeamActivity(db.Model):
    """Team activity feed model"""
    __tablename__ = 'team_activities'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Activity details
    activity_type = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    metadata = db.Column(db.JSON, default=dict)

    # Related entities
    related_type = db.Column(db.String(50))  # review, repository, member, etc.
    related_id = db.Column(db.Integer)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    team = db.relationship('Team', backref='activities')
    user = db.relationship('User', backref='team_activities')

    __table_args__ = (
        Index('idx_activity_team', 'team_id'),
        Index('idx_activity_type', 'activity_type'),
    )

    def to_dict(self) -> dict:
        """Convert activity to dictionary"""
        return {
            'id': self.id,
            'team_id': self.team_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else 'System',
            'activity_type': self.activity_type,
            'title': self.title,
            'description': self.description,
            'metadata': self.metadata,
            'related_type': self.related_type,
            'related_id': self.related_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    """User notification model"""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Notification content
    type = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text)
    icon = db.Column(db.String(50))

    # Related entities
    related_type = db.Column(db.String(50))
    related_id = db.Column(db.Integer)
    action_url = db.Column(db.String(500))

    # Status
    is_read = db.Column(db.Boolean, default=False)
    is_archived = db.Column(db.Boolean, default=False)

    # Delivery
    email_sent = db.Column(db.Boolean, default=False)
    push_sent = db.Column(db.Boolean, default=False)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    read_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship('User', backref='notifications')

    __table_args__ = (
        Index('idx_notification_user', 'user_id'),
        Index('idx_notification_read', 'is_read'),
        Index('idx_notification_type', 'type'),
    )

    def to_dict(self) -> dict:
        """Convert notification to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'icon': self.icon,
            'related_type': self.related_type,
            'related_id': self.related_id,
            'action_url': self.action_url,
            'is_read': self.is_read,
            'is_archived': self.is_archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None
        }


class NotificationPreference(db.Model):
    """User notification preferences model"""
    __tablename__ = 'notification_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)

    # Email preferences
    email_enabled = db.Column(db.Boolean, default=True)
    email_digest = db.Column(db.String(50), default='instant')  # instant, daily, weekly
    email_review_complete = db.Column(db.Boolean, default=True)
    email_team_invites = db.Column(db.Boolean, default=True)
    email_mentions = db.Column(db.Boolean, default=True)
    email_marketing = db.Column(db.Boolean, default=False)

    # In-app preferences
    inapp_enabled = db.Column(db.Boolean, default=True)
    inapp_review_complete = db.Column(db.Boolean, default=True)
    inapp_team_activity = db.Column(db.Boolean, default=True)
    inapp_mentions = db.Column(db.Boolean, default=True)
    inapp_system = db.Column(db.Boolean, default=True)

    # Push preferences
    push_enabled = db.Column(db.Boolean, default=False)

    # Quiet hours
    quiet_hours_enabled = db.Column(db.Boolean, default=False)
    quiet_hours_start = db.Column(db.String(5))  # HH:MM
    quiet_hours_end = db.Column(db.String(5))
    timezone = db.Column(db.String(50), default='UTC')

    # Timestamps
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='notification_preferences')

    def to_dict(self) -> dict:
        """Convert preferences to dictionary"""
        return {
            'user_id': self.user_id,
            'email': {
                'enabled': self.email_enabled,
                'digest': self.email_digest,
                'review_complete': self.email_review_complete,
                'team_invites': self.email_team_invites,
                'mentions': self.email_mentions,
                'marketing': self.email_marketing
            },
            'inapp': {
                'enabled': self.inapp_enabled,
                'review_complete': self.inapp_review_complete,
                'team_activity': self.inapp_team_activity,
                'mentions': self.inapp_mentions,
                'system': self.inapp_system
            },
            'push': {
                'enabled': self.push_enabled
            },
            'quiet_hours': {
                'enabled': self.quiet_hours_enabled,
                'start': self.quiet_hours_start,
                'end': self.quiet_hours_end,
                'timezone': self.timezone
            }
        }


class AuditLog(db.Model):
    """Audit log for compliance and tracking"""
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)

    # Actor
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'))

    # Action details
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(100), nullable=False)
    resource_id = db.Column(db.String(100))

    # Request context
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    request_id = db.Column(db.String(100))

    # Changes
    old_values = db.Column(db.JSON)
    new_values = db.Column(db.JSON)

    # Status
    status = db.Column(db.String(50), default='success')  # success, failure
    error_message = db.Column(db.Text)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = db.relationship('User', backref='audit_logs')
    team = db.relationship('Team', backref='audit_logs')

    __table_args__ = (
        Index('idx_audit_user', 'user_id'),
        Index('idx_audit_team', 'team_id'),
        Index('idx_audit_action', 'action'),
        Index('idx_audit_resource', 'resource_type', 'resource_id'),
        Index('idx_audit_created', 'created_at'),
    )

    def to_dict(self) -> dict:
        """Convert audit log to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'team_id': self.team_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'status': self.status,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Discussion(db.Model):
    """Code review discussion/comment thread"""
    __tablename__ = 'discussions'

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Discussion content
    content = db.Column(db.Text, nullable=False)

    # Code reference
    file_path = db.Column(db.String(500))
    line_start = db.Column(db.Integer)
    line_end = db.Column(db.Integer)
    code_snippet = db.Column(db.Text)

    # Thread
    parent_id = db.Column(db.Integer, db.ForeignKey('discussions.id'))

    # Status
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='discussions')
    resolved_by = db.relationship('User', foreign_keys=[resolved_by_id])
    replies = db.relationship('Discussion', backref=db.backref('parent', remote_side=[id]))
    reactions = db.relationship('DiscussionReaction', back_populates='discussion', cascade='all, delete-orphan')

    __table_args__ = (
        Index('idx_discussion_review', 'review_id'),
        Index('idx_discussion_user', 'user_id'),
        Index('idx_discussion_parent', 'parent_id'),
    )

    def to_dict(self, include_replies: bool = False) -> dict:
        """Convert discussion to dictionary"""
        data = {
            'id': self.id,
            'review_id': self.review_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'content': self.content,
            'file_path': self.file_path,
            'line_start': self.line_start,
            'line_end': self.line_end,
            'code_snippet': self.code_snippet,
            'parent_id': self.parent_id,
            'is_resolved': self.is_resolved,
            'resolved_by': self.resolved_by.username if self.resolved_by else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'reply_count': len(self.replies),
            'reactions': [r.to_dict() for r in self.reactions],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

        if include_replies:
            data['replies'] = [r.to_dict() for r in self.replies]

        return data


class DiscussionReaction(db.Model):
    """Reaction to a discussion"""
    __tablename__ = 'discussion_reactions'

    id = db.Column(db.Integer, primary_key=True)
    discussion_id = db.Column(db.Integer, db.ForeignKey('discussions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Reaction type
    emoji = db.Column(db.String(50), nullable=False)

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    discussion = db.relationship('Discussion', back_populates='reactions')
    user = db.relationship('User', backref='discussion_reactions')

    __table_args__ = (
        db.UniqueConstraint('discussion_id', 'user_id', 'emoji', name='unique_reaction'),
    )

    def to_dict(self) -> dict:
        """Convert reaction to dictionary"""
        return {
            'id': self.id,
            'discussion_id': self.discussion_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'emoji': self.emoji,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class ReviewApproval(db.Model):
    """Review approval status"""
    __tablename__ = 'review_approvals'

    id = db.Column(db.Integer, primary_key=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Approval status
    status = db.Column(db.String(50), nullable=False)  # approved, changes_requested, commented
    comment = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='review_approvals')

    __table_args__ = (
        db.UniqueConstraint('review_id', 'user_id', name='unique_approval'),
        Index('idx_approval_review', 'review_id'),
    )

    def to_dict(self) -> dict:
        """Convert approval to dictionary"""
        return {
            'id': self.id,
            'review_id': self.review_id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'status': self.status,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
