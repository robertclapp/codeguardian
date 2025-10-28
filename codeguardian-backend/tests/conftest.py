"""
Pytest configuration and fixtures for CodeGuardian tests
"""

import pytest
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main import app as flask_app
from src.database import db as _db


@pytest.fixture(scope='session')
def app():
    """Create application for testing"""
    # Set testing configuration
    flask_app.config['TESTING'] = True
    flask_app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    flask_app.config['WTF_CSRF_ENABLED'] = False  # Disable CSRF for testing
    flask_app.config['RATE_LIMIT'] = None  # Disable rate limiting for testing
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
