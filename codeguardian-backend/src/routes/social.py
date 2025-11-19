"""
Social and Collaboration features for CodeGuardian

Review reactions, kudos, discussions, and pair review mode.
"""

from datetime import datetime, timedelta
from typing import Dict, List
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, func

from src.database import db
from src.models.user import User
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService


social_bp = Blueprint('social', __name__)


# Social Models

class ReviewReaction(db.Model):
    """Reactions to code fixes and reviews"""
    __tablename__ = 'review_reactions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)

    # Reaction type
    reaction_type = db.Column(db.String(50), nullable=False)  # helpful, clever, overkill, insightful

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='reactions')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'review_id', 'reaction_type', name='unique_user_review_reaction'),
    )

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'review_id': self.review_id,
            'reaction_type': self.reaction_type,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Kudos(db.Model):
    """Kudos for clean code and good practices"""
    __tablename__ = 'kudos'

    id = db.Column(db.Integer, primary_key=True)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Kudos details
    kudos_type = db.Column(db.String(50), nullable=False)  # clean_code, great_fix, helpful_review
    message = db.Column(db.String(500))
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'))

    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    from_user = db.relationship('User', foreign_keys=[from_user_id], backref='kudos_given')
    to_user = db.relationship('User', foreign_keys=[to_user_id], backref='kudos_received')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'from_user': self.from_user.username if self.from_user else None,
            'to_user': self.to_user.username if self.to_user else None,
            'kudos_type': self.kudos_type,
            'message': self.message,
            'review_id': self.review_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CodeComment(db.Model):
    """Inline code comments and discussions"""
    __tablename__ = 'code_comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)

    # Comment location
    file_path = db.Column(db.String(500))
    line_start = db.Column(db.Integer)
    line_end = db.Column(db.Integer)

    # Content
    content = db.Column(db.Text, nullable=False)
    code_snippet = db.Column(db.Text)

    # Thread
    parent_id = db.Column(db.Integer, db.ForeignKey('code_comments.id'))
    is_resolved = db.Column(db.Boolean, default=False)

    # Mentions
    mentions = db.Column(db.JSON, default=list)  # User IDs mentioned

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='code_comments')
    replies = db.relationship('CodeComment', backref=db.backref('parent', remote_side=[id]))

    def to_dict(self, include_replies: bool = False) -> dict:
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username if self.user else None,
            'review_id': self.review_id,
            'file_path': self.file_path,
            'line_start': self.line_start,
            'line_end': self.line_end,
            'content': self.content,
            'parent_id': self.parent_id,
            'is_resolved': self.is_resolved,
            'mentions': self.mentions or [],
            'reply_count': len(self.replies),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_replies:
            data['replies'] = [r.to_dict() for r in self.replies]
        return data


class PairReviewSession(db.Model):
    """Pair review sessions for real-time collaboration"""
    __tablename__ = 'pair_review_sessions'

    id = db.Column(db.Integer, primary_key=True)
    host_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)

    # Session details
    session_code = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200))

    # Participants
    participants = db.Column(db.JSON, default=list)  # [{user_id, joined_at, role}]
    max_participants = db.Column(db.Integer, default=5)

    # Status
    status = db.Column(db.String(20), default='active')  # active, paused, ended
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)

    # Session data
    annotations = db.Column(db.JSON, default=list)
    chat_history = db.Column(db.JSON, default=list)

    # Recording
    is_recorded = db.Column(db.Boolean, default=False)

    # Relationships
    host = db.relationship('User', backref='hosted_sessions')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'host': self.host.username if self.host else None,
            'review_id': self.review_id,
            'session_code': self.session_code,
            'title': self.title,
            'participants': self.participants or [],
            'participant_count': len(self.participants or []),
            'max_participants': self.max_participants,
            'status': self.status,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None
        }


# API Routes - Reactions

