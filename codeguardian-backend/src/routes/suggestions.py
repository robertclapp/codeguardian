"""
Smart Suggestions and Review Cards for CodeGuardian

Real-time code suggestions and shareable review summary cards.
"""

from datetime import datetime
from typing import Dict, List
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import hashlib

from src.database import db
from src.models.review import Review
from src.models.repository import Repository
from src.responses import APIResponse
from src.services import CacheService


suggestions_bp = Blueprint('suggestions', __name__)


# Models

class ReviewCard(db.Model):
    """Shareable review summary cards"""
    __tablename__ = 'review_cards'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)

    # Card details
    share_code = db.Column(db.String(20), unique=True, nullable=False)
    title = db.Column(db.String(200))
    theme = db.Column(db.String(50), default='default')  # default, dark, colorful

    # Card data
    summary_data = db.Column(db.JSON, nullable=False)

    # Visibility
    is_public = db.Column(db.Boolean, default=True)
    expires_at = db.Column(db.DateTime)

    # Stats
    view_count = db.Column(db.Integer, default=0)
    share_count = db.Column(db.Integer, default=0)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='review_cards')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'share_code': self.share_code,
            'title': self.title,
            'theme': self.theme,
            'summary': self.summary_data,
            'is_public': self.is_public,
            'view_count': self.view_count,
            'share_count': self.share_count,
            'share_url': f'/card/{self.share_code}',
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class CodeSuggestion(db.Model):
    """Code improvement suggestions"""
    __tablename__ = 'code_suggestions'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Suggestion details
    suggestion_type = db.Column(db.String(50), nullable=False)  # completion, improvement, refactor
    context = db.Column(db.Text)  # Code context
    suggestion = db.Column(db.Text, nullable=False)
    explanation = db.Column(db.Text)

    # Metadata
    language = db.Column(db.String(50))
    confidence = db.Column(db.Float, default=0.8)

    # User feedback
    was_accepted = db.Column(db.Boolean)
    feedback = db.Column(db.String(200))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'suggestion_type': self.suggestion_type,
            'suggestion': self.suggestion,
            'explanation': self.explanation,
            'language': self.language,
            'confidence': round(self.confidence * 100, 1),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# API Routes - Smart Suggestions

@suggestions_bp.route('/suggestions/complete', methods=['POST'])
@jwt_required()
def get_completions():
    """
    Get smart code completions.

    Request Body:
        code (str): Current code context
        cursor_position (int): Cursor position
        language (str): Programming language
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code', '')
    cursor_position = data.get('cursor_position', len(code))
    language = data.get('language', 'python')

    # Get context around cursor
    context_before = code[:cursor_position]
    context_after = code[cursor_position:]

    # Generate completions
    completions = _generate_completions(context_before, context_after, language)

    # Save suggestions
    for completion in completions[:3]:  # Save top 3
        suggestion = CodeSuggestion(
            user_id=user_id,
            suggestion_type='completion',
            context=context_before[-200:],  # Last 200 chars
            suggestion=completion['text'],
            explanation=completion.get('explanation'),
            language=language,
            confidence=completion.get('confidence', 0.8)
        )
        db.session.add(suggestion)

    db.session.commit()

    return APIResponse.success({
        'completions': completions,
        'language': language
    })


@suggestions_bp.route('/suggestions/improve', methods=['POST'])
@jwt_required()
def get_improvements():
    """
    Get code improvement suggestions.

    Request Body:
        code (str): Code to improve
        language (str): Programming language
        focus (str): Area to focus on (performance, readability, security)
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code')
    if not code:
        return APIResponse.validation_error("code is required")

    language = data.get('language', 'python')
    focus = data.get('focus', 'all')

    # Generate improvements
    improvements = _generate_improvements(code, language, focus)

    return APIResponse.success({
        'improvements': improvements,
        'focus': focus
    })


