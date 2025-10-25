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
from src.config import get_config

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))

# Load configuration
config_class = get_config()
app.config.from_object(config_class)

# Initialize JWT
jwt = JWTManager(app)

# Enable CORS for all routes
CORS(app, origins="*", allow_headers=["Content-Type", "Authorization"])

# Initialize database
db.init_app(app)

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api/users')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(repositories_bp, url_prefix='/api/repositories')
app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
app.register_blueprint(enhanced_reviews_bp, url_prefix='/api/enhanced-reviews')

# Import all models to ensure they're created
from src.models.repository import Repository, PullRequest
from src.models.review import Review, ReviewComment, MentorshipSession

with app.app_context():
    db.create_all()

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
