"""
Team Workspaces routes for CodeGuardian

Provides team management, membership, and collaboration features.
"""

import logging
import secrets
import re
from typing import Dict, Any, Tuple
from datetime import datetime, timedelta
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.user import User
from src.models.collaboration import (
    Team, TeamMember, TeamInvitation, TeamActivity,
    Notification, AuditLog
)
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError, AuthorizationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

teams_bp = Blueprint('teams', __name__)


def log_audit(user_id: int, team_id: int, action: str, resource_type: str,
              resource_id: str = None, old_values: dict = None, new_values: dict = None):
    """Log an audit event"""
    audit = AuditLog(
        user_id=user_id,
        team_id=team_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=request.remote_addr,
        user_agent=request.user_agent.string[:500] if request.user_agent else None,
        old_values=old_values,
        new_values=new_values
    )
    db.session.add(audit)


def log_activity(team_id: int, user_id: int, activity_type: str, title: str,
                 description: str = None, related_type: str = None, related_id: int = None):
    """Log a team activity"""
    activity = TeamActivity(
        team_id=team_id,
        user_id=user_id,
        activity_type=activity_type,
        title=title,
        description=description,
        related_type=related_type,
        related_id=related_id
    )
    db.session.add(activity)


def create_notification(user_id: int, type: str, title: str, message: str = None,
                       action_url: str = None, related_type: str = None, related_id: int = None):
    """Create a notification for a user"""
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        action_url=action_url,
        related_type=related_type,
        related_id=related_id
    )
    db.session.add(notification)


def slugify(text: str) -> str:
    """Convert text to URL-friendly slug"""
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[\s_-]+', '-', slug)
    return slug.strip('-')


def check_team_permission(team: Team, user_id: int, permission: str) -> bool:
    """Check if user has specific permission in team"""
    member = TeamMember.query.filter_by(team_id=team.id, user_id=user_id, is_active=True).first()
    if not member:
        return False

    if member.role in ['owner', 'admin']:
        return True

    permission_map = {
        'invite': member.can_invite,
        'manage_repos': member.can_manage_repos,
        'manage_rules': member.can_manage_rules,
        'view_analytics': member.can_view_analytics
    }

    return permission_map.get(permission, False)


