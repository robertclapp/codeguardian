"""
Test cases for authentication functionality
"""
import pytest
import json
from src.main import app
from src.models.user import User
from src.database import db


@pytest.fixture
def client():
    """Create a test client for the Flask application"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


@pytest.fixture
def sample_user_data():
    """Sample user data for testing"""
    return {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'SecurePassword123!',
        'full_name': 'Test User'
    }


class TestAuthRoutes:
    """Test cases for authentication routes"""
    
    def test_register_success(self, client, sample_user_data):
        """Test successful user registration"""
        response = client.post('/api/auth/register', 
                             data=json.dumps(sample_user_data),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'user' in data
        assert data['user']['username'] == sample_user_data['username']
        assert data['user']['email'] == sample_user_data['email']
    
    def test_register_duplicate_email(self, client, sample_user_data):
        """Test registration with duplicate email"""
        # First registration
        client.post('/api/auth/register', 
                   data=json.dumps(sample_user_data),
                   content_type='application/json')
        
        # Second registration with same email
        response = client.post('/api/auth/register', 
                             data=json.dumps(sample_user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'already exists' in data['error'].lower()
    
    def test_register_invalid_email(self, client, sample_user_data):
        """Test registration with invalid email format"""
        sample_user_data['email'] = 'invalid-email'
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(sample_user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_register_weak_password(self, client, sample_user_data):
        """Test registration with weak password"""
        sample_user_data['password'] = '123'
        
        response = client.post('/api/auth/register', 
                             data=json.dumps(sample_user_data),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
        assert 'password' in data['error'].lower()
    
    def test_login_success(self, client, sample_user_data):
        """Test successful login"""
        # Register user first
        client.post('/api/auth/register', 
                   data=json.dumps(sample_user_data),
                   content_type='application/json')
        
        # Login
        login_data = {
            'email': sample_user_data['email'],
            'password': sample_user_data['password']
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'access_token' in data
        assert 'user' in data
    
    def test_login_invalid_credentials(self, client, sample_user_data):
        """Test login with invalid credentials"""
        # Register user first
        client.post('/api/auth/register', 
                   data=json.dumps(sample_user_data),
                   content_type='application/json')
        
        # Login with wrong password
        login_data = {
            'email': sample_user_data['email'],
            'password': 'wrongpassword'
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_login_nonexistent_user(self, client):
        """Test login with non-existent user"""
        login_data = {
            'email': 'nonexistent@example.com',
            'password': 'password123'
        }
        
        response = client.post('/api/auth/login', 
                             data=json.dumps(login_data),
                             content_type='application/json')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_protected_route_without_token(self, client):
        """Test accessing protected route without token"""
        response = client.get('/api/auth/profile')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_protected_route_with_valid_token(self, client, sample_user_data):
        """Test accessing protected route with valid token"""
        # Register and login
        register_response = client.post('/api/auth/register', 
                                      data=json.dumps(sample_user_data),
                                      content_type='application/json')
        
        token = json.loads(register_response.data)['access_token']
        
        # Access protected route
        headers = {'Authorization': f'Bearer {token}'}
        response = client.get('/api/auth/profile', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'user' in data
        assert data['user']['email'] == sample_user_data['email']
    
    def test_protected_route_with_invalid_token(self, client):
        """Test accessing protected route with invalid token"""
        headers = {'Authorization': 'Bearer invalid_token'}
        response = client.get('/api/auth/profile', headers=headers)
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_logout(self, client, sample_user_data):
        """Test user logout"""
        # Register and login
        register_response = client.post('/api/auth/register', 
                                      data=json.dumps(sample_user_data),
                                      content_type='application/json')
        
        token = json.loads(register_response.data)['access_token']
        
        # Logout
        headers = {'Authorization': f'Bearer {token}'}
        response = client.post('/api/auth/logout', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        
        # Try to access protected route with logged out token
        response = client.get('/api/auth/profile', headers=headers)
        assert response.status_code == 401


class TestUserModel:
    """Test cases for User model"""
    
    def test_user_creation(self, client, sample_user_data):
        """Test user model creation"""
        with app.app_context():
            db.create_all()
            
            user = User(
                username=sample_user_data['username'],
                email=sample_user_data['email'],
                full_name=sample_user_data['full_name']
            )
            user.set_password(sample_user_data['password'])
            
            db.session.add(user)
            db.session.commit()
            
            # Verify user was created
            saved_user = User.query.filter_by(email=sample_user_data['email']).first()
            assert saved_user is not None
            assert saved_user.username == sample_user_data['username']
            assert saved_user.email == sample_user_data['email']
            assert saved_user.check_password(sample_user_data['password'])
            assert not saved_user.check_password('wrongpassword')
    
    def test_user_password_hashing(self, client):
        """Test password hashing functionality"""
        with app.app_context():
            db.create_all()
            
            user = User(username='testuser', email='test@example.com')
            password = 'SecurePassword123!'
            user.set_password(password)
            
            # Password should be hashed, not stored in plain text
            assert user.password_hash != password
            assert user.check_password(password)
            assert not user.check_password('wrongpassword')
    
    def test_user_to_dict(self, client, sample_user_data):
        """Test user serialization to dictionary"""
        with app.app_context():
            db.create_all()
            
            user = User(
                username=sample_user_data['username'],
                email=sample_user_data['email'],
                full_name=sample_user_data['full_name']
            )
            user.set_password(sample_user_data['password'])
            
            user_dict = user.to_dict()
            
            assert 'id' in user_dict
            assert user_dict['username'] == sample_user_data['username']
            assert user_dict['email'] == sample_user_data['email']
            assert user_dict['full_name'] == sample_user_data['full_name']
            assert 'password_hash' not in user_dict  # Should not expose password hash
            assert 'created_at' in user_dict
            assert 'updated_at' in user_dict


if __name__ == '__main__':
    pytest.main([__file__])

