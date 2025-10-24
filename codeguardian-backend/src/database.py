"""
Database configuration and initialization for CodeGuardian
"""

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy instance
db = SQLAlchemy()

def init_database(app):
    """Initialize database with Flask app"""
    db.init_app(app)
    
    with app.app_context():
        # Import all models to ensure they're registered
        from models.user import User
        from models.repository import Repository
        from models.review import Review
        
        # Create all tables
        db.create_all()
        
        print("Database initialized successfully")

def reset_database(app):
    """Reset database (drop and recreate all tables)"""
    with app.app_context():
        db.drop_all()
        db.create_all()
        print("Database reset successfully")

