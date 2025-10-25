"""
User routes for CodeGuardian
Handles user profile management, preferences, and account settings
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime
from src.database import db
from src.models.user import User
from src.routes.auth import require_auth
from src.utils.validators import UserValidator, sanitize_input

user_bp = Blueprint('user', __name__)


@user_bp.route('/', methods=['GET'])
@cross_origin()
@require_auth
def get_user_profile():
    """Get current user's profile"""
    try:
        user = request.current_user
        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/<int:user_id>', methods=['GET'])
@cross_origin()
@require_auth
def get_user_by_id(user_id):
    """Get user by ID (public profile information)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({
                'success': False,
                'error': 'User not found'
            }), 404

        # Return limited public information
        public_profile = {
            'id': user.id,
            'username': user.username,
            'avatar_url': user.avatar_url,
            'full_name': user.full_name,
            'company': user.company,
            'location': user.location,
            'bio': user.bio
        }

        return jsonify({
            'success': True,
            'user': public_profile
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/update', methods=['PUT'])
@cross_origin()
@require_auth
def update_user_profile():
    """Update user profile"""
    try:
        user = request.current_user
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Sanitize and update allowed fields
        if 'full_name' in data:
            user.full_name = sanitize_input(data['full_name'], max_length=100)

        if 'company' in data:
            user.company = sanitize_input(data['company'], max_length=100)

        if 'location' in data:
            user.location = sanitize_input(data['location'], max_length=100)

        if 'bio' in data:
            user.bio = sanitize_input(data['bio'], max_length=500)

        if 'avatar_url' in data:
            user.avatar_url = sanitize_input(data['avatar_url'], max_length=255)

        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/preferences', methods=['GET'])
@cross_origin()
@require_auth
def get_preferences():
    """Get user preferences"""
    try:
        user = request.current_user

        return jsonify({
            'success': True,
            'preferences': {
                'preferred_languages': user.get_preferred_languages(),
                'notification_preferences': user.get_notification_preferences(),
                'review_style_preferences': user.get_review_style_preferences()
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/preferences', methods=['PUT'])
@cross_origin()
@require_auth
def update_preferences():
    """Update user preferences"""
    try:
        user = request.current_user
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400

        # Update preferences
        if 'preferred_languages' in data:
            if isinstance(data['preferred_languages'], list):
                user.set_preferred_languages(data['preferred_languages'])
            else:
                return jsonify({
                    'success': False,
                    'error': 'preferred_languages must be a list'
                }), 400

        if 'notification_preferences' in data:
            if isinstance(data['notification_preferences'], dict):
                user.set_notification_preferences(data['notification_preferences'])
            else:
                return jsonify({
                    'success': False,
                    'error': 'notification_preferences must be a dictionary'
                }), 400

        if 'review_style_preferences' in data:
            if isinstance(data['review_style_preferences'], dict):
                user.set_review_style_preferences(data['review_style_preferences'])
            else:
                return jsonify({
                    'success': False,
                    'error': 'review_style_preferences must be a dictionary'
                }), 400

        user.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Preferences updated successfully',
            'preferences': {
                'preferred_languages': user.get_preferred_languages(),
                'notification_preferences': user.get_notification_preferences(),
                'review_style_preferences': user.get_review_style_preferences()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/subscription', methods=['GET'])
@cross_origin()
@require_auth
def get_subscription():
    """Get user subscription information"""
    try:
        user = request.current_user

        return jsonify({
            'success': True,
            'subscription': {
                'plan_type': user.plan_type,
                'subscription_status': user.subscription_status,
                'trial_end_date': user.trial_end_date.isoformat() if user.trial_end_date else None
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/stats', methods=['GET'])
@cross_origin()
@require_auth
def get_user_stats():
    """Get user statistics"""
    try:
        user = request.current_user

        # Count user's repositories and reviews
        repo_count = len(user.repositories)
        review_count = len(user.reviews)

        # Calculate average review scores if reviews exist
        avg_score = 0
        if review_count > 0:
            total_score = sum(review.overall_score for review in user.reviews if review.overall_score)
            avg_score = total_score / review_count if review_count > 0 else 0

        return jsonify({
            'success': True,
            'stats': {
                'total_repositories': repo_count,
                'total_reviews': review_count,
                'average_review_score': round(avg_score, 2),
                'account_created': user.created_at.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@user_bp.route('/delete', methods=['DELETE'])
@cross_origin()
@require_auth
def delete_user_account():
    """Delete user account (soft delete or hard delete)"""
    try:
        user = request.current_user
        user_id = user.id

        # Hard delete: Remove user and all associated data
        # Note: This will cascade delete repositories, reviews, etc. if configured
        db.session.delete(user)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User account {user_id} deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
