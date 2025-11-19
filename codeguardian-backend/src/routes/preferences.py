"""
Developer Preferences Engine for CodeGuardian

Personalized settings that adapt to each developer's workflow and preferences.
"""

from datetime import datetime
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.database import db
from src.responses import APIResponse
from src.services import EventService


preferences_bp = Blueprint('preferences', __name__)


# Preference Models

class UserPreferences(db.Model):
    """User preferences and settings"""
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False, index=True)

    # Learning preferences
    skill_level = db.Column(db.String(20), default='intermediate')  # beginner, intermediate, advanced
    learning_style = db.Column(db.String(20), default='balanced')  # detailed, balanced, concise
    show_explanations = db.Column(db.Boolean, default=True)
    show_examples = db.Column(db.Boolean, default=True)

    # Review preferences
    review_strictness = db.Column(db.String(20), default='moderate')  # lenient, moderate, strict
    auto_fix_enabled = db.Column(db.Boolean, default=True)
    prioritize_security = db.Column(db.Boolean, default=True)
    prioritize_performance = db.Column(db.Boolean, default=False)

    # Notification preferences
    email_notifications = db.Column(db.Boolean, default=True)
    slack_notifications = db.Column(db.Boolean, default=False)
    notification_frequency = db.Column(db.String(20), default='immediate')  # immediate, daily, weekly
    quiet_hours_start = db.Column(db.Integer)  # Hour in 24h format
    quiet_hours_end = db.Column(db.Integer)

    # UI preferences
    theme = db.Column(db.String(20), default='system')  # light, dark, system
    compact_view = db.Column(db.Boolean, default=False)
    show_line_numbers = db.Column(db.Boolean, default=True)
    code_font_size = db.Column(db.Integer, default=14)
    sidebar_collapsed = db.Column(db.Boolean, default=False)

    # Language/framework expertise (JSON array)
    languages = db.Column(db.JSON, default=list)
    frameworks = db.Column(db.JSON, default=list)
    expertise_areas = db.Column(db.JSON, default=list)  # security, performance, testing, etc.

    # Custom rules (JSON object)
    custom_rules = db.Column(db.JSON, default=dict)
    ignored_rules = db.Column(db.JSON, default=list)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('preferences', uselist=False))

    def to_dict(self) -> dict:
        return {
            'learning': {
                'skill_level': self.skill_level,
                'learning_style': self.learning_style,
                'show_explanations': self.show_explanations,
                'show_examples': self.show_examples
            },
            'review': {
                'strictness': self.review_strictness,
                'auto_fix_enabled': self.auto_fix_enabled,
                'prioritize_security': self.prioritize_security,
                'prioritize_performance': self.prioritize_performance
            },
            'notifications': {
                'email': self.email_notifications,
                'slack': self.slack_notifications,
                'frequency': self.notification_frequency,
                'quiet_hours': {
                    'start': self.quiet_hours_start,
                    'end': self.quiet_hours_end
                } if self.quiet_hours_start is not None else None
            },
            'ui': {
                'theme': self.theme,
                'compact_view': self.compact_view,
                'show_line_numbers': self.show_line_numbers,
                'code_font_size': self.code_font_size,
                'sidebar_collapsed': self.sidebar_collapsed
            },
            'expertise': {
                'languages': self.languages or [],
                'frameworks': self.frameworks or [],
                'areas': self.expertise_areas or []
            },
            'rules': {
                'custom': self.custom_rules or {},
                'ignored': self.ignored_rules or []
            },
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class PreferenceHistory(db.Model):
    """Track preference changes for analytics"""
    __tablename__ = 'preference_history'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    field = db.Column(db.String(100), nullable=False)
    old_value = db.Column(db.String(500))
    new_value = db.Column(db.String(500))
    changed_at = db.Column(db.DateTime, default=datetime.utcnow)


# API Routes

@preferences_bp.route('/preferences', methods=['GET'])
@jwt_required()
def get_preferences():
    """Get user preferences"""
    user_id = get_jwt_identity()

    prefs = UserPreferences.query.filter_by(user_id=user_id).first()

    if not prefs:
        # Create default preferences
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)
        db.session.commit()

    return APIResponse.success(prefs.to_dict())


