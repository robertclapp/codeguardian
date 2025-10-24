from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
import requests
from datetime import datetime
from src.models.user import db
from src.models.repository import Repository, PullRequest
from src.routes.auth import require_auth

repositories_bp = Blueprint('repositories', __name__)

@repositories_bp.route('/', methods=['GET'])
@cross_origin()
@require_auth
def get_repositories():
    """Get all repositories for the current user"""
    try:
        user = request.current_user
        repositories = Repository.query.filter_by(user_id=user.id).all()
        
        return jsonify({
            'repositories': [repo.to_dict() for repo in repositories]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/<int:repo_id>', methods=['GET'])
@cross_origin()
@require_auth
def get_repository(repo_id):
    """Get a specific repository"""
    try:
        user = request.current_user
        repository = Repository.query.filter_by(id=repo_id, user_id=user.id).first()
        
        if not repository:
            return jsonify({'error': 'Repository not found'}), 404
        
        return jsonify({
            'repository': repository.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/connect', methods=['POST'])
@cross_origin()
@require_auth
def connect_repository():
    """Connect a new repository to CodeGuardian"""
    try:
        data = request.get_json()
        user = request.current_user
        
        platform = data.get('platform')  # github, gitlab, bitbucket
        repo_url = data.get('repo_url')
        access_token = data.get('access_token')
        
        if not all([platform, repo_url, access_token]):
            return jsonify({'error': 'Platform, repo_url, and access_token are required'}), 400
        
        # Parse repository information from URL
        if platform == 'github':
            # Extract owner/repo from GitHub URL
            if 'github.com' in repo_url:
                parts = repo_url.split('/')
                if len(parts) >= 2:
                    owner = parts[-2]
                    repo_name = parts[-1].replace('.git', '')
                    full_name = f"{owner}/{repo_name}"
                else:
                    return jsonify({'error': 'Invalid GitHub repository URL'}), 400
            else:
                return jsonify({'error': 'Invalid GitHub repository URL'}), 400
            
            # Get repository info from GitHub API
            headers = {'Authorization': f'token {access_token}'}
            api_url = f'https://api.github.com/repos/{full_name}'
            response = requests.get(api_url, headers=headers)
            
            if response.status_code != 200:
                return jsonify({'error': 'Failed to fetch repository information from GitHub'}), 400
            
            repo_data = response.json()
            
            # Check if repository already exists
            existing_repo = Repository.query.filter_by(
                platform_id=str(repo_data['id']),
                user_id=user.id
            ).first()
            
            if existing_repo:
                return jsonify({'error': 'Repository already connected'}), 409
            
            # Create new repository record
            repository = Repository(
                name=repo_data['name'],
                full_name=repo_data['full_name'],
                platform='github',
                platform_id=str(repo_data['id']),
                clone_url=repo_data['clone_url'],
                default_branch=repo_data['default_branch'],
                description=repo_data.get('description'),
                language=repo_data.get('language'),
                is_private=repo_data['private'],
                is_fork=repo_data['fork'],
                stars_count=repo_data['stargazers_count'],
                forks_count=repo_data['forks_count'],
                user_id=user.id
            )
            
            db.session.add(repository)
            db.session.commit()
            
            # TODO: Set up webhook for the repository
            # This would involve creating a webhook on GitHub to notify CodeGuardian of PR events
            
            return jsonify({
                'message': 'Repository connected successfully',
                'repository': repository.to_dict()
            }), 201
            
        else:
            return jsonify({'error': f'Platform {platform} not yet supported'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/<int:repo_id>/disconnect', methods=['DELETE'])
@cross_origin()
@require_auth
def disconnect_repository(repo_id):
    """Disconnect a repository from CodeGuardian"""
    try:
        user = request.current_user
        repository = Repository.query.filter_by(id=repo_id, user_id=user.id).first()
        
        if not repository:
            return jsonify({'error': 'Repository not found'}), 404
        
        # TODO: Remove webhook from the platform
        
        # Delete repository and related data
        db.session.delete(repository)
        db.session.commit()
        
        return jsonify({
            'message': 'Repository disconnected successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/<int:repo_id>/settings', methods=['PUT'])
@cross_origin()
@require_auth
def update_repository_settings(repo_id):
    """Update repository review settings"""
    try:
        data = request.get_json()
        user = request.current_user
        repository = Repository.query.filter_by(id=repo_id, user_id=user.id).first()
        
        if not repository:
            return jsonify({'error': 'Repository not found'}), 404
        
        # Update settings
        if 'is_enabled' in data:
            repository.is_enabled = data['is_enabled']
        
        if 'review_settings' in data:
            repository.set_review_settings(data['review_settings'])
        
        repository.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Repository settings updated successfully',
            'repository': repository.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/<int:repo_id>/pull-requests', methods=['GET'])
@cross_origin()
@require_auth
def get_pull_requests(repo_id):
    """Get pull requests for a repository"""
    try:
        user = request.current_user
        repository = Repository.query.filter_by(id=repo_id, user_id=user.id).first()
        
        if not repository:
            return jsonify({'error': 'Repository not found'}), 404
        
        # Query parameters for filtering
        state = request.args.get('state', 'all')  # open, closed, merged, all
        limit = min(int(request.args.get('limit', 50)), 100)  # Max 100
        offset = int(request.args.get('offset', 0))
        
        query = PullRequest.query.filter_by(repository_id=repository.id)
        
        if state != 'all':
            query = query.filter_by(state=state)
        
        pull_requests = query.order_by(PullRequest.created_at.desc()).offset(offset).limit(limit).all()
        
        return jsonify({
            'pull_requests': [pr.to_dict() for pr in pull_requests],
            'total': query.count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/<int:repo_id>/sync', methods=['POST'])
@cross_origin()
@require_auth
def sync_repository(repo_id):
    """Sync repository data with the platform"""
    try:
        user = request.current_user
        repository = Repository.query.filter_by(id=repo_id, user_id=user.id).first()
        
        if not repository:
            return jsonify({'error': 'Repository not found'}), 404
        
        # TODO: Implement sync logic based on platform
        # This would fetch latest repository data and pull requests from the platform
        
        repository.last_sync = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Repository synced successfully',
            'repository': repository.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@repositories_bp.route('/discover', methods=['GET'])
@cross_origin()
@require_auth
def discover_repositories():
    """Discover repositories from connected platforms"""
    try:
        user = request.current_user
        platform = request.args.get('platform', 'github')
        access_token = request.args.get('access_token')
        
        if not access_token:
            return jsonify({'error': 'Access token is required'}), 400
        
        repositories = []
        
        if platform == 'github':
            headers = {'Authorization': f'token {access_token}'}
            
            # Get user's repositories
            response = requests.get('https://api.github.com/user/repos', headers=headers, params={
                'sort': 'updated',
                'per_page': 50
            })
            
            if response.status_code == 200:
                github_repos = response.json()
                
                for repo in github_repos:
                    # Check if already connected
                    existing = Repository.query.filter_by(
                        platform_id=str(repo['id']),
                        user_id=user.id
                    ).first()
                    
                    repositories.append({
                        'id': repo['id'],
                        'name': repo['name'],
                        'full_name': repo['full_name'],
                        'description': repo.get('description'),
                        'language': repo.get('language'),
                        'is_private': repo['private'],
                        'is_fork': repo['fork'],
                        'stars_count': repo['stargazers_count'],
                        'updated_at': repo['updated_at'],
                        'is_connected': existing is not None
                    })
            else:
                return jsonify({'error': 'Failed to fetch repositories from GitHub'}), 400
        
        return jsonify({
            'repositories': repositories
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

