import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from src.database import db
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.repositories import repositories_bp
from src.routes.reviews import reviews_bp
from src.routes.enhanced_reviews import enhanced_reviews_bp
from src.routes.analytics import analytics_bp
from src.routes.fixes import fixes_bp
from src.routes.snippets import snippets_bp
from src.routes.webhooks import webhooks_bp
from src.routes.rules import rules_bp
from src.routes.explanations import explanations_bp
from src.routes.health import health_bp
from src.routes.teams import teams_bp
from src.routes.notifications import notifications_bp
from src.routes.audit import audit_bp
from src.routes.ai import ai_bp
from src.routes.marketplace import marketplace_bp
from src.routes.dashboards import dashboards_bp
from src.routes.mentor import mentor_bp
from src.routes.predictor import predictor_bp
from src.routes.hooks import hooks_bp
from src.routes.productivity import productivity_bp
from src.routes.scheduler import scheduler_bp
from src.routes.templates import templates_bp
from src.routes.social import social_bp
from src.routes.comparisons import comparisons_bp
from src.routes.summaries import summaries_bp
from src.routes.suggestions import suggestions_bp
from src.config import get_config
from src.middleware import init_rate_limiting, init_csrf_protection

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Load configuration
config_class = get_config()
app.config.from_object(config_class)

# Initialize configuration
config_class.init_app(app)

# Initialize JWT
jwt = JWTManager(app)

# Configure CORS with environment-based origins
cors_origins = app.config.get('CORS_ORIGINS', ['http://localhost:3000'])
CORS(
    app,
    origins=cors_origins,
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    supports_credentials=True,
    max_age=3600  # Cache preflight requests for 1 hour
)

# Initialize database
db.init_app(app)

# Initialize security middleware
init_rate_limiting(app)
init_csrf_protection(app)

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api/users')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(repositories_bp, url_prefix='/api/repositories')
app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
app.register_blueprint(enhanced_reviews_bp, url_prefix='/api/enhanced-reviews')
app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
app.register_blueprint(fixes_bp, url_prefix='/api')
app.register_blueprint(snippets_bp, url_prefix='/api')
app.register_blueprint(webhooks_bp, url_prefix='/api')
app.register_blueprint(rules_bp, url_prefix='/api')
app.register_blueprint(explanations_bp, url_prefix='/api')
app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(teams_bp, url_prefix='/api')
app.register_blueprint(notifications_bp, url_prefix='/api')
app.register_blueprint(audit_bp, url_prefix='/api')
app.register_blueprint(ai_bp, url_prefix='/api')
app.register_blueprint(marketplace_bp, url_prefix='/api')
app.register_blueprint(dashboards_bp, url_prefix='/api')
app.register_blueprint(mentor_bp, url_prefix='/api')
app.register_blueprint(predictor_bp, url_prefix='/api')
app.register_blueprint(hooks_bp, url_prefix='/api')
app.register_blueprint(productivity_bp, url_prefix='/api')
app.register_blueprint(scheduler_bp, url_prefix='/api')
app.register_blueprint(templates_bp, url_prefix='/api')
app.register_blueprint(social_bp, url_prefix='/api')
app.register_blueprint(comparisons_bp, url_prefix='/api')
app.register_blueprint(summaries_bp, url_prefix='/api')
app.register_blueprint(suggestions_bp, url_prefix='/api')

# Import all models to ensure they're created
from src.models.repository import Repository, PullRequest
from src.models.review import Review, ReviewComment, MentorshipSession
from src.models.collaboration import (
    Team, TeamMember, TeamInvitation, TeamActivity,
    Notification, NotificationPreference, AuditLog,
    Discussion, DiscussionReaction, ReviewApproval
)
from src.routes.mentor import DeveloperProfile, LearningRecommendation, SkillProgress
from src.routes.predictor import PredictionRecord
from src.routes.hooks import HookConfiguration, HookExecution
from src.routes.productivity import AutoFixHistory, IgnoreRule, QuickAction
from src.routes.scheduler import ScheduledReview, ScheduleExecution
from src.routes.templates import ReviewTemplate, TemplateUsage
from src.routes.social import ReviewReaction, Kudos, CodeComment, PairReviewSession
from src.routes.comparisons import QualityAlert
from src.routes.summaries import GeneratedSummary
from src.routes.suggestions import ReviewCard, CodeSuggestion

with app.app_context():
    db.create_all()


# Health check endpoints for monitoring
@app.route('/health')
def health_check():
    """
    Basic health check endpoint.
    Returns 200 if the service is running.
    """
    return {'status': 'healthy', 'service': 'codeguardian-api'}, 200


@app.route('/health/ready')
def readiness_check():
    """
    Readiness check - verifies database connectivity.
    Returns 200 if service is ready to accept traffic.
    """
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        return {
            'status': 'ready',
            'database': 'connected',
            'service': 'codeguardian-api'
        }, 200
    except Exception as e:
        return {
            'status': 'not_ready',
            'database': 'disconnected',
            'error': str(e)
        }, 503


@app.route('/health/live')
def liveness_check():
    """
    Liveness check for container orchestration.
    Returns 200 if the process is alive.
    """
    return {'status': 'alive'}, 200


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