@preferences_bp.route('/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    """Update user preferences"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No data provided")

    prefs = UserPreferences.query.filter_by(user_id=user_id).first()

    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)

    # Track changes for history
    changes = []

    # Update learning preferences
    if 'learning' in data:
        learning = data['learning']
        for field in ['skill_level', 'learning_style', 'show_explanations', 'show_examples']:
            if field in learning:
                old_value = getattr(prefs, field)
                new_value = learning[field]
                if old_value != new_value:
                    setattr(prefs, field, new_value)
                    changes.append((field, str(old_value), str(new_value)))

    # Update review preferences
    if 'review' in data:
        review = data['review']
        field_map = {
            'strictness': 'review_strictness',
            'auto_fix_enabled': 'auto_fix_enabled',
            'prioritize_security': 'prioritize_security',
            'prioritize_performance': 'prioritize_performance'
        }
        for key, field in field_map.items():
            if key in review:
                old_value = getattr(prefs, field)
                new_value = review[key]
                if old_value != new_value:
                    setattr(prefs, field, new_value)
                    changes.append((field, str(old_value), str(new_value)))

    # Update notification preferences
    if 'notifications' in data:
        notif = data['notifications']
        field_map = {
            'email': 'email_notifications',
            'slack': 'slack_notifications',
            'frequency': 'notification_frequency'
        }
        for key, field in field_map.items():
            if key in notif:
                old_value = getattr(prefs, field)
                new_value = notif[key]
                if old_value != new_value:
                    setattr(prefs, field, new_value)
                    changes.append((field, str(old_value), str(new_value)))

        if 'quiet_hours' in notif and notif['quiet_hours']:
            if 'start' in notif['quiet_hours']:
                prefs.quiet_hours_start = notif['quiet_hours']['start']
            if 'end' in notif['quiet_hours']:
                prefs.quiet_hours_end = notif['quiet_hours']['end']

    # Update UI preferences
    if 'ui' in data:
        ui = data['ui']
        for field in ['theme', 'compact_view', 'show_line_numbers', 'code_font_size', 'sidebar_collapsed']:
            if field in ui:
                old_value = getattr(prefs, field)
                new_value = ui[field]
                if old_value != new_value:
                    setattr(prefs, field, new_value)
                    changes.append((field, str(old_value), str(new_value)))

    # Update expertise
    if 'expertise' in data:
        expertise = data['expertise']
        if 'languages' in expertise:
            prefs.languages = expertise['languages']
        if 'frameworks' in expertise:
            prefs.frameworks = expertise['frameworks']
        if 'areas' in expertise:
            prefs.expertise_areas = expertise['areas']

    # Update rules
    if 'rules' in data:
        rules = data['rules']
        if 'custom' in rules:
            prefs.custom_rules = rules['custom']
        if 'ignored' in rules:
            prefs.ignored_rules = rules['ignored']

    # Save preference history
    for field, old_value, new_value in changes:
        history = PreferenceHistory(
            user_id=user_id,
            field=field,
            old_value=old_value,
            new_value=new_value
        )
        db.session.add(history)

    db.session.commit()

    EventService.log(user_id, 'preferences_updated', {
        'changes': len(changes)
    })

    return APIResponse.success(prefs.to_dict())


@preferences_bp.route('/preferences/suggestions', methods=['GET'])
@jwt_required()
def get_preference_suggestions():
    """Get AI-suggested preferences based on user behavior"""
    user_id = get_jwt_identity()

    # Analyze user's review history to suggest preferences
    from src.routes.productivity import PersonalTrend

    # Get user's trends
    trends = PersonalTrend.query.filter_by(user_id=user_id).order_by(
        PersonalTrend.week_start.desc()
    ).limit(4).all()

    suggestions = []

    if trends:
        # Analyze patterns
        avg_issues = sum(t.issues_found for t in trends) / len(trends)
        avg_fixed = sum(t.issues_fixed for t in trends) / len(trends)
        fix_rate = avg_fixed / avg_issues if avg_issues > 0 else 0

        # Suggest strictness based on fix rate
        if fix_rate > 0.8:
            suggestions.append({
                'category': 'review',
                'field': 'strictness',
                'current': 'moderate',
                'suggested': 'strict',
                'reason': f'You fix {fix_rate*100:.0f}% of issues - stricter reviews could help you catch more'
            })
        elif fix_rate < 0.3:
            suggestions.append({
                'category': 'review',
                'field': 'strictness',
                'current': 'moderate',
                'suggested': 'lenient',
                'reason': 'Consider lenient mode to focus on critical issues first'
            })

        # Analyze issue categories
        security_issues = sum(t.categories_breakdown.get('security', 0) for t in trends if t.categories_breakdown)
        if security_issues > avg_issues * 0.3:
            suggestions.append({
                'category': 'review',
                'field': 'prioritize_security',
                'current': False,
                'suggested': True,
                'reason': f'Security issues make up {security_issues/avg_issues*100:.0f}% of your issues'
            })

    # Language suggestions based on repositories
    from src.models import Repository
    repos = Repository.query.filter_by(owner_id=user_id).all()

    if repos:
        languages = set()
        for repo in repos:
            if repo.language:
                languages.add(repo.language)

        if languages:
            suggestions.append({
                'category': 'expertise',
                'field': 'languages',
                'current': [],
                'suggested': list(languages),
                'reason': f'Detected languages in your repositories: {", ".join(languages)}'
            })

    # Default suggestions for new users
    if not suggestions:
        suggestions = [
            {
                'category': 'learning',
                'field': 'show_explanations',
                'current': True,
                'suggested': True,
                'reason': 'Explanations help you learn and improve over time'
            },
            {
                'category': 'notifications',
                'field': 'frequency',
                'current': 'immediate',
                'suggested': 'daily',
                'reason': 'Daily digests reduce interruptions while keeping you informed'
            }
        ]

    return APIResponse.success({
        'suggestions': suggestions,
        'based_on': {
            'reviews_analyzed': len(trends),
            'repositories': len(repos) if 'repos' in dir() else 0
        }
    })


