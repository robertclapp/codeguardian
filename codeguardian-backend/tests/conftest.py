"""
Pytest configuration and fixtures for CodeGuardian tests

Provides common fixtures for testing API endpoints.
"""

import pytest
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main import app as flask_app
from src.database import db as _db
from src.models.user import User


@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    # Set testing configuration
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['WTF_CSRF_ENABLED'] = False
    flask_app.config['RATE_LIMIT'] = None
    flask_app.config['JWT_SECRET_KEY'] = 'test-secret-key'
    flask_app.config['SECRET_KEY'] = 'test-secret-key'

    yield flask_app


@pytest.fixture(scope='function')
def db(app):
    """Create database for testing"""
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.remove()
        _db.drop_all()


@pytest.fixture(scope='function')
def client(app, db):
    """Create test client"""
    return app.test_client()


@pytest.fixture(scope='function')
def runner(app):
    """Create test CLI runner"""
    return app.test_cli_runner()


@pytest.fixture(scope='function')
def test_user(app, db):
    """Create a test user"""
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        if not user:
            user = User(
                username='testuser',
                email='test@example.com',
                password_hash='hashed_password'
            )
            _db.session.add(user)
            _db.session.commit()
            _db.session.refresh(user)
        return user


@pytest.fixture(scope='function')
def auth_headers(app, test_user):
    """Create authentication headers with JWT token"""
    from flask_jwt_extended import create_access_token

    with app.app_context():
        access_token = create_access_token(identity=test_user.id)
        return {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }


# Pytest configuration

def pytest_configure(config):
    """Configure pytest markers"""
    config.addinivalue_line("markers", "slow: marks tests as slow")
    config.addinivalue_line("markers", "integration: marks integration tests")
    config.addinivalue_line("markers", "security: marks security tests")
