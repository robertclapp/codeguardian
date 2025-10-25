from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json
from src.models.user import db

class Review(db.Model):
    """Review model for AI-generated code reviews"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Review metadata
    review_type = db.Column(db.String(50), nullable=False)  # full_review, incremental, security_scan
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, failed
    
    # AI analysis results
    overall_score = db.Column(db.Float, nullable=True)  # 0-100 quality score
    security_score = db.Column(db.Float, nullable=True)  # 0-100 security score
    performance_score = db.Column(db.Float, nullable=True)  # 0-100 performance score
    maintainability_score = db.Column(db.Float, nullable=True)  # 0-100 maintainability score
    
    # Review content
    summary = db.Column(db.Text, nullable=True)
    recommendations = db.Column(db.Text, nullable=True)  # JSON array of recommendations
    
    # Processing metadata
    ai_model_used = db.Column(db.String(50), nullable=True)  # gpt-4, claude-3, etc.
    processing_time_ms = db.Column(db.Integer, nullable=True)
    tokens_used = db.Column(db.Integer, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Foreign keys
    pull_request_id = db.Column(db.Integer, db.ForeignKey('pull_request.id'), nullable=False)
    reviewer_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # AI reviewer
    
    # Relationships
    comments = db.relationship('ReviewComment', backref='review', lazy=True)
    
    def __repr__(self):
        return f'<Review {self.id} - {self.review_type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'review_type': self.review_type,
            'status': self.status,
            'overall_score': self.overall_score,
            'security_score': self.security_score,
            'performance_score': self.performance_score,
            'maintainability_score': self.maintainability_score,
            'summary': self.summary,
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'ai_model_used': self.ai_model_used,
            'processing_time_ms': self.processing_time_ms,
            'tokens_used': self.tokens_used,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'pull_request_id': self.pull_request_id,
            'reviewer_id': self.reviewer_id
        }

    def set_recommendations(self, recommendations):
        """Set recommendations as JSON"""
        self.recommendations = json.dumps(recommendations)
    
    def get_recommendations(self):
        """Get recommendations from JSON"""
        return json.loads(self.recommendations) if self.recommendations else []


class ReviewComment(db.Model):
    """Individual comments within a review"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Comment location
    file_path = db.Column(db.String(500), nullable=False)
    line_number = db.Column(db.Integer, nullable=True)
    start_line = db.Column(db.Integer, nullable=True)
    end_line = db.Column(db.Integer, nullable=True)
    
    # Comment content
    comment_type = db.Column(db.String(50), nullable=False)  # suggestion, warning, error, info
    severity = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    category = db.Column(db.String(50), nullable=False)  # security, performance, style, logic, etc.
    
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    suggested_fix = db.Column(db.Text, nullable=True)
    
    # Code context
    original_code = db.Column(db.Text, nullable=True)
    suggested_code = db.Column(db.Text, nullable=True)
    
    # User interaction
    is_resolved = db.Column(db.Boolean, default=False)
    user_feedback = db.Column(db.String(20), nullable=True)  # helpful, not_helpful, applied
    
    # Platform integration
    platform_comment_id = db.Column(db.String(50), nullable=True)  # ID from GitHub/GitLab
    is_posted = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    # Foreign keys
    review_id = db.Column(db.Integer, db.ForeignKey('review.id'), nullable=False)
    
    def __repr__(self):
        return f'<ReviewComment {self.id} - {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'file_path': self.file_path,
            'line_number': self.line_number,
            'start_line': self.start_line,
            'end_line': self.end_line,
            'comment_type': self.comment_type,
            'severity': self.severity,
            'category': self.category,
            'title': self.title,
            'message': self.message,
            'suggested_fix': self.suggested_fix,
            'original_code': self.original_code,
            'suggested_code': self.suggested_code,
            'is_resolved': self.is_resolved,
            'user_feedback': self.user_feedback,
            'platform_comment_id': self.platform_comment_id,
            'is_posted': self.is_posted,
            'created_at': self.created_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'review_id': self.review_id
        }


class MentorshipSession(db.Model):
    """Mentorship sessions for AI-powered learning"""
    id = db.Column(db.Integer, primary_key=True)
    
    # Session metadata
    session_type = db.Column(db.String(50), nullable=False)  # skill_assessment, learning_path, code_review
    topic = db.Column(db.String(100), nullable=False)
    difficulty_level = db.Column(db.String(20), nullable=False)  # beginner, intermediate, advanced
    
    # Content
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    learning_objectives = db.Column(db.Text, nullable=True)  # JSON array
    content = db.Column(db.Text, nullable=True)  # JSON with structured content
    
    # Progress tracking
    status = db.Column(db.String(20), default='not_started')  # not_started, in_progress, completed
    progress_percentage = db.Column(db.Float, default=0.0)
    completion_time_minutes = db.Column(db.Integer, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    started_at = db.Column(db.DateTime, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    def __repr__(self):
        return f'<MentorshipSession {self.id} - {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'session_type': self.session_type,
            'topic': self.topic,
            'difficulty_level': self.difficulty_level,
            'title': self.title,
            'description': self.description,
            'learning_objectives': json.loads(self.learning_objectives) if self.learning_objectives else [],
            'content': json.loads(self.content) if self.content else {},
            'status': self.status,
            'progress_percentage': self.progress_percentage,
            'completion_time_minutes': self.completion_time_minutes,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'user_id': self.user_id
        }

    def set_learning_objectives(self, objectives):
        """Set learning objectives as JSON"""
        self.learning_objectives = json.dumps(objectives)
    
    def get_learning_objectives(self):
        """Get learning objectives from JSON"""
        return json.loads(self.learning_objectives) if self.learning_objectives else []
    
    def set_content(self, content):
        """Set content as JSON"""
        self.content = json.dumps(content)
    
    def get_content(self):
        """Get content from JSON"""
        return json.loads(self.content) if self.content else {}