@preferences_bp.route('/preferences/import', methods=['POST'])
@jwt_required()
def import_preferences():
    """Import preferences from another platform or export"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No import data provided")

    source = data.get('source', 'custom')
    settings = data.get('settings', {})

    prefs = UserPreferences.query.filter_by(user_id=user_id).first()

    if not prefs:
        prefs = UserPreferences(user_id=user_id)
        db.session.add(prefs)

    imported_count = 0

    # Import from different sources
    if source == 'vscode':
        # Map VSCode settings
        if 'editor.fontSize' in settings:
            prefs.code_font_size = settings['editor.fontSize']
            imported_count += 1
        if 'workbench.colorTheme' in settings:
            theme = settings['workbench.colorTheme'].lower()
            prefs.theme = 'dark' if 'dark' in theme else 'light'
            imported_count += 1

    elif source == 'eslint':
        # Import ESLint rules as custom rules
        if 'rules' in settings:
            prefs.custom_rules = settings['rules']
            imported_count += len(settings['rules'])

    elif source == 'custom':
        # Direct import of preferences
        if 'learning' in settings:
            for key, value in settings['learning'].items():
                if hasattr(prefs, key):
                    setattr(prefs, key, value)
                    imported_count += 1

        if 'review' in settings:
            field_map = {'strictness': 'review_strictness'}
            for key, value in settings['review'].items():
                field = field_map.get(key, key)
                if hasattr(prefs, field):
                    setattr(prefs, field, value)
                    imported_count += 1

        if 'ui' in settings:
            for key, value in settings['ui'].items():
                if hasattr(prefs, key):
                    setattr(prefs, key, value)
                    imported_count += 1

    db.session.commit()

    EventService.log(user_id, 'preferences_imported', {
        'source': source,
        'imported_count': imported_count
    })

    return APIResponse.success({
        'imported': imported_count,
        'source': source,
        'preferences': prefs.to_dict()
    })


@preferences_bp.route('/preferences/export', methods=['GET'])
@jwt_required()
def export_preferences():
    """Export user preferences"""
    user_id = get_jwt_identity()

    prefs = UserPreferences.query.filter_by(user_id=user_id).first()

    if not prefs:
        return APIResponse.not_found('Preferences', user_id)

    # Create exportable format
    export_data = {
        'version': '1.0',
        'exported_at': datetime.utcnow().isoformat(),
        'preferences': prefs.to_dict()
    }

    return APIResponse.success(export_data)


@preferences_bp.route('/preferences/reset', methods=['POST'])
@jwt_required()
def reset_preferences():
    """Reset preferences to defaults"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    category = data.get('category')  # Optional: reset only specific category

    prefs = UserPreferences.query.filter_by(user_id=user_id).first()

    if not prefs:
        return APIResponse.not_found('Preferences', user_id)

    if category == 'learning' or not category:
        prefs.skill_level = 'intermediate'
        prefs.learning_style = 'balanced'
        prefs.show_explanations = True
        prefs.show_examples = True

    if category == 'review' or not category:
        prefs.review_strictness = 'moderate'
        prefs.auto_fix_enabled = True
        prefs.prioritize_security = True
        prefs.prioritize_performance = False

    if category == 'notifications' or not category:
        prefs.email_notifications = True
        prefs.slack_notifications = False
        prefs.notification_frequency = 'immediate'
        prefs.quiet_hours_start = None
        prefs.quiet_hours_end = None

    if category == 'ui' or not category:
        prefs.theme = 'system'
        prefs.compact_view = False
        prefs.show_line_numbers = True
        prefs.code_font_size = 14
        prefs.sidebar_collapsed = False

    db.session.commit()

    EventService.log(user_id, 'preferences_reset', {
        'category': category or 'all'
    })

    return APIResponse.success({
        'reset': category or 'all',
        'preferences': prefs.to_dict()
    })


@preferences_bp.route('/preferences/history', methods=['GET'])
@jwt_required()
def get_preference_history():
    """Get preference change history"""
    user_id = get_jwt_identity()

    limit = min(int(request.args.get('limit', 50)), 100)

    history = PreferenceHistory.query.filter_by(user_id=user_id).order_by(
        PreferenceHistory.changed_at.desc()
    ).limit(limit).all()

    return APIResponse.success([
        {
            'field': h.field,
            'old_value': h.old_value,
            'new_value': h.new_value,
            'changed_at': h.changed_at.isoformat()
        }
        for h in history
    ])