@suggestions_bp.route('/suggestions/quick-fix', methods=['POST'])
@jwt_required()
def get_quick_fixes():
    """
    Get quick fixes for specific issues.

    Request Body:
        code (str): Code with issue
        issue_type (str): Type of issue
        line (int): Line number
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code')
    issue_type = data.get('issue_type')
    line = data.get('line', 1)

    if not code or not issue_type:
        return APIResponse.validation_error("code and issue_type are required")

    # Generate quick fixes
    fixes = _generate_quick_fixes(code, issue_type, line)

    return APIResponse.success({
        'fixes': fixes,
        'issue_type': issue_type,
        'line': line
    })


@suggestions_bp.route('/suggestions/feedback', methods=['POST'])
@jwt_required()
def submit_feedback():
    """Submit feedback on a suggestion"""
    user_id = get_jwt_identity()
    data = request.get_json()

    suggestion_id = data.get('suggestion_id')
    was_accepted = data.get('accepted', False)
    feedback = data.get('feedback')

    suggestion = CodeSuggestion.query.filter_by(
        id=suggestion_id,
        user_id=user_id
    ).first()

    if not suggestion:
        return APIResponse.not_found('Suggestion', suggestion_id)

    suggestion.was_accepted = was_accepted
    suggestion.feedback = feedback
    db.session.commit()

    return APIResponse.success({'message': 'Feedback recorded'})


# API Routes - Review Cards

@suggestions_bp.route('/cards', methods=['POST'])
@jwt_required()
def create_review_card():
    """
    Create a shareable review summary card.

    Request Body:
        review_id (int): Review to create card for
        title (str): Card title
        theme (str): Card theme
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    review_id = data.get('review_id')
    if not review_id:
        return APIResponse.validation_error("review_id is required")

    review = Review.query.filter_by(id=review_id, user_id=user_id).first()
    if not review:
        return APIResponse.not_found('Review', review_id)

    # Generate share code
    import secrets
    share_code = secrets.token_urlsafe(8)

    # Build summary data
    results = review.results or {}
    issues = results.get('issues', [])

    summary_data = {
        'repository': review.repository.name if review.repository else 'Unknown',
        'language': review.language,
        'total_issues': len(issues),
        'by_category': _count_by_category(issues),
        'score': review.overall_score or _calculate_score(issues),
        'grade': _score_to_grade(review.overall_score or _calculate_score(issues)),
        'trends': {
            'improving': True,
            'change': '+5%'
        },
        'reviewed_at': review.created_at.isoformat() if review.created_at else None
    }

    card = ReviewCard(
        user_id=user_id,
        review_id=review_id,
        share_code=share_code,
        title=data.get('title', f'{review.repository.name if review.repository else "Code"} Review'),
        theme=data.get('theme', 'default'),
        summary_data=summary_data,
        is_public=data.get('is_public', True)
    )

    db.session.add(card)
    db.session.commit()

    return APIResponse.created(card.to_dict())


@suggestions_bp.route('/cards/<share_code>', methods=['GET'])
def get_card(share_code: str):
    """Get a review card by share code (public endpoint)"""
    card = ReviewCard.query.filter_by(share_code=share_code).first()

    if not card:
        return APIResponse.not_found('Card')

    if not card.is_public:
        return APIResponse.forbidden("This card is private")

    # Check expiry
    if card.expires_at and card.expires_at < datetime.utcnow():
        return APIResponse.not_found('Card has expired')

    # Increment view count
    card.view_count += 1
    db.session.commit()

    return APIResponse.success(card.to_dict())


@suggestions_bp.route('/cards', methods=['GET'])
@jwt_required()
def get_user_cards():
    """Get user's review cards"""
    user_id = get_jwt_identity()

    cards = ReviewCard.query.filter_by(user_id=user_id).order_by(
        ReviewCard.created_at.desc()
    ).all()

    return APIResponse.success([c.to_dict() for c in cards])


@suggestions_bp.route('/cards/<int:card_id>', methods=['DELETE'])
@jwt_required()
def delete_card(card_id: int):
    """Delete a review card"""
    user_id = get_jwt_identity()

    card = ReviewCard.query.filter_by(
        id=card_id,
        user_id=user_id
    ).first()

    if not card:
        return APIResponse.not_found('Card', card_id)

    db.session.delete(card)
    db.session.commit()

    return APIResponse.no_content()


@suggestions_bp.route('/cards/<int:card_id>/share', methods=['POST'])
@jwt_required()
def track_share(card_id: int):
    """Track when a card is shared"""
    user_id = get_jwt_identity()

    card = ReviewCard.query.filter_by(
        id=card_id,
        user_id=user_id
    ).first()

    if not card:
        return APIResponse.not_found('Card', card_id)

    card.share_count += 1
    db.session.commit()

    return APIResponse.success({
        'share_count': card.share_count,
        'share_url': f'/card/{card.share_code}'
    })


@suggestions_bp.route('/cards/<int:card_id>/embed', methods=['GET'])
@jwt_required()
def get_embed_code(card_id: int):
    """Get embed code for a card"""
    user_id = get_jwt_identity()

    card = ReviewCard.query.filter_by(
        id=card_id,
        user_id=user_id
    ).first()

    if not card:
        return APIResponse.not_found('Card', card_id)

    # HTML escape share_code to prevent XSS
    from markupsafe import escape
    safe_share_code = escape(card.share_code)

    embed_code = f'<iframe src="https://codeguardian.io/embed/{safe_share_code}" width="400" height="300" frameborder="0"></iframe>'

    return APIResponse.success({
        'embed_code': embed_code,
        'share_url': f'/card/{safe_share_code}'
    })


