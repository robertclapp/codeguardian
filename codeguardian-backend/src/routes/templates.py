"""
Code Review Templates for CodeGuardian

Pre-built and custom review checklists for consistent, thorough reviews.
"""

from datetime import datetime
from typing import Dict, List
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc, func

from src.database import db
from src.responses import APIResponse
from src.services import EventService


templates_bp = Blueprint('templates', __name__)


# Template Models

class ReviewTemplate(db.Model):
    """Review template with checklist items"""
    __tablename__ = 'review_templates'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # Null for system templates

    # Template info
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default='general')  # security, performance, style
    language = db.Column(db.String(50))  # Optional language filter

    # Checklist items (JSON array)
    checklist = db.Column(db.JSON, default=list)

    # Auto-fill comments
    common_comments = db.Column(db.JSON, default=list)

    # Template settings
    is_public = db.Column(db.Boolean, default=False)
    is_system = db.Column(db.Boolean, default=False)

    # Usage stats
    use_count = db.Column(db.Integer, default=0)
    rating = db.Column(db.Float, default=0)
    rating_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='review_templates')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'language': self.language,
            'checklist': self.checklist or [],
            'common_comments': self.common_comments or [],
            'is_public': self.is_public,
            'is_system': self.is_system,
            'author': self.user.username if self.user else 'System',
            'stats': {
                'use_count': self.use_count,
                'rating': round(self.rating, 1),
                'rating_count': self.rating_count
            },
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class TemplateUsage(db.Model):
    """Track template usage"""
    __tablename__ = 'template_usages'

    id = db.Column(db.Integer, primary_key=True)
    template_id = db.Column(db.Integer, db.ForeignKey('review_templates.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'))

    # Checklist completion
    items_completed = db.Column(db.Integer, default=0)
    items_total = db.Column(db.Integer, default=0)

    # User rating
    rating = db.Column(db.Integer)  # 1-5

    # Timestamp
    used_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'template_id': self.template_id,
            'review_id': self.review_id,
            'completion_rate': round(self.items_completed / self.items_total * 100, 1) if self.items_total else 0,
            'rating': self.rating,
            'used_at': self.used_at.isoformat() if self.used_at else None
        }


# API Routes

@templates_bp.route('/templates', methods=['POST'])
@jwt_required()
def create_template():
    """Create a new review template"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get('name'):
        return APIResponse.validation_error("name is required")

    template = ReviewTemplate(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', ''),
        category=data.get('category', 'general'),
        language=data.get('language'),
        checklist=data.get('checklist', []),
        common_comments=data.get('common_comments', []),
        is_public=data.get('is_public', False)
    )

    db.session.add(template)
    db.session.commit()

    return APIResponse.created(template.to_dict())


@templates_bp.route('/templates', methods=['GET'])
@jwt_required()
def get_templates():
    """Get available templates"""
    user_id = get_jwt_identity()

    category = request.args.get('category')
    language = request.args.get('language')
    include_public = request.args.get('public', 'true').lower() == 'true'

    # Build query
    query = ReviewTemplate.query.filter(
        db.or_(
            ReviewTemplate.user_id == user_id,
            ReviewTemplate.is_system == True,
            db.and_(ReviewTemplate.is_public == True, include_public)
        )
    )

    if category:
        query = query.filter_by(category=category)
    if language:
        query = query.filter(db.or_(
            ReviewTemplate.language == language,
            ReviewTemplate.language.is_(None)
        ))

    templates = query.order_by(
        desc(ReviewTemplate.is_system),
        desc(ReviewTemplate.use_count)
    ).all()

    return APIResponse.success([t.to_dict() for t in templates])


@templates_bp.route('/templates/<int:template_id>', methods=['GET'])
@jwt_required()
def get_template(template_id: int):
    """Get template details"""
    user_id = get_jwt_identity()

    template = ReviewTemplate.query.get(template_id)
    if not template:
        return APIResponse.not_found('Template', template_id)

    # Check access
    if not template.is_public and not template.is_system and template.user_id != user_id:
        return APIResponse.forbidden("Access denied")

    return APIResponse.success(template.to_dict())


@templates_bp.route('/templates/<int:template_id>', methods=['PUT'])
@jwt_required()
def update_template(template_id: int):
    """Update a template"""
    user_id = get_jwt_identity()
    data = request.get_json()

    template = ReviewTemplate.query.filter_by(
        id=template_id,
        user_id=user_id
    ).first()

    if not template:
        return APIResponse.not_found('Template', template_id)

    # Update fields
    for field in ['name', 'description', 'category', 'language', 'checklist',
                  'common_comments', 'is_public']:
        if field in data:
            setattr(template, field, data[field])

    db.session.commit()

    return APIResponse.success(template.to_dict())


@templates_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id: int):
    """Delete a template"""
    user_id = get_jwt_identity()

    template = ReviewTemplate.query.filter_by(
        id=template_id,
        user_id=user_id
    ).first()

    if not template:
        return APIResponse.not_found('Template', template_id)

    db.session.delete(template)
    db.session.commit()

    return APIResponse.no_content()


@templates_bp.route('/templates/<int:template_id>/use', methods=['POST'])
@jwt_required()
def use_template(template_id: int):
    """Record template usage"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    template = ReviewTemplate.query.get(template_id)
    if not template:
        return APIResponse.not_found('Template', template_id)

    # Record usage
    usage = TemplateUsage(
        template_id=template_id,
        user_id=user_id,
        review_id=data.get('review_id'),
        items_completed=data.get('items_completed', 0),
        items_total=len(template.checklist or [])
    )

    # Update template stats
    template.use_count += 1

    db.session.add(usage)
    db.session.commit()

    return APIResponse.success({
        'checklist': template.checklist,
        'common_comments': template.common_comments,
        'usage_id': usage.id
    })


