"""
CodeGuardian Main Application - Render Optimized
Entry point for the CodeGuardian Flask application on Render
"""
import os
import sys

# Add src directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.middleware.proxy_fix import ProxyFix

# Import configuration
from config import get_config

# Import database
from database import db

# Import routes
from routes.auth import auth_bp
from routes.repositories import repositories_bp
from routes.reviews import reviews_bp

# Import models to ensure they're registered
from models.user import User
from models.repository import Repository
from models.review import Review

# Import utilities
from utils.debugging import create_debug_middleware


def create_app(config_name=None):
    """Application factory pattern for Render deployment"""
    
    # Create Flask app with static folder for frontend
    static_folder = os.path.join(os.path.dirname(__file__), '..', 'static')
    app = Flask(__name__, static_folder=static_folder)
    
    # Load configuration
    if config_name is None:
        config_class = get_config()
    else:
        from config import config
        config_class = config[config_name]
    
    app.config.from_object(config_class)
    config_class.init_app(app)
    
    # Trust proxy headers (important for Render)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Initialize extensions
    CORS(app, 
         origins=app.config.get('CORS_ORIGINS', ['*']),
         allow_headers=["Content-Type", "Authorization"],
         supports_credentials=True)
    
    jwt = JWTManager(app)
    db.init_app(app)
    
    # Register API blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(repositories_bp, url_prefix='/api/repositories')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    
    # Add debugging and monitoring middleware
    if app.config.get('ENABLE_METRICS', True):
        create_debug_middleware(app)
    
    # API Routes
    @app.route('/api')
    def api_info():
        """API information endpoint"""
        return jsonify({
            'name': 'CodeGuardian API',
            'version': '1.0.0',
            'status': 'running',
            'environment': os.getenv('FLASK_ENV', 'production'),
            'endpoints': {
                'auth': '/api/auth',
                'repositories': '/api/repositories',
                'reviews': '/api/reviews',
                'health': '/health'
            }
        })
    
    @app.route('/health')
    def health_check():
        """Health check endpoint for Render"""
        try:
            # Test database connection
            with app.app_context():
                db.engine.execute('SELECT 1')
            
            return jsonify({
                'status': 'healthy',
                'service': 'codeguardian-api',
                'version': '1.0.0',
                'environment': os.getenv('FLASK_ENV', 'production'),
                'database': 'connected',
                'timestamp': os.getenv('RENDER_GIT_COMMIT', 'unknown')
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'service': 'codeguardian-api',
                'error': str(e),
                'database': 'disconnected'
            }), 503
    
    # Frontend Routes (for SPA)
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        """Serve frontend static files or index.html for SPA routing"""
        
        # If no static folder is configured, return API info
        if not app.static_folder or not os.path.exists(app.static_folder):
            return jsonify({
                'message': 'CodeGuardian API Server',
                'version': '1.0.0',
                'frontend': 'not_deployed',
                'api_docs': '/api',
                'health': '/health'
            })
        
        # Serve static files
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        
        # Serve index.html for SPA routing
        index_path = os.path.join(app.static_folder, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(app.static_folder, 'index.html')
        
        # Fallback to API info if no frontend
        return jsonify({
            'message': 'CodeGuardian API Server',
            'version': '1.0.0',
            'frontend': 'not_found',
            'api_docs': '/api',
            'health': '/health'
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


# Create the application instance
app = create_app()


def init_database():
    """Initialize database tables"""
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {e}")


if __name__ == '__main__':
    # Initialize database
    init_database()
    
    # Get port from environment (Render sets this)
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"Starting CodeGuardian API on port {port}")
    print(f"Environment: {os.getenv('FLASK_ENV', 'production')}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

