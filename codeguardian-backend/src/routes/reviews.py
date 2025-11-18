from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from datetime import datetime, timedelta
import json
import time
import logging
from src.database import db
from src.models.repository import Repository, PullRequest
from src.models.review import Review, ReviewComment, MentorshipSession
from src.routes.auth import require_auth
from src.services.ai_service import AIService

logger = logging.getLogger(__name__)

reviews_bp = Blueprint('reviews', __name__)
ai_service = AIService()

@reviews_bp.route('/', methods=['GET'])
@cross_origin()
@require_auth
def get_reviews():
    """Get reviews for the current user"""
    try:
        user = request.current_user
        
        # Query parameters
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = int(request.args.get('offset', 0))
        status = request.args.get('status')  # pending, completed, failed
        repo_id = request.args.get('repository_id')
        
        # Build query
        query = db.session.query(Review).join(PullRequest).join(Repository).filter(
            Repository.user_id == user.id
        )
        
        if status:
            query = query.filter(Review.status == status)
        
        if repo_id:
            query = query.filter(Repository.id == repo_id)
        
        reviews = query.order_by(Review.created_at.desc()).offset(offset).limit(limit).all()
        
        return jsonify({
            'reviews': [review.to_dict() for review in reviews],
            'total': query.count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reviews_bp.route('/<int:review_id>', methods=['GET'])
@cross_origin()
@require_auth
def get_review(review_id):
    """Get a specific review with comments"""
    try:
        user = request.current_user
        
        # Get review with user permission check
        review = db.session.query(Review).join(PullRequest).join(Repository).filter(
            Review.id == review_id,
            Repository.user_id == user.id
        ).first()
        
        if not review:
            return jsonify({'error': 'Review not found'}), 404
        
        # Get comments for this review
        comments = ReviewComment.query.filter_by(review_id=review.id).all()
        
        review_data = review.to_dict()
        review_data['comments'] = [comment.to_dict() for comment in comments]
        
        return jsonify({
            'review': review_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reviews_bp.route('/trigger', methods=['POST'])
@cross_origin()
@require_auth
def trigger_review():
    """Manually trigger a code review for a pull request"""
    try:
        data = request.get_json()
        user = request.current_user
        
        pr_id = data.get('pull_request_id')
        review_type = data.get('review_type', 'full_review')
        
        if not pr_id:
            return jsonify({'error': 'pull_request_id is required'}), 400
        
        # Get pull request with permission check
        pull_request = db.session.query(PullRequest).join(Repository).filter(
            PullRequest.id == pr_id,
            Repository.user_id == user.id
        ).first()
        
        if not pull_request:
            return jsonify({'error': 'Pull request not found'}), 404
        
        # Check if review already exists and is in progress
        existing_review = Review.query.filter_by(
            pull_request_id=pr_id,
            status='in_progress'
        ).first()
        
        if existing_review:
            return jsonify({'error': 'Review already in progress'}), 409
        
        # Create new review
        review = Review(
            review_type=review_type,
            status='pending',
            pull_request_id=pr_id,
            reviewer_id=user.id
        )
        
        db.session.add(review)
        db.session.commit()
        
        # Start AI review process (async in production)
        try:
            review = _process_review(review.id)
        except Exception as e:
            # Update review status to failed
            review.status = 'failed'
            db.session.commit()
            return jsonify({'error': f'Review processing failed: {str(e)}'}), 500
        
        return jsonify({
            'message': 'Review triggered successfully',
            'review': review.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _process_review(review_id):
    """Process a review using AI service"""
    start_time = time.time()
    
    review = Review.query.get(review_id)
    if not review:
        raise Exception('Review not found')
    
    # Update status to in_progress
    review.status = 'in_progress'
    db.session.commit()
    
    try:
        # Get pull request and repository data
        pull_request = review.pull_request
        repository = pull_request.repository
        
        # Mock AI analysis (replace with actual AI service call)
        ai_result = ai_service.analyze_pull_request(
            repository_url=repository.clone_url,
            pr_number=pull_request.number,
            pr_title=pull_request.title,
            pr_description=pull_request.description
        )
        
        # Update review with AI results
        review.overall_score = ai_result.get('overall_score', 85.0)
        review.security_score = ai_result.get('security_score', 90.0)
        review.performance_score = ai_result.get('performance_score', 80.0)
        review.maintainability_score = ai_result.get('maintainability_score', 88.0)
        review.summary = ai_result.get('summary', 'AI analysis completed successfully')
        review.set_recommendations(ai_result.get('recommendations', []))
        review.ai_model_used = ai_result.get('model_used', 'gpt-4')
        review.tokens_used = ai_result.get('tokens_used', 1500)
        review.processing_time_ms = int((time.time() - start_time) * 1000)
        review.status = 'completed'
        review.completed_at = datetime.utcnow()
        
        # Create review comments
        comments_data = ai_result.get('comments', [])
        for comment_data in comments_data:
            comment = ReviewComment(
                file_path=comment_data.get('file_path', ''),
                line_number=comment_data.get('line_number'),
                comment_type=comment_data.get('type', 'suggestion'),
                severity=comment_data.get('severity', 'medium'),
                category=comment_data.get('category', 'general'),
                title=comment_data.get('title', ''),
                message=comment_data.get('message', ''),
                suggested_fix=comment_data.get('suggested_fix'),
                original_code=comment_data.get('original_code'),
                suggested_code=comment_data.get('suggested_code'),
                review_id=review.id
            )
            db.session.add(comment)
        
        db.session.commit()
        
        return review
        
    except Exception as e:
        review.status = 'failed'
        db.session.commit()
        raise e

@reviews_bp.route('/comments/<int:comment_id>/feedback', methods=['POST'])
@cross_origin()
@require_auth
def provide_comment_feedback(comment_id):
    """Provide feedback on a review comment"""
    try:
        data = request.get_json()
        user = request.current_user
        
        feedback = data.get('feedback')  # helpful, not_helpful, applied
        
        if feedback not in ['helpful', 'not_helpful', 'applied']:
            return jsonify({'error': 'Invalid feedback value'}), 400
        
        # Get comment with permission check
        comment = db.session.query(ReviewComment).join(Review).join(PullRequest).join(Repository).filter(
            ReviewComment.id == comment_id,
            Repository.user_id == user.id
        ).first()
        
        if not comment:
            return jsonify({'error': 'Comment not found'}), 404
        
        comment.user_feedback = feedback
        
        if feedback == 'applied':
            comment.is_resolved = True
            comment.resolved_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'message': 'Feedback recorded successfully',
            'comment': comment.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reviews_bp.route('/stats', methods=['GET'])
@cross_origin()
@require_auth
def get_review_stats():
    """Get review statistics for the current user"""
    try:
        user = request.current_user
        
        # Get date range
        days = int(request.args.get('days', 30))
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build base query
        base_query = db.session.query(Review).join(PullRequest).join(Repository).filter(
            Repository.user_id == user.id,
            Review.created_at >= start_date
        )
        
        # Calculate statistics
        total_reviews = base_query.count()
        completed_reviews = base_query.filter(Review.status == 'completed').count()
        failed_reviews = base_query.filter(Review.status == 'failed').count()
        
        # Average scores
        avg_scores = db.session.query(
            db.func.avg(Review.overall_score).label('avg_overall'),
            db.func.avg(Review.security_score).label('avg_security'),
            db.func.avg(Review.performance_score).label('avg_performance'),
            db.func.avg(Review.maintainability_score).label('avg_maintainability')
        ).filter(
            Review.id.in_(base_query.filter(Review.status == 'completed').with_entities(Review.id))
        ).first()
        
        # Comment statistics
        comment_stats = db.session.query(
            ReviewComment.severity,
            db.func.count(ReviewComment.id).label('count')
        ).join(Review).filter(
            Review.id.in_(base_query.with_entities(Review.id))
        ).group_by(ReviewComment.severity).all()
        
        return jsonify({
            'total_reviews': total_reviews,
            'completed_reviews': completed_reviews,
            'failed_reviews': failed_reviews,
            'success_rate': (completed_reviews / total_reviews * 100) if total_reviews > 0 else 0,
            'average_scores': {
                'overall': float(avg_scores.avg_overall or 0),
                'security': float(avg_scores.avg_security or 0),
                'performance': float(avg_scores.avg_performance or 0),
                'maintainability': float(avg_scores.avg_maintainability or 0)
            },
            'comment_severity_distribution': {
                stat.severity: stat.count for stat in comment_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reviews_bp.route('/mentorship/sessions', methods=['GET'])
@cross_origin()
@require_auth
def get_mentorship_sessions():
    """Get mentorship sessions for the current user"""
    try:
        user = request.current_user
        
        # Query parameters
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = int(request.args.get('offset', 0))
        status = request.args.get('status')
        topic = request.args.get('topic')
        
        query = MentorshipSession.query.filter_by(user_id=user.id)
        
        if status:
            query = query.filter_by(status=status)
        
        if topic:
            query = query.filter_by(topic=topic)
        
        sessions = query.order_by(MentorshipSession.created_at.desc()).offset(offset).limit(limit).all()
        
        return jsonify({
            'sessions': [session.to_dict() for session in sessions],
            'total': query.count()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reviews_bp.route('/mentorship/generate', methods=['POST'])
@cross_origin()
@require_auth
def generate_mentorship_session():
    """Generate a personalized mentorship session"""
    try:
        data = request.get_json()
        user = request.current_user
        
        topic = data.get('topic')
        difficulty_level = data.get('difficulty_level', 'intermediate')
        
        if not topic:
            return jsonify({'error': 'Topic is required'}), 400
        
        # Generate mentorship content using AI
        session_content = ai_service.generate_mentorship_session(
            user_profile=user.to_dict(),
            topic=topic,
            difficulty_level=difficulty_level
        )
        
        # Create mentorship session
        session = MentorshipSession(
            session_type='learning_path',
            topic=topic,
            difficulty_level=difficulty_level,
            title=session_content.get('title', f'Learning Session: {topic}'),
            description=session_content.get('description'),
            user_id=user.id
        )
        
        session.set_learning_objectives(session_content.get('learning_objectives', []))
        session.set_content(session_content.get('content', {}))
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'message': 'Mentorship session generated successfully',
            'session': session.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