@teams_bp.route('/teams', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def create_team() -> Tuple[Any, int]:
    """
    Create a new team workspace.

    Request Body:
        name (str): Team name
        description (str, optional): Team description
        is_private (bool, optional): Private team (default: true)

    Returns:
        Created team data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    name = RequestValidator.get_required_field(data, 'name', str)
    description = RequestValidator.get_optional_field(data, 'description', '', str)
    is_private = RequestValidator.get_optional_field(data, 'is_private', True, bool)

    # Validate name
    if len(name) < 3 or len(name) > 100:
        raise ValidationError("Team name must be between 3 and 100 characters", field='name')

    # Generate unique slug
    base_slug = slugify(name)
    slug = base_slug
    counter = 1
    while Team.query.filter_by(slug=slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create team
    team = Team(
        name=name,
        slug=slug,
        description=description,
        owner_id=user.id,
        is_private=is_private
    )
    db.session.add(team)
    db.session.flush()

    # Add owner as member
    member = TeamMember(
        team_id=team.id,
        user_id=user.id,
        role='owner',
        can_invite=True,
        can_manage_repos=True,
        can_manage_rules=True,
        can_view_analytics=True
    )
    db.session.add(member)

    # Log activity and audit
    log_activity(team.id, user.id, 'team_created', f'Created team "{name}"')
    log_audit(user.id, team.id, 'create', 'team', str(team.id), new_values={'name': name})

    db.session.commit()

    logger.info(f"User {user.id} created team {team.id}: {name}")

    return APIResponse.created(
        data=team.to_dict(include_members=True),
        message="Team created successfully"
    )


@teams_bp.route('/teams', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_teams() -> Tuple[Any, int]:
    """
    List teams the current user belongs to.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        role (str): Filter by role

    Returns:
        Paginated list of teams.
    """
    user = request.current_user

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param(
        'per_page',
        PaginationConfig.DEFAULT_PER_PAGE,
        min_val=1,
        max_val=PaginationConfig.MAX_PER_PAGE
    )
    role = request.args.get('role', '')

    # Query user's teams
    query = db.session.query(Team).join(TeamMember).filter(
        TeamMember.user_id == user.id,
        TeamMember.is_active == True
    )

    if role:
        query = query.filter(TeamMember.role == role)

    query = query.order_by(Team.name)

    # Paginate
    total = query.count()
    teams = query.offset((page - 1) * per_page).limit(per_page).all()

    return APIResponse.paginated(
        items=[t.to_dict() for t in teams],
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} teams"
    )


@teams_bp.route('/teams/<int:team_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_team(team_id: int) -> Tuple[Any, int]:
    """
    Get team details.

    Path Parameters:
        team_id: ID of the team

    Returns:
        Team data with members.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check membership
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    if not member and team.is_private:
        raise AuthorizationError("You don't have access to this team")

    return APIResponse.success(
        data=team.to_dict(include_members=True),
        message="Team retrieved successfully"
    )


@teams_bp.route('/teams/<int:team_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_team(team_id: int) -> Tuple[Any, int]:
    """
    Update team settings.

    Path Parameters:
        team_id: ID of the team

    Request Body:
        name (str, optional): New team name
        description (str, optional): New description
        is_private (bool, optional): Privacy setting
        allow_member_invites (bool, optional): Allow members to invite

    Returns:
        Updated team data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check admin permission
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    if not member or member.role not in ['owner', 'admin']:
        raise AuthorizationError("Only team owners and admins can update team settings")

    old_values = {'name': team.name, 'description': team.description}

    # Update fields
    if 'name' in data:
        name = data['name']
        if len(name) < 3 or len(name) > 100:
            raise ValidationError("Team name must be between 3 and 100 characters", field='name')
        team.name = name

    if 'description' in data:
        team.description = data['description']

    if 'is_private' in data:
        team.is_private = data['is_private']

    if 'allow_member_invites' in data:
        team.allow_member_invites = data['allow_member_invites']

    # Log
    log_audit(user.id, team.id, 'update', 'team', str(team.id),
              old_values=old_values, new_values={'name': team.name, 'description': team.description})

    db.session.commit()

    return APIResponse.success(
        data=team.to_dict(),
        message="Team updated successfully"
    )


@teams_bp.route('/teams/<int:team_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_team(team_id: int) -> Tuple[Any, int]:
    """
    Delete a team.

    Path Parameters:
        team_id: ID of the team

    Returns:
        Deletion confirmation.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Only owner can delete
    if team.owner_id != user.id:
        raise AuthorizationError("Only the team owner can delete the team")

    team_name = team.name

    # Log before deletion
    log_audit(user.id, team.id, 'delete', 'team', str(team.id),
              old_values={'name': team_name})

    db.session.delete(team)
    db.session.commit()

    logger.info(f"User {user.id} deleted team {team_id}: {team_name}")

    return APIResponse.success(message="Team deleted successfully")


@teams_bp.route('/teams/<int:team_id>/members', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_members(team_id: int) -> Tuple[Any, int]:
    """
    List team members.

    Path Parameters:
        team_id: ID of the team

    Returns:
        List of team members.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check membership
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    if not member:
        raise AuthorizationError("You are not a member of this team")

    members = TeamMember.query.filter_by(team_id=team_id, is_active=True).all()

    return APIResponse.success(
        data={
            'members': [m.to_dict() for m in members],
            'total': len(members)
        },
        message=f"Found {len(members)} members"
    )


@teams_bp.route('/teams/<int:team_id>/members', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def invite_member(team_id: int) -> Tuple[Any, int]:
    """
    Invite a new member to the team.

    Path Parameters:
        team_id: ID of the team

    Request Body:
        email (str): Email of person to invite
        role (str, optional): Role to assign (default: member)
        message (str, optional): Invitation message

    Returns:
        Invitation data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check permission
    if not check_team_permission(team, user.id, 'invite'):
        raise AuthorizationError("You don't have permission to invite members")

    email = RequestValidator.get_required_field(data, 'email', str)
    role = RequestValidator.get_optional_field(data, 'role', 'member', str)
    message = RequestValidator.get_optional_field(data, 'message', '', str)

    # Validate email
    email = RequestValidator.validate_email(email)

    # Check if already a member
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        existing_member = TeamMember.query.filter_by(
            team_id=team_id, user_id=existing_user.id
        ).first()
        if existing_member:
            raise ValidationError("This user is already a member of the team")

    # Check for existing invitation
    existing_invite = TeamInvitation.query.filter_by(
        team_id=team_id, email=email, status='pending'
    ).first()
    if existing_invite:
        raise ValidationError("An invitation has already been sent to this email")

    # Check team member limit
    current_members = TeamMember.query.filter_by(team_id=team_id, is_active=True).count()
    if current_members >= team.max_members:
        raise ValidationError(f"Team has reached maximum member limit ({team.max_members})")

    # Create invitation
    invitation = TeamInvitation(
        team_id=team_id,
        email=email,
        role=role,
        token=secrets.token_urlsafe(32),
        message=message,
        invited_by_id=user.id,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.session.add(invitation)

    # Log activity
    log_activity(team.id, user.id, 'member_invited',
                f'Invited {email} to join the team',
                related_type='invitation', related_id=invitation.id)

    # Create notification for invited user if they exist
    if existing_user:
        create_notification(
            existing_user.id,
            'team_invite',
            f'You have been invited to join {team.name}',
            message=f'{user.username} invited you to join their team',
            action_url=f'/teams/invitations/{invitation.token}'
        )

    db.session.commit()

    logger.info(f"User {user.id} invited {email} to team {team_id}")

    return APIResponse.created(
        data=invitation.to_dict(),
        message="Invitation sent successfully"
    )


@teams_bp.route('/teams/<int:team_id>/members/<int:member_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_member(team_id: int, member_id: int) -> Tuple[Any, int]:
    """
    Update a team member's role and permissions.

    Path Parameters:
        team_id: ID of the team
        member_id: ID of the member

    Request Body:
        role (str, optional): New role
        can_invite (bool, optional): Permission to invite
        can_manage_repos (bool, optional): Permission to manage repos
        can_manage_rules (bool, optional): Permission to manage rules

    Returns:
        Updated member data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check admin permission
    current_member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    if not current_member or current_member.role not in ['owner', 'admin']:
        raise AuthorizationError("Only team owners and admins can update members")

    member = TeamMember.query.get(member_id)
    if not member or member.team_id != team_id:
        raise NotFoundError("Team member", member_id)

    # Cannot modify owner
    if member.role == 'owner' and current_member.role != 'owner':
        raise AuthorizationError("Cannot modify the team owner")

    # Update fields
    if 'role' in data:
        new_role = data['role']
        if new_role == 'owner' and current_member.role != 'owner':
            raise AuthorizationError("Only the owner can transfer ownership")
        member.role = new_role

    if 'can_invite' in data:
        member.can_invite = data['can_invite']

    if 'can_manage_repos' in data:
        member.can_manage_repos = data['can_manage_repos']

    if 'can_manage_rules' in data:
        member.can_manage_rules = data['can_manage_rules']

    if 'can_view_analytics' in data:
        member.can_view_analytics = data['can_view_analytics']

    db.session.commit()

    return APIResponse.success(
        data=member.to_dict(),
        message="Member updated successfully"
    )


@teams_bp.route('/teams/<int:team_id>/members/<int:member_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def remove_member(team_id: int, member_id: int) -> Tuple[Any, int]:
    """
    Remove a member from the team.

    Path Parameters:
        team_id: ID of the team
        member_id: ID of the member

    Returns:
        Removal confirmation.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    member = TeamMember.query.get(member_id)
    if not member or member.team_id != team_id:
        raise NotFoundError("Team member", member_id)

    # Check permission (admin or self-removal)
    current_member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    is_self_removal = member.user_id == user.id
    is_admin = current_member and current_member.role in ['owner', 'admin']

    if not is_self_removal and not is_admin:
        raise AuthorizationError("You don't have permission to remove members")

    # Cannot remove owner
    if member.role == 'owner':
        raise AuthorizationError("Cannot remove the team owner")

    member.is_active = False

    # Log activity
    if is_self_removal:
        log_activity(team.id, user.id, 'member_left', f'{user.username} left the team')
    else:
        log_activity(team.id, user.id, 'member_removed',
                    f'Removed {member.user.username} from the team')

    db.session.commit()

    return APIResponse.success(message="Member removed successfully")


@teams_bp.route('/teams/invitations/<token>', methods=['GET'])
@cross_origin()
@handle_errors
def get_invitation(token: str) -> Tuple[Any, int]:
    """
    Get invitation details by token.

    Path Parameters:
        token: Invitation token

    Returns:
        Invitation data.
    """
    invitation = TeamInvitation.query.filter_by(token=token).first()
    if not invitation:
        raise NotFoundError("Invitation", "token")

    if invitation.status != 'pending':
        raise ValidationError(f"Invitation has already been {invitation.status}")

    if invitation.expires_at < datetime.utcnow():
        invitation.status = 'expired'
        db.session.commit()
        raise ValidationError("Invitation has expired")

    return APIResponse.success(
        data=invitation.to_dict(),
        message="Invitation retrieved successfully"
    )


@teams_bp.route('/teams/invitations/<token>/accept', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def accept_invitation(token: str) -> Tuple[Any, int]:
    """
    Accept a team invitation.

    Path Parameters:
        token: Invitation token

    Returns:
        Team membership data.
    """
    user = request.current_user

    invitation = TeamInvitation.query.filter_by(token=token).first()
    if not invitation:
        raise NotFoundError("Invitation", "token")

    if invitation.status != 'pending':
        raise ValidationError(f"Invitation has already been {invitation.status}")

    if invitation.expires_at < datetime.utcnow():
        invitation.status = 'expired'
        db.session.commit()
        raise ValidationError("Invitation has expired")

    # Verify email matches
    if invitation.email.lower() != user.email.lower():
        raise AuthorizationError("This invitation was sent to a different email address")

    # Create membership
    member = TeamMember(
        team_id=invitation.team_id,
        user_id=user.id,
        role=invitation.role,
        can_invite=invitation.role in ['admin'],
        can_manage_repos=invitation.role in ['admin'],
        can_manage_rules=invitation.role in ['admin'],
        can_view_analytics=True
    )
    db.session.add(member)

    # Update invitation
    invitation.status = 'accepted'
    invitation.responded_at = datetime.utcnow()

    # Log activity
    log_activity(invitation.team_id, user.id, 'member_joined',
                f'{user.username} joined the team')

    db.session.commit()

    return APIResponse.success(
        data=member.to_dict(),
        message="Invitation accepted successfully"
    )


@teams_bp.route('/teams/<int:team_id>/activity', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_activity(team_id: int) -> Tuple[Any, int]:
    """
    Get team activity feed.

    Path Parameters:
        team_id: ID of the team

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page

    Returns:
        Paginated activity feed.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check membership
    member = TeamMember.query.filter_by(
        team_id=team_id, user_id=user.id, is_active=True
    ).first()

    if not member:
        raise AuthorizationError("You are not a member of this team")

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param('per_page', 20, min_val=1, max_val=100)

    query = TeamActivity.query.filter_by(team_id=team_id).order_by(
        TeamActivity.created_at.desc()
    )

    total = query.count()
    activities = query.offset((page - 1) * per_page).limit(per_page).all()

    return APIResponse.paginated(
        items=[a.to_dict() for a in activities],
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} activities"
    )


@teams_bp.route('/teams/<int:team_id>/analytics', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_team_analytics(team_id: int) -> Tuple[Any, int]:
    """
    Get team analytics and metrics.

    Path Parameters:
        team_id: ID of the team

    Returns:
        Team analytics data.
    """
    user = request.current_user

    team = Team.query.get(team_id)
    if not team:
        raise NotFoundError("Team", team_id)

    # Check permission
    if not check_team_permission(team, user.id, 'view_analytics'):
        raise AuthorizationError("You don't have permission to view team analytics")

    # Calculate team analytics (simulated)
    member_count = TeamMember.query.filter_by(team_id=team_id, is_active=True).count()

    analytics = {
        'overview': {
            'member_count': member_count,
            'total_reviews': 150,
            'avg_score': 85.5,
            'issues_resolved': 420
        },
        'trends': {
            'reviews_this_week': 25,
            'reviews_last_week': 22,
            'score_change': 2.5
        },
        'top_contributors': [
            {'username': 'user1', 'reviews': 45, 'score': 92.5},
            {'username': 'user2', 'reviews': 38, 'score': 88.0},
            {'username': 'user3', 'reviews': 32, 'score': 85.5}
        ],
        'category_breakdown': {
            'security': 78.5,
            'performance': 82.0,
            'maintainability': 88.5,
            'best_practices': 90.0
        }
    }

    return APIResponse.success(
        data=analytics,
        message="Team analytics retrieved successfully"
    )