@templates_bp.route('/templates/<int:template_id>/rate', methods=['POST'])
@jwt_required()
def rate_template(template_id: int):
    """Rate a template"""
    user_id = get_jwt_identity()
    data = request.get_json()

    rating = data.get('rating')
    if not rating or rating < 1 or rating > 5:
        return APIResponse.validation_error("Rating must be between 1 and 5")

    template = ReviewTemplate.query.get(template_id)
    if not template:
        return APIResponse.not_found('Template', template_id)

    # Update rating (simple average)
    total_rating = template.rating * template.rating_count + rating
    template.rating_count += 1
    template.rating = total_rating / template.rating_count

    db.session.commit()

    return APIResponse.success({
        'rating': round(template.rating, 1),
        'rating_count': template.rating_count
    })


@templates_bp.route('/templates/<int:template_id>/clone', methods=['POST'])
@jwt_required()
def clone_template(template_id: int):
    """Clone a template to user's collection"""
    user_id = get_jwt_identity()

    template = ReviewTemplate.query.get(template_id)
    if not template:
        return APIResponse.not_found('Template', template_id)

    # Create clone
    clone = ReviewTemplate(
        user_id=user_id,
        name=f"{template.name} (Copy)",
        description=template.description,
        category=template.category,
        language=template.language,
        checklist=template.checklist.copy() if template.checklist else [],
        common_comments=template.common_comments.copy() if template.common_comments else [],
        is_public=False
    )

    db.session.add(clone)
    db.session.commit()

    return APIResponse.created(clone.to_dict())


@templates_bp.route('/templates/system', methods=['GET'])
def get_system_templates():
    """Get system templates (public endpoint)"""
    templates = ReviewTemplate.query.filter_by(is_system=True).all()

    # Create defaults if none exist
    if not templates:
        templates = _create_default_templates()

    return APIResponse.success([t.to_dict() for t in templates])


@templates_bp.route('/templates/popular', methods=['GET'])
@jwt_required()
def get_popular_templates():
    """Get most popular templates"""
    limit = min(int(request.args.get('limit', 10)), 50)

    templates = ReviewTemplate.query.filter(
        db.or_(ReviewTemplate.is_public == True, ReviewTemplate.is_system == True)
    ).order_by(desc(ReviewTemplate.use_count)).limit(limit).all()

    return APIResponse.success([t.to_dict() for t in templates])


# Helper Functions

def _create_default_templates() -> List[ReviewTemplate]:
    """Create default system templates"""
    defaults = [
        {
            'name': 'Security Review',
            'description': 'Comprehensive security checklist',
            'category': 'security',
            'checklist': [
                {'id': 1, 'item': 'Check for SQL injection vulnerabilities', 'required': True},
                {'id': 2, 'item': 'Verify input validation', 'required': True},
                {'id': 3, 'item': 'Check authentication/authorization', 'required': True},
                {'id': 4, 'item': 'Look for hardcoded secrets', 'required': True},
                {'id': 5, 'item': 'Verify HTTPS usage', 'required': False},
                {'id': 6, 'item': 'Check for XSS vulnerabilities', 'required': True}
            ],
            'common_comments': [
                'Consider using parameterized queries',
                'Add input validation here',
                'This should be behind authentication'
            ]
        },
        {
            'name': 'Performance Review',
            'description': 'Performance optimization checklist',
            'category': 'performance',
            'checklist': [
                {'id': 1, 'item': 'Check for N+1 queries', 'required': True},
                {'id': 2, 'item': 'Verify indexes are used', 'required': True},
                {'id': 3, 'item': 'Look for unnecessary loops', 'required': False},
                {'id': 4, 'item': 'Check caching opportunities', 'required': False},
                {'id': 5, 'item': 'Verify lazy loading', 'required': False}
            ],
            'common_comments': [
                'This query could be optimized',
                'Consider adding caching here',
                'Use bulk operations instead'
            ]
        },
        {
            'name': 'Code Style Review',
            'description': 'Code style and readability',
            'category': 'style',
            'checklist': [
                {'id': 1, 'item': 'Check naming conventions', 'required': True},
                {'id': 2, 'item': 'Verify documentation/comments', 'required': True},
                {'id': 3, 'item': 'Check function length', 'required': False},
                {'id': 4, 'item': 'Look for code duplication', 'required': True},
                {'id': 5, 'item': 'Verify consistent formatting', 'required': False}
            ],
            'common_comments': [
                'Consider renaming for clarity',
                'Add documentation here',
                'This could be refactored'
            ]
        }
    ]

    templates = []
    for data in defaults:
        template = ReviewTemplate(
            name=data['name'],
            description=data['description'],
            category=data['category'],
            checklist=data['checklist'],
            common_comments=data['common_comments'],
            is_system=True,
            is_public=True
        )
        db.session.add(template)
        templates.append(template)

    db.session.commit()
    return templates
