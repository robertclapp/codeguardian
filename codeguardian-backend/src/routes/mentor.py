"""
AI Code Mentor routes for CodeGuardian

Provides personalized coding improvement suggestions and learning paths
based on developer's coding patterns and history.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from src.database import db
from src.models.user import User
from src.models.review import Review
from src.models.repository import Repository
from src.responses import APIResponse
from src.services import EventService, CacheService
from src.exceptions import NotFoundError, ValidationError


mentor_bp = Blueprint('mentor', __name__)


# Developer Profile Analysis Models

class DeveloperProfile(db.Model):
    """Developer coding profile and preferences"""
    __tablename__ = 'developer_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)

    # Coding style metrics
    avg_function_length = db.Column(db.Float, default=0)
    avg_complexity = db.Column(db.Float, default=0)
    documentation_rate = db.Column(db.Float, default=0)
    test_coverage_rate = db.Column(db.Float, default=0)

    # Language proficiency (JSON: {language: {level: int, confidence: float}})
    language_proficiency = db.Column(db.JSON, default=dict)

    # Pattern preferences (JSON: {pattern: frequency})
    pattern_preferences = db.Column(db.JSON, default=dict)

    # Improvement areas (JSON: [{area: str, priority: int, progress: float}])
    improvement_areas = db.Column(db.JSON, default=list)

    # Learning progress
    experience_level = db.Column(db.String(20), default='intermediate')
    total_reviews = db.Column(db.Integer, default=0)
    total_issues_fixed = db.Column(db.Integer, default=0)
    skill_score = db.Column(db.Float, default=50.0)

    # Goals
    active_goals = db.Column(db.JSON, default=list)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_analysis_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship('User', backref=db.backref('developer_profile', uselist=False))

    def to_dict(self) -> dict:
        """Convert profile to dictionary"""
        return {
            'user_id': self.user_id,
            'coding_style': {
                'avg_function_length': round(self.avg_function_length, 2),
                'avg_complexity': round(self.avg_complexity, 2),
                'documentation_rate': round(self.documentation_rate * 100, 1),
                'test_coverage_rate': round(self.test_coverage_rate * 100, 1)
            },
            'language_proficiency': self.language_proficiency or {},
            'pattern_preferences': self.pattern_preferences or {},
            'improvement_areas': self.improvement_areas or [],
            'experience_level': self.experience_level,
            'stats': {
                'total_reviews': self.total_reviews,
                'total_issues_fixed': self.total_issues_fixed,
                'skill_score': round(self.skill_score, 1)
            },
            'active_goals': self.active_goals or [],
            'last_analysis_at': self.last_analysis_at.isoformat() if self.last_analysis_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class LearningRecommendation(db.Model):
    """Personalized learning recommendations"""
    __tablename__ = 'learning_recommendations'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Recommendation details
    category = db.Column(db.String(50), nullable=False)  # style, performance, security, testing, etc.
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.Integer, default=1)  # 1-5

    # Learning resources
    resources = db.Column(db.JSON, default=list)  # [{type, title, url}]
    code_examples = db.Column(db.JSON, default=list)  # [{before, after, explanation}]

    # Progress tracking
    status = db.Column(db.String(20), default='active')  # active, in_progress, completed, dismissed
    progress = db.Column(db.Float, default=0)  # 0-100
    completed_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='learning_recommendations')

    def to_dict(self) -> dict:
        """Convert recommendation to dictionary"""
        return {
            'id': self.id,
            'category': self.category,
            'title': self.title,
            'description': self.description,
            'priority': self.priority,
            'resources': self.resources or [],
            'code_examples': self.code_examples or [],
            'status': self.status,
            'progress': self.progress,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class SkillProgress(db.Model):
    """Track progress in specific skills over time"""
    __tablename__ = 'skill_progress'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Skill details
    skill_name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False)

    # Progress metrics
    score = db.Column(db.Float, default=0)  # 0-100
    previous_score = db.Column(db.Float, default=0)
    trend = db.Column(db.String(20), default='stable')  # improving, stable, declining

    # Usage stats
    occurrences = db.Column(db.Integer, default=0)
    improvements = db.Column(db.Integer, default=0)

    # Timestamp
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='skill_progress')

    def to_dict(self) -> dict:
        """Convert progress to dictionary"""
        return {
            'skill_name': self.skill_name,
            'category': self.category,
            'score': round(self.score, 1),
            'previous_score': round(self.previous_score, 1),
            'trend': self.trend,
            'change': round(self.score - self.previous_score, 1),
            'occurrences': self.occurrences,
            'improvements': self.improvements,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None
        }


# API Routes

@mentor_bp.route('/mentor/profile', methods=['GET'])
@jwt_required()
def get_mentor_profile():
    """
    Get developer's coding profile and analysis

    Returns personalized coding profile with style metrics,
    language proficiency, and improvement areas.
    """
    user_id = get_jwt_identity()

    # Get or create profile
    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()

    if not profile:
        # Create new profile
        profile = DeveloperProfile(user_id=user_id)
        db.session.add(profile)
        db.session.commit()

        # Trigger initial analysis
        _analyze_developer_profile(user_id)
        profile = DeveloperProfile.query.filter_by(user_id=user_id).first()

    return APIResponse.success(profile.to_dict())


@mentor_bp.route('/mentor/analyze', methods=['POST'])
@jwt_required()
def analyze_coding_patterns():
    """
    Analyze developer's coding patterns

    Performs deep analysis of coding style, patterns, and
    generates personalized improvement suggestions.
    """
    user_id = get_jwt_identity()

    # Perform analysis
    analysis = _analyze_developer_profile(user_id)

    # Log activity
    EventService.log_audit(
        action='mentor_analysis',
        resource_type='developer_profile',
        resource_id=str(user_id),
        user_id=user_id
    )

    return APIResponse.success(analysis, "Profile analysis completed")


@mentor_bp.route('/mentor/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    """
    Get personalized learning recommendations

    Returns prioritized list of recommendations based on
    coding patterns and improvement areas.
    """
    user_id = get_jwt_identity()

    # Get query parameters
    category = request.args.get('category')
    status = request.args.get('status', 'active')
    limit = min(int(request.args.get('limit', 10)), 50)

    # Build query
    query = LearningRecommendation.query.filter_by(user_id=user_id)

    if category:
        query = query.filter_by(category=category)

    if status:
        query = query.filter_by(status=status)

    recommendations = query.order_by(
        LearningRecommendation.priority.desc(),
        LearningRecommendation.created_at.desc()
    ).limit(limit).all()

    # If no recommendations exist, generate them
    if not recommendations and status == 'active':
        _generate_recommendations(user_id)
        recommendations = LearningRecommendation.query.filter_by(
            user_id=user_id,
            status='active'
        ).order_by(LearningRecommendation.priority.desc()).limit(limit).all()

    return APIResponse.success([r.to_dict() for r in recommendations])


@mentor_bp.route('/mentor/recommendations/<int:recommendation_id>', methods=['PUT'])
@jwt_required()
def update_recommendation(recommendation_id: int):
    """
    Update recommendation status or progress

    Allows marking recommendations as completed, in_progress,
    or dismissed.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    recommendation = LearningRecommendation.query.filter_by(
        id=recommendation_id,
        user_id=user_id
    ).first()

    if not recommendation:
        return APIResponse.not_found('Recommendation', recommendation_id)

    # Update fields
    if 'status' in data:
        recommendation.status = data['status']
        if data['status'] == 'completed':
            recommendation.completed_at = datetime.utcnow()
            recommendation.progress = 100

            # Update skill progress
            _update_skill_on_completion(user_id, recommendation)

    if 'progress' in data:
        recommendation.progress = min(100, max(0, data['progress']))

    db.session.commit()

    return APIResponse.success(recommendation.to_dict())


