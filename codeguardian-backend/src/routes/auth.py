from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
import requests
import os
from datetime import datetime, timedelta
import jwt
from functools import wraps
from src.models.user import db, User

auth_bp = Blueprint('auth', __name__)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

def generate_jwt_token(user_id):
    """Generate JWT token for user authentication"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token):
    """Verify JWT token and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """Decorator to require authentication for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                return jsonify({'error': 'Invalid authorization header format'}), 401
        
        if not token:
            return jsonify({'error': 'Authentication token is missing'}), 401
        
        user_id = verify_jwt_token(token)
        if user_id is None:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # Get user from database
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        # Add user to request context
        request.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function

@auth_bp.route('/login', methods=['POST'])
@cross_origin()
def login():
    """Login with email and password (for demo purposes)"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # For demo purposes, we'll create a user if they don't exist
        user = User.query.filter_by(email=email).first()
        if not user:
            # Create new user
            username = email.split('@')[0]
            user = User(
                username=username,
                email=email,
                full_name=username.title(),
                plan_type='free',
                trial_end_date=datetime.utcnow() + timedelta(days=14)
            )
            db.session.add(user)
            db.session.commit()
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/github/login', methods=['POST'])
@cross_origin()
def github_login():
    """Login with GitHub OAuth (simplified for demo)"""
    try:
        data = request.get_json()
        github_token = data.get('github_token')
        
        if not github_token:
            return jsonify({'error': 'GitHub token is required'}), 400
        
        # Get user info from GitHub API
        headers = {'Authorization': f'token {github_token}'}
        response = requests.get('https://api.github.com/user', headers=headers)
        
        if response.status_code != 200:
            return jsonify({'error': 'Invalid GitHub token'}), 401
        
        github_user = response.json()
        
        # Check if user exists
        user = User.query.filter_by(github_id=str(github_user['id'])).first()
        
        if not user:
            # Create new user from GitHub data
            user = User(
                username=github_user['login'],
                email=github_user.get('email', f"{github_user['login']}@github.local"),
                github_id=str(github_user['id']),
                avatar_url=github_user.get('avatar_url'),
                full_name=github_user.get('name'),
                company=github_user.get('company'),
                location=github_user.get('location'),
                bio=github_user.get('bio'),
                plan_type='free',
                trial_end_date=datetime.utcnow() + timedelta(days=14)
            )
            db.session.add(user)
        else:
            # Update existing user with latest GitHub data
            user.avatar_url = github_user.get('avatar_url')
            user.full_name = github_user.get('name')
            user.company = github_user.get('company')
            user.location = github_user.get('location')
            user.bio = github_user.get('bio')
        
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Generate JWT token
        token = generate_jwt_token(user.id)
        
        return jsonify({
            'message': 'GitHub login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@cross_origin()
@require_auth
def get_current_user():
    """Get current authenticated user"""
    try:
        return jsonify({
            'user': request.current_user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
@cross_origin()
@require_auth
def logout():
    """Logout user (client should discard token)"""
    try:
        return jsonify({
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@cross_origin()
@require_auth
def refresh_token():
    """Refresh JWT token"""
    try:
        # Generate new token
        token = generate_jwt_token(request.current_user.id)
        
        return jsonify({
            'message': 'Token refreshed successfully',
            'token': token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
@cross_origin()
@require_auth
def update_profile():
    """Update user profile"""
    try:
        data = request.get_json()
        user = request.current_user
        
        # Update allowed fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'company' in data:
            user.company = data['company']
        if 'location' in data:
            user.location = data['location']
        if 'bio' in data:
            user.bio = data['bio']
        if 'preferred_languages' in data:
            user.set_preferred_languages(data['preferred_languages'])
        if 'notification_preferences' in data:
            user.set_notification_preferences(data['notification_preferences'])
        if 'review_style_preferences' in data:
            user.set_review_style_preferences(data['review_style_preferences'])
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Profile updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

