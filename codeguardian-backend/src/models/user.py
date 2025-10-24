from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    """User model for CodeGuardian platform"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    github_id = db.Column(db.String(50), unique=True, nullable=True)
    gitlab_id = db.Column(db.String(50), unique=True, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)
    full_name = db.Column(db.String(100), nullable=True)
    company = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(100), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    
    # Subscription and plan information
    plan_type = db.Column(db.String(20), default='free')  # free, pro, enterprise
    subscription_status = db.Column(db.String(20), default='active')
    trial_end_date = db.Column(db.DateTime, nullable=True)
    
    # User preferences
    preferred_languages = db.Column(db.Text, nullable=True)  # JSON string
    notification_preferences = db.Column(db.Text, nullable=True)  # JSON string
    review_style_preferences = db.Column(db.Text, nullable=True)  # JSON string
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    repositories = db.relationship('Repository', backref='owner', lazy=True)
    reviews = db.relationship('Review', backref='reviewer', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'github_id': self.github_id,
            'gitlab_id': self.gitlab_id,
            'avatar_url': self.avatar_url,
            'full_name': self.full_name,
            'company': self.company,
            'location': self.location,
            'bio': self.bio,
            'plan_type': self.plan_type,
            'subscription_status': self.subscription_status,
            'trial_end_date': self.trial_end_date.isoformat() if self.trial_end_date else None,
            'preferred_languages': json.loads(self.preferred_languages) if self.preferred_languages else [],
            'notification_preferences': json.loads(self.notification_preferences) if self.notification_preferences else {},
            'review_style_preferences': json.loads(self.review_style_preferences) if self.review_style_preferences else {},
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

    def set_preferred_languages(self, languages):
        """Set preferred programming languages as JSON"""
        self.preferred_languages = json.dumps(languages)
    
    def get_preferred_languages(self):
        """Get preferred programming languages from JSON"""
        return json.loads(self.preferred_languages) if self.preferred_languages else []
    
    def set_notification_preferences(self, preferences):
        """Set notification preferences as JSON"""
        self.notification_preferences = json.dumps(preferences)
    
    def get_notification_preferences(self):
        """Get notification preferences from JSON"""
        return json.loads(self.notification_preferences) if self.notification_preferences else {}
    
    def set_review_style_preferences(self, preferences):
        """Set review style preferences as JSON"""
        self.review_style_preferences = json.dumps(preferences)
    
    def get_review_style_preferences(self):
        """Get review style preferences from JSON"""
        return json.loads(self.review_style_preferences) if self.review_style_preferences else {}