@mentor_bp.route('/mentor/learning-path', methods=['GET'])
@jwt_required()
def get_learning_path():
    """
    Get suggested learning path

    Returns structured learning path based on current skills
    and improvement goals.
    """
    user_id = get_jwt_identity()

    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return APIResponse.not_found('Developer profile')

    # Generate learning path
    learning_path = _generate_learning_path(profile)

    return APIResponse.success(learning_path)


@mentor_bp.route('/mentor/goals', methods=['POST'])
@jwt_required()
def set_improvement_goals():
    """
    Set improvement goals

    Define specific coding improvement goals with deadlines.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or 'goals' not in data:
        return APIResponse.validation_error("Goals are required")

    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = DeveloperProfile(user_id=user_id)
        db.session.add(profile)

    # Validate and set goals
    goals = []
    for goal in data['goals']:
        if not goal.get('title'):
            continue

        goals.append({
            'id': len(goals) + 1,
            'title': goal['title'],
            'description': goal.get('description', ''),
            'target_date': goal.get('target_date'),
            'category': goal.get('category', 'general'),
            'progress': 0,
            'created_at': datetime.utcnow().isoformat()
        })

    profile.active_goals = goals
    db.session.commit()

    # Generate recommendations for goals
    _generate_goal_recommendations(user_id, goals)

    return APIResponse.created({'goals': goals})


@mentor_bp.route('/mentor/goals', methods=['GET'])
@jwt_required()
def get_goals():
    """Get current improvement goals"""
    user_id = get_jwt_identity()

    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return APIResponse.success([])

    return APIResponse.success(profile.active_goals or [])


@mentor_bp.route('/mentor/goals/<int:goal_id>', methods=['PUT'])
@jwt_required()
def update_goal(goal_id: int):
    """Update goal progress"""
    user_id = get_jwt_identity()
    data = request.get_json()

    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile or not profile.active_goals:
        return APIResponse.not_found('Goal')

    # Find and update goal
    goals = profile.active_goals
    for goal in goals:
        if goal.get('id') == goal_id:
            if 'progress' in data:
                goal['progress'] = min(100, max(0, data['progress']))
            if 'completed' in data and data['completed']:
                goal['progress'] = 100
                goal['completed_at'] = datetime.utcnow().isoformat()
            break
    else:
        return APIResponse.not_found('Goal', goal_id)

    profile.active_goals = goals
    db.session.commit()

    return APIResponse.success(goal)


@mentor_bp.route('/mentor/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """
    Get progress over time

    Returns skill progress history and trends.
    """
    user_id = get_jwt_identity()

    # Get time range
    days = int(request.args.get('days', 30))
    start_date = datetime.utcnow() - timedelta(days=days)

    # Get progress records
    progress_records = SkillProgress.query.filter(
        SkillProgress.user_id == user_id,
        SkillProgress.recorded_at >= start_date
    ).order_by(SkillProgress.recorded_at.desc()).all()

    # Organize by skill
    skills_progress = {}
    for record in progress_records:
        if record.skill_name not in skills_progress:
            skills_progress[record.skill_name] = []
        skills_progress[record.skill_name].append(record.to_dict())

    # Get summary
    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    summary = {
        'overall_score': profile.skill_score if profile else 50,
        'total_recommendations_completed': LearningRecommendation.query.filter_by(
            user_id=user_id,
            status='completed'
        ).count(),
        'active_recommendations': LearningRecommendation.query.filter_by(
            user_id=user_id,
            status='active'
        ).count(),
        'goals_completed': sum(
            1 for g in (profile.active_goals or [])
            if g.get('progress', 0) >= 100
        ) if profile else 0
    }

    return APIResponse.success({
        'summary': summary,
        'skills_progress': skills_progress,
        'period_days': days
    })


@mentor_bp.route('/mentor/insights', methods=['GET'])
@jwt_required()
def get_insights():
    """
    Get AI-powered coding insights

    Returns intelligent insights about coding patterns
    and suggestions for improvement.
    """
    user_id = get_jwt_identity()

    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return APIResponse.success({
            'insights': [],
            'message': 'Complete some code reviews to get personalized insights'
        })

    # Generate insights based on profile
    insights = _generate_insights(profile)

    return APIResponse.success({
        'insights': insights,
        'generated_at': datetime.utcnow().isoformat()
    })


# Helper Functions

def _analyze_developer_profile(user_id: int) -> Dict:
    """
    Perform comprehensive analysis of developer's coding patterns.

    Analyzes review history, code patterns, and generates
    improvement recommendations.
    """
    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        profile = DeveloperProfile(user_id=user_id)
        db.session.add(profile)

    # Get user's reviews
    reviews = Review.query.filter_by(user_id=user_id).order_by(
        Review.created_at.desc()
    ).limit(100).all()

    if not reviews:
        profile.last_analysis_at = datetime.utcnow()
        db.session.commit()
        return {
            'status': 'no_data',
            'message': 'Complete some code reviews to get personalized analysis'
        }

    # Analyze patterns from reviews
    total_issues = 0
    issues_fixed = 0
    languages = {}
    patterns = {}
    complexity_scores = []

    for review in reviews:
        results = review.results or {}

        # Count issues
        issues = results.get('issues', [])
        total_issues += len(issues)

        # Track languages
        lang = review.language or 'unknown'
        if lang not in languages:
            languages[lang] = {'count': 0, 'issues': 0}
        languages[lang]['count'] += 1
        languages[lang]['issues'] += len(issues)

        # Track patterns
        for issue in issues:
            pattern = issue.get('category', 'general')
            if pattern not in patterns:
                patterns[pattern] = 0
            patterns[pattern] += 1

        # Get complexity if available
        if 'metrics' in results:
            complexity = results['metrics'].get('complexity', 0)
            if complexity:
                complexity_scores.append(complexity)

    # Calculate metrics
    if complexity_scores:
        profile.avg_complexity = sum(complexity_scores) / len(complexity_scores)

    # Calculate language proficiency
    language_proficiency = {}
    for lang, data in languages.items():
        avg_issues = data['issues'] / data['count'] if data['count'] > 0 else 0
        # Lower issues = higher proficiency
        proficiency = max(0, min(100, 100 - (avg_issues * 10)))
        language_proficiency[lang] = {
            'level': _get_proficiency_level(proficiency),
            'score': round(proficiency, 1),
            'reviews': data['count']
        }

    profile.language_proficiency = language_proficiency
    profile.pattern_preferences = patterns
    profile.total_reviews = len(reviews)

    # Identify improvement areas
    improvement_areas = []
    sorted_patterns = sorted(patterns.items(), key=lambda x: x[1], reverse=True)

    for pattern, count in sorted_patterns[:5]:
        improvement_areas.append({
            'area': pattern,
            'priority': min(5, count // 10 + 1),
            'occurrences': count,
            'progress': 0
        })

    profile.improvement_areas = improvement_areas

    # Calculate skill score
    profile.skill_score = _calculate_skill_score(profile)
    profile.experience_level = _get_experience_level(profile.skill_score)

    profile.last_analysis_at = datetime.utcnow()
    db.session.commit()

    # Generate fresh recommendations
    _generate_recommendations(user_id)

    return {
        'status': 'completed',
        'profile': profile.to_dict(),
        'analysis_summary': {
            'reviews_analyzed': len(reviews),
            'total_issues_found': total_issues,
            'languages_used': list(languages.keys()),
            'top_patterns': sorted_patterns[:5]
        }
    }


def _generate_recommendations(user_id: int) -> List[LearningRecommendation]:
    """Generate personalized learning recommendations"""
    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if not profile:
        return []

    # Clear old active recommendations
    LearningRecommendation.query.filter_by(
        user_id=user_id,
        status='active'
    ).delete()

    recommendations = []

    # Generate based on improvement areas
    for area in (profile.improvement_areas or [])[:3]:
        rec = _create_recommendation_for_area(user_id, area)
        if rec:
            recommendations.append(rec)

    # Generate based on language proficiency
    for lang, data in (profile.language_proficiency or {}).items():
        if data.get('score', 0) < 70:
            rec = _create_language_recommendation(user_id, lang, data)
            if rec:
                recommendations.append(rec)

    # Add general best practices if few recommendations
    if len(recommendations) < 3:
        general_recs = _get_general_recommendations(user_id, profile.experience_level)
        recommendations.extend(general_recs[:3 - len(recommendations)])

    db.session.commit()
    return recommendations


def _create_recommendation_for_area(user_id: int, area: Dict) -> Optional[LearningRecommendation]:
    """Create recommendation for specific improvement area"""
    area_name = area.get('area', '')

    # Map areas to recommendations
    recommendations_map = {
        'security': {
            'title': 'Improve Security Practices',
            'description': 'Learn to identify and prevent common security vulnerabilities in your code.',
            'resources': [
                {'type': 'article', 'title': 'OWASP Top 10', 'url': 'https://owasp.org/Top10/'},
                {'type': 'course', 'title': 'Secure Coding Practices', 'url': '#'}
            ],
            'code_examples': [
                {
                    'before': 'query = f"SELECT * FROM users WHERE id = {user_id}"',
                    'after': 'query = "SELECT * FROM users WHERE id = %s"\ncursor.execute(query, (user_id,))',
                    'explanation': 'Use parameterized queries to prevent SQL injection'
                }
            ]
        },
        'performance': {
            'title': 'Optimize Code Performance',
            'description': 'Learn techniques to write faster, more efficient code.',
            'resources': [
                {'type': 'article', 'title': 'Performance Optimization Guide', 'url': '#'},
                {'type': 'tool', 'title': 'Code Profiler', 'url': '#'}
            ],
            'code_examples': [
                {
                    'before': 'result = []\nfor item in items:\n    result.append(item * 2)',
                    'after': 'result = [item * 2 for item in items]',
                    'explanation': 'List comprehensions are faster than append loops'
                }
            ]
        },
        'complexity': {
            'title': 'Reduce Code Complexity',
            'description': 'Learn to write simpler, more maintainable code.',
            'resources': [
                {'type': 'book', 'title': 'Clean Code', 'url': '#'},
                {'type': 'article', 'title': 'Refactoring Patterns', 'url': '#'}
            ],
            'code_examples': []
        },
        'style': {
            'title': 'Improve Code Style',
            'description': 'Write more consistent, readable code following best practices.',
            'resources': [
                {'type': 'guide', 'title': 'Style Guide', 'url': '#'}
            ],
            'code_examples': []
        }
    }

    template = recommendations_map.get(area_name.lower())
    if not template:
        template = {
            'title': f'Improve {area_name.title()} Practices',
            'description': f'Focus on reducing {area_name} issues in your code.',
            'resources': [],
            'code_examples': []
        }

    rec = LearningRecommendation(
        user_id=user_id,
        category=area_name.lower(),
        title=template['title'],
        description=template['description'],
        priority=area.get('priority', 1),
        resources=template['resources'],
        code_examples=template['code_examples']
    )

    db.session.add(rec)
    return rec


def _create_language_recommendation(user_id: int, language: str, data: Dict) -> LearningRecommendation:
    """Create recommendation for language improvement"""
    rec = LearningRecommendation(
        user_id=user_id,
        category='language',
        title=f'Improve {language.title()} Skills',
        description=f'Your {language} code has room for improvement. Focus on language-specific best practices.',
        priority=3,
        resources=[
            {'type': 'guide', 'title': f'{language.title()} Best Practices', 'url': '#'},
            {'type': 'practice', 'title': f'{language.title()} Exercises', 'url': '#'}
        ]
    )

    db.session.add(rec)
    return rec


def _get_general_recommendations(user_id: int, experience_level: str) -> List[LearningRecommendation]:
    """Get general recommendations based on experience level"""
    recommendations = []

    if experience_level == 'beginner':
        recs = [
            ('fundamentals', 'Master Programming Fundamentals', 'Build a strong foundation in programming concepts.'),
            ('testing', 'Learn Unit Testing', 'Write tests to ensure code quality.')
        ]
    elif experience_level == 'intermediate':
        recs = [
            ('patterns', 'Learn Design Patterns', 'Apply proven solutions to common problems.'),
            ('architecture', 'Understand Software Architecture', 'Design better system structures.')
        ]
    else:
        recs = [
            ('advanced', 'Advanced Optimization Techniques', 'Learn advanced performance optimization.'),
            ('leadership', 'Technical Leadership', 'Guide team code quality practices.')
        ]

    for category, title, description in recs:
        rec = LearningRecommendation(
            user_id=user_id,
            category=category,
            title=title,
            description=description,
            priority=2,
            resources=[]
        )
        db.session.add(rec)
        recommendations.append(rec)

    return recommendations


def _generate_learning_path(profile: DeveloperProfile) -> Dict:
    """Generate structured learning path"""
    path = {
        'current_level': profile.experience_level,
        'target_level': _get_next_level(profile.experience_level),
        'estimated_duration': '3-6 months',
        'phases': []
    }

    # Phase 1: Foundation
    phase1 = {
        'name': 'Foundation',
        'duration': '4 weeks',
        'topics': []
    }

    # Add topics based on improvement areas
    for area in (profile.improvement_areas or [])[:2]:
        phase1['topics'].append({
            'name': area['area'].title(),
            'type': 'improvement',
            'priority': area.get('priority', 1)
        })

    path['phases'].append(phase1)

    # Phase 2: Practice
    phase2 = {
        'name': 'Practice',
        'duration': '6 weeks',
        'topics': [
            {'name': 'Code Review Practice', 'type': 'hands-on'},
            {'name': 'Project Work', 'type': 'hands-on'}
        ]
    }
    path['phases'].append(phase2)

    # Phase 3: Advanced
    phase3 = {
        'name': 'Advanced',
        'duration': '4 weeks',
        'topics': [
            {'name': 'Best Practices', 'type': 'theory'},
            {'name': 'Architecture Patterns', 'type': 'theory'}
        ]
    }
    path['phases'].append(phase3)

    return path


def _generate_goal_recommendations(user_id: int, goals: List[Dict]) -> None:
    """Generate recommendations aligned with user goals"""
    for goal in goals:
        category = goal.get('category', 'general')

        rec = LearningRecommendation(
            user_id=user_id,
            category=category,
            title=f"Work towards: {goal['title']}",
            description=f"Resources and exercises to help you achieve your goal: {goal['title']}",
            priority=4,
            resources=[
                {'type': 'exercise', 'title': 'Practice exercises', 'url': '#'}
            ]
        )

        db.session.add(rec)

    db.session.commit()


def _update_skill_on_completion(user_id: int, recommendation: LearningRecommendation) -> None:
    """Update skill progress when recommendation completed"""
    # Record skill progress
    progress = SkillProgress(
        user_id=user_id,
        skill_name=recommendation.category,
        category='recommendation',
        score=100,
        previous_score=recommendation.progress,
        trend='improving',
        improvements=1
    )

    db.session.add(progress)

    # Update profile skill score
    profile = DeveloperProfile.query.filter_by(user_id=user_id).first()
    if profile:
        # Small boost for completing recommendation
        profile.skill_score = min(100, profile.skill_score + 0.5)
        profile.total_issues_fixed += 1


def _generate_insights(profile: DeveloperProfile) -> List[Dict]:
    """Generate AI-powered coding insights"""
    insights = []

    # Insight based on skill score trend
    if profile.skill_score >= 75:
        insights.append({
            'type': 'positive',
            'title': 'Strong Code Quality',
            'message': 'Your code quality is above average. Keep up the great work!',
            'icon': 'star'
        })
    elif profile.skill_score < 50:
        insights.append({
            'type': 'improvement',
            'title': 'Room for Growth',
            'message': 'Focus on the recommended learning areas to improve your code quality.',
            'icon': 'trending-up'
        })

    # Insight based on improvement areas
    if profile.improvement_areas:
        top_area = profile.improvement_areas[0]
        insights.append({
            'type': 'focus',
            'title': f"Focus on {top_area['area'].title()}",
            'message': f"This is your most common issue area with {top_area.get('occurrences', 0)} occurrences.",
            'icon': 'target'
        })

    # Insight based on languages
    if profile.language_proficiency:
        best_lang = max(
            profile.language_proficiency.items(),
            key=lambda x: x[1].get('score', 0)
        )
        insights.append({
            'type': 'strength',
            'title': f'Strong in {best_lang[0].title()}',
            'message': f"You have good proficiency in {best_lang[0]} with a score of {best_lang[1].get('score', 0)}.",
            'icon': 'check-circle'
        })

    return insights


def _calculate_skill_score(profile: DeveloperProfile) -> float:
    """Calculate overall skill score"""
    score = 50.0  # Base score

    # Add points for reviews
    score += min(20, profile.total_reviews * 0.2)

    # Adjust for complexity
    if profile.avg_complexity > 0:
        if profile.avg_complexity < 5:
            score += 10
        elif profile.avg_complexity > 15:
            score -= 10

    # Adjust for documentation
    score += profile.documentation_rate * 10

    # Adjust for test coverage
    score += profile.test_coverage_rate * 10

    return max(0, min(100, score))


def _get_proficiency_level(score: float) -> str:
    """Get proficiency level string from score"""
    if score >= 90:
        return 'expert'
    elif score >= 75:
        return 'advanced'
    elif score >= 50:
        return 'intermediate'
    elif score >= 25:
        return 'beginner'
    else:
        return 'novice'


def _get_experience_level(score: float) -> str:
    """Get experience level from skill score"""
    if score >= 80:
        return 'senior'
    elif score >= 60:
        return 'intermediate'
    else:
        return 'beginner'


def _get_next_level(current_level: str) -> str:
    """Get next experience level"""
    levels = ['beginner', 'intermediate', 'senior', 'expert']
    try:
        idx = levels.index(current_level)
        if idx < len(levels) - 1:
            return levels[idx + 1]
    except ValueError:
        pass
    return 'expert'