@social_bp.route('/reactions/<int:review_id>', methods=['POST'])
@jwt_required()
def add_reaction(review_id: int):
    """Add reaction to a review"""
    user_id = get_jwt_identity()
    data = request.get_json()

    reaction_type = data.get('reaction_type')
    if reaction_type not in ['helpful', 'clever', 'overkill', 'insightful']:
        return APIResponse.validation_error("Invalid reaction type")

    # Check review exists
    review = Review.query.get(review_id)
    if not review:
        return APIResponse.not_found('Review', review_id)

    # Check for existing reaction
    existing = ReviewReaction.query.filter_by(
        user_id=user_id,
        review_id=review_id,
        reaction_type=reaction_type
    ).first()

    if existing:
        return APIResponse.conflict("Already reacted with this type")

    reaction = ReviewReaction(
        user_id=user_id,
        review_id=review_id,
        reaction_type=reaction_type
    )

    db.session.add(reaction)
    db.session.commit()

    return APIResponse.created(reaction.to_dict())


@social_bp.route('/reactions/<int:review_id>', methods=['GET'])
@jwt_required()
def get_reactions(review_id: int):
    """Get reactions for a review"""
    reactions = ReviewReaction.query.filter_by(review_id=review_id).all()

    # Group by type
    grouped = {}
    for r in reactions:
        if r.reaction_type not in grouped:
            grouped[r.reaction_type] = []
        grouped[r.reaction_type].append(r.user.username if r.user else 'Unknown')

    return APIResponse.success({
        'reactions': grouped,
        'total': len(reactions)
    })


@social_bp.route('/reactions/<int:reaction_id>', methods=['DELETE'])
@jwt_required()
def remove_reaction(reaction_id: int):
    """Remove a reaction"""
    user_id = get_jwt_identity()

    reaction = ReviewReaction.query.filter_by(
        id=reaction_id,
        user_id=user_id
    ).first()

    if not reaction:
        return APIResponse.not_found('Reaction', reaction_id)

    db.session.delete(reaction)
    db.session.commit()

    return APIResponse.no_content()


# API Routes - Kudos

@social_bp.route('/kudos', methods=['POST'])
@jwt_required()
def give_kudos():
    """Give kudos to another user"""
    user_id = get_jwt_identity()
    data = request.get_json()

    to_user_id = data.get('to_user_id')
    kudos_type = data.get('kudos_type')

    if not to_user_id or not kudos_type:
        return APIResponse.validation_error("to_user_id and kudos_type are required")

    if to_user_id == user_id:
        return APIResponse.validation_error("Cannot give kudos to yourself")

    kudos = Kudos(
        from_user_id=user_id,
        to_user_id=to_user_id,
        kudos_type=kudos_type,
        message=data.get('message'),
        review_id=data.get('review_id')
    )

    db.session.add(kudos)
    db.session.commit()

    # Notify recipient
    EventService.create_notification(
        user_id=to_user_id,
        notification_type='kudos_received',
        title='You received kudos!',
        message=f'Someone appreciated your {kudos_type.replace("_", " ")}'
    )

    return APIResponse.created(kudos.to_dict())


@social_bp.route('/kudos/received', methods=['GET'])
@jwt_required()
def get_received_kudos():
    """Get kudos received by user"""
    user_id = get_jwt_identity()

    kudos = Kudos.query.filter_by(to_user_id=user_id).order_by(
        desc(Kudos.created_at)
    ).limit(50).all()

    return APIResponse.success([k.to_dict() for k in kudos])