# Helper Functions

def _generate_completions(context_before: str, context_after: str, language: str) -> List[Dict]:
    """Generate code completions"""
    completions = []

    # Analyze context
    last_line = context_before.split('\n')[-1] if context_before else ''

    # Python completions
    if language == 'python':
        if last_line.strip().startswith('def '):
            completions.append({
                'text': ':\n    """Docstring"""\n    pass',
                'explanation': 'Complete function definition with docstring',
                'confidence': 0.9
            })
        elif last_line.strip().startswith('if '):
            completions.append({
                'text': ':\n    pass',
                'explanation': 'Complete if statement',
                'confidence': 0.85
            })
        elif last_line.strip().startswith('for '):
            completions.append({
                'text': ':\n    pass',
                'explanation': 'Complete for loop',
                'confidence': 0.85
            })
        elif 'import' in last_line:
            completions.append({
                'text': '\n',
                'explanation': 'Import statement complete',
                'confidence': 0.7
            })
        else:
            completions.append({
                'text': '\n    # TODO: Implement',
                'explanation': 'Add implementation placeholder',
                'confidence': 0.6
            })

    # JavaScript completions
    elif language in ['javascript', 'typescript']:
        if 'function' in last_line:
            completions.append({
                'text': ' {\n    // Implementation\n}',
                'explanation': 'Complete function body',
                'confidence': 0.9
            })
        elif last_line.strip().startswith('if'):
            completions.append({
                'text': ' {\n    \n}',
                'explanation': 'Complete if block',
                'confidence': 0.85
            })

    return completions[:5]  # Return top 5


def _generate_improvements(code: str, language: str, focus: str) -> List[Dict]:
    """Generate code improvements"""
    improvements = []

    # Analyze code
    lines = code.split('\n')

    # Check for common issues
    if focus in ['all', 'readability']:
        # Long lines
        for i, line in enumerate(lines):
            if len(line) > 100:
                improvements.append({
                    'type': 'readability',
                    'line': i + 1,
                    'suggestion': 'Break long line into multiple lines',
                    'priority': 'medium'
                })

    if focus in ['all', 'performance']:
        # Nested loops
        if code.count('for ') > 2:
            improvements.append({
                'type': 'performance',
                'suggestion': 'Consider reducing nested loops for better performance',
                'priority': 'high'
            })

    if focus in ['all', 'security']:
        # SQL injection patterns
        if 'f"SELECT' in code or "f'SELECT" in code:
            improvements.append({
                'type': 'security',
                'suggestion': 'Use parameterized queries instead of f-strings',
                'priority': 'critical',
                'fix': 'cursor.execute("SELECT * FROM table WHERE id = %s", (user_id,))'
            })

    # Add general improvements
    if not improvements:
        improvements.append({
            'type': 'general',
            'suggestion': 'Code looks good! Consider adding type hints for better maintainability.',
            'priority': 'low'
        })

    return improvements


def _generate_quick_fixes(code: str, issue_type: str, line: int) -> List[Dict]:
    """Generate quick fixes for issues"""
    fixes = []

    if issue_type == 'missing_docstring':
        fixes.append({
            'title': 'Add docstring',
            'code': '"""TODO: Add docstring"""',
            'position': 'after_definition'
        })
    elif issue_type == 'unused_import':
        fixes.append({
            'title': 'Remove unused import',
            'action': 'delete_line',
            'line': line
        })
    elif issue_type == 'trailing_whitespace':
        fixes.append({
            'title': 'Remove trailing whitespace',
            'action': 'strip_line',
            'line': line
        })
    elif issue_type == 'missing_return_type':
        fixes.append({
            'title': 'Add return type hint',
            'code': ' -> None',
            'position': 'before_colon'
        })

    return fixes


def _count_by_category(issues: List[Dict]) -> Dict:
    """Count issues by category"""
    counts = {}
    for issue in issues:
        cat = issue.get('category', 'general')
        counts[cat] = counts.get(cat, 0) + 1
    return counts


def _calculate_score(issues: List[Dict]) -> float:
    """Calculate score based on issues"""
    if not issues:
        return 100

    # Start with 100, deduct for issues
    score = 100
    for issue in issues:
        severity = issue.get('severity', 'info')
        if severity == 'error':
            score -= 5
        elif severity == 'warning':
            score -= 2
        else:
            score -= 1

    return max(0, score)


def _score_to_grade(score: float) -> str:
    """Convert score to letter grade"""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'
