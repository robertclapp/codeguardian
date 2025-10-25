from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from src.models.user import db

class Repository(db.Model):
    """Repository model for tracking connected repositories"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    full_name = db.Column(db.String(200), nullable=False)  # owner/repo-name
    platform = db.Column(db.String(20), nullable=False)  # github, gitlab, bitbucket
    platform_id = db.Column(db.String(50), nullable=False)  # ID from the platform
    clone_url = db.Column(db.String(500), nullable=False)
    default_branch = db.Column(db.String(50), default='main')
    
    # Repository metadata
    description = db.Column(db.Text, nullable=True)
    language = db.Column(db.String(50), nullable=True)  # Primary language
    is_private = db.Column(db.Boolean, default=False)
    is_fork = db.Column(db.Boolean, default=False)
    stars_count = db.Column(db.Integer, default=0)
    forks_count = db.Column(db.Integer, default=0)
    
    # CodeGuardian specific settings
    is_enabled = db.Column(db.Boolean, default=True)
    review_settings = db.Column(db.Text, nullable=True)  # JSON string for custom settings
    webhook_id = db.Column(db.String(50), nullable=True)  # Platform webhook ID
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_sync = db.Column(db.DateTime, nullable=True)
    
    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    pull_requests = db.relationship('PullRequest', backref='repository', lazy=True)
    
    def __repr__(self):
        return f'<Repository {self.full_name}>'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'full_name': self.full_name,
            'platform': self.platform,
            'platform_id': self.platform_id,
            'clone_url': self.clone_url,
            'default_branch': self.default_branch,
            'description': self.description,
            'language': self.language,
            'is_private': self.is_private,
            'is_fork': self.is_fork,
            'stars_count': self.stars_count,
            'forks_count': self.forks_count,
            'is_enabled': self.is_enabled,
            'review_settings': json.loads(self.review_settings) if self.review_settings else {},
            'webhook_id': self.webhook_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_sync': self.last_sync.isoformat() if self.last_sync else None,
            'user_id': self.user_id
        }

    def set_review_settings(self, settings):
        """Set review settings as JSON"""
        self.review_settings = json.dumps(settings)
    
    def get_review_settings(self):
        """Get review settings from JSON"""
        return json.loads(self.review_settings) if self.review_settings else {}


class PullRequest(db.Model):
    """Pull Request model for tracking PR reviews"""
    id = db.Column(db.Integer, primary_key=True)
    platform_id = db.Column(db.String(50), nullable=False)  # PR ID from platform
    number = db.Column(db.Integer, nullable=False)  # PR number
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text, nullable=True)
    state = db.Column(db.String(20), nullable=False)  # open, closed, merged
    
    # PR metadata
    author_username = db.Column(db.String(100), nullable=False)
    author_avatar = db.Column(db.String(255), nullable=True)
    base_branch = db.Column(db.String(100), nullable=False)
    head_branch = db.Column(db.String(100), nullable=False)
    
    # File changes
    files_changed = db.Column(db.Integer, default=0)
    additions = db.Column(db.Integer, default=0)
    deletions = db.Column(db.Integer, default=0)
    
    # Review status
    review_status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, failed
    ai_summary = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    platform_created_at = db.Column(db.DateTime, nullable=True)
    platform_updated_at = db.Column(db.DateTime, nullable=True)
    
    # Foreign keys
    repository_id = db.Column(db.Integer, db.ForeignKey('repository.id'), nullable=False)
    
    # Relationships
    reviews = db.relationship('Review', backref='pull_request', lazy=True)
    
    def __repr__(self):
        return f'<PullRequest #{self.number} - {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'platform_id': self.platform_id,
            'number': self.number,
            'title': self.title,
            'description': self.description,
            'state': self.state,
            'author_username': self.author_username,
            'author_avatar': self.author_avatar,
            'base_branch': self.base_branch,
            'head_branch': self.head_branch,
            'files_changed': self.files_changed,
            'additions': self.additions,
            'deletions': self.deletions,
            'review_status': self.review_status,
            'ai_summary': self.ai_summary,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'platform_created_at': self.platform_created_at.isoformat() if self.platform_created_at else None,
            'platform_updated_at': self.platform_updated_at.isoformat() if self.platform_updated_at else None,
            'repository_id': self.repository_id
        }