@social_bp.route('/kudos/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard():
    """Get kudos leaderboard"""
    period = request.args.get('period', 'week')

    if period == 'week':
        start_date = datetime.utcnow() - timedelta(days=7)
    elif period == 'month':
        start_date = datetime.utcnow() - timedelta(days=30)
    else:
        start_date = datetime.utcnow() - timedelta(days=365)

    # Get top users by kudos received
    leaderboard = db.session.query(
        User.id,
        User.username,
        func.count(Kudos.id).label('kudos_count')
    ).join(Kudos, Kudos.to_user_id == User.id).filter(
        Kudos.created_at >= start_date
    ).group_by(User.id).order_by(desc('kudos_count')).limit(10).all()

    return APIResponse.success({
        'leaderboard': [
            {'user_id': l[0], 'username': l[1], 'kudos_count': l[2]}
            for l in leaderboard
        ],
        'period': period
    })


# API Routes - Comments/Discussions

@social_bp.route('/comments/<int:review_id>', methods=['POST'])
@jwt_required()
def add_comment(review_id: int):
    """Add comment to a review"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data.get('content'):
        return APIResponse.validation_error("content is required")

    comment = CodeComment(
        user_id=user_id,
        review_id=review_id,
        file_path=data.get('file_path'),
        line_start=data.get('line_start'),
        line_end=data.get('line_end'),
        content=data['content'],
        code_snippet=data.get('code_snippet'),
        parent_id=data.get('parent_id'),
        mentions=data.get('mentions', [])
    )

    db.session.add(comment)
    db.session.commit()

    # Notify mentioned users
    for mentioned_id in (comment.mentions or []):
        EventService.create_notification(
            user_id=mentioned_id,
            notification_type='mention',
            title='You were mentioned',
            message=f'Someone mentioned you in a code review'
        )

    return APIResponse.created(comment.to_dict())


@social_bp.route('/comments/<int:review_id>', methods=['GET'])
@jwt_required()
def get_comments(review_id: int):
    """Get comments for a review"""
    comments = CodeComment.query.filter_by(
        review_id=review_id,
        parent_id=None
    ).order_by(CodeComment.created_at).all()

    return APIResponse.success([c.to_dict(include_replies=True) for c in comments])


@social_bp.route('/comments/<int:comment_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_comment(comment_id: int):
    """Mark comment as resolved"""
    user_id = get_jwt_identity()

    comment = CodeComment.query.get(comment_id)
    if not comment:
        return APIResponse.not_found('Comment', comment_id)

    comment.is_resolved = True
    db.session.commit()

    return APIResponse.success({'message': 'Comment resolved'})


@social_bp.route('/comments/search', methods=['GET'])
@jwt_required()
def search_comments():
    """Search through comments"""
    user_id = get_jwt_identity()
    query_text = request.args.get('q', '')

    if len(query_text) < 3:
        return APIResponse.validation_error("Search query must be at least 3 characters")

    comments = CodeComment.query.filter(
        CodeComment.content.ilike(f'%{query_text}%')
    ).limit(50).all()

    return APIResponse.success([c.to_dict() for c in comments])


# API Routes - Pair Review

@social_bp.route('/pair-review', methods=['POST'])
@jwt_required()
def create_pair_session():
    """Create a pair review session"""
    user_id = get_jwt_identity()
    data = request.get_json()

    review_id = data.get('review_id')
    if not review_id:
        return APIResponse.validation_error("review_id is required")

    # Generate session code
    import secrets
    session_code = secrets.token_urlsafe(6).upper()

    session = PairReviewSession(
        host_user_id=user_id,
        review_id=review_id,
        session_code=session_code,
        title=data.get('title', 'Pair Review Session'),
        max_participants=data.get('max_participants', 5),
        is_recorded=data.get('is_recorded', False)
    )

    db.session.add(session)
    db.session.commit()

    return APIResponse.created({
        'session': session.to_dict(),
        'join_url': f'/pair-review/join/{session_code}'
    })


@social_bp.route('/pair-review/join/<session_code>', methods=['POST'])
@jwt_required()
def join_pair_session(session_code: str):
    """Join a pair review session"""
    user_id = get_jwt_identity()

    session = PairReviewSession.query.filter_by(
        session_code=session_code,
        status='active'
    ).first()

    if not session:
        return APIResponse.not_found('Session')

    # Check capacity
    participants = session.participants or []
    if len(participants) >= session.max_participants:
        return APIResponse.conflict("Session is full")

    # Check if already joined
    if any(p['user_id'] == user_id for p in participants):
        return APIResponse.success(session.to_dict())

    # Add participant
    user = User.query.get(user_id)
    participants.append({
        'user_id': user_id,
        'username': user.username if user else 'Unknown',
        'joined_at': datetime.utcnow().isoformat(),
        'role': 'reviewer'
    })
    session.participants = participants

    db.session.commit()

    return APIResponse.success(session.to_dict())


@social_bp.route('/pair-review/<int:session_id>/end', methods=['POST'])
@jwt_required()
def end_pair_session(session_id: int):
    """End a pair review session"""
    user_id = get_jwt_identity()

    session = PairReviewSession.query.filter_by(
        id=session_id,
        host_user_id=user_id
    ).first()

    if not session:
        return APIResponse.not_found('Session', session_id)

    session.status = 'ended'
    session.ended_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success({'message': 'Session ended'})


@social_bp.route('/pair-review/<int:session_id>/annotate', methods=['POST'])
@jwt_required()
def add_annotation(session_id: int):
    """Add annotation to pair session"""
    user_id = get_jwt_identity()
    data = request.get_json()

    session = PairReviewSession.query.get(session_id)
    if not session or session.status != 'active':
        return APIResponse.not_found('Active session', session_id)

    annotations = session.annotations or []
    annotations.append({
        'user_id': user_id,
        'line': data.get('line'),
        'content': data.get('content'),
        'color': data.get('color', '#FFE066'),
        'timestamp': datetime.utcnow().isoformat()
    })
    session.annotations = annotations

    db.session.commit()

    return APIResponse.success({'annotations': annotations})


@social_bp.route('/pair-review/active', methods=['GET'])
@jwt_required()
def get_active_sessions():
    """Get user's active pair review sessions"""
    user_id = get_jwt_identity()

    # Sessions where user is host or participant
    sessions = PairReviewSession.query.filter(
        db.or_(
            PairReviewSession.host_user_id == user_id,
            PairReviewSession.participants.contains([{'user_id': user_id}])
        ),
        PairReviewSession.status == 'active'
    ).all()

    return APIResponse.success([s.to_dict() for s in sessions])


# API Routes - Weekly Digest

@social_bp.route('/digest/weekly', methods=['GET'])
@jwt_required()
def get_weekly_digest():
    """Get weekly digest of best practices and team activity"""
    user_id = get_jwt_identity()

    week_start = datetime.utcnow() - timedelta(days=7)

    # Get user's reviews
    reviews = Review.query.filter(
        Review.user_id == user_id,
        Review.created_at >= week_start
    ).all()

    # Get kudos
    kudos_received = Kudos.query.filter(
        Kudos.to_user_id == user_id,
        Kudos.created_at >= week_start
    ).count()

    kudos_given = Kudos.query.filter(
        Kudos.from_user_id == user_id,
        Kudos.created_at >= week_start
    ).count()

    return APIResponse.success({
        'period': 'This Week',
        'activity': {
            'reviews_completed': len(reviews),
            'kudos_received': kudos_received,
            'kudos_given': kudos_given
        },
        'highlights': [
            'Great progress on code quality!',
            'Consider reviewing more security issues'
        ],
        'milestones': _check_milestones(user_id)
    })


def _check_milestones(user_id: int) -> List[Dict]:
    """Check for user milestones"""
    milestones = []

    review_count = Review.query.filter_by(user_id=user_id).count()
    if review_count >= 100:
        milestones.append({'title': 'Century Club', 'description': '100 reviews completed!'})
    elif review_count >= 50:
        milestones.append({'title': 'Prolific Reviewer', 'description': '50 reviews completed!'})

    kudos_count = Kudos.query.filter_by(to_user_id=user_id).count()
    if kudos_count >= 50:
        milestones.append({'title': 'Community Star', 'description': '50 kudos received!'})

    return milestones
