"""
Test cases for repository management functionality
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from src.main import app
from src.models.user import User
from src.models.repository import Repository
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
def authenticated_user(client):
    """Create and authenticate a test user"""
    user_data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'SecurePassword123!',
        'full_name': 'Test User'
    }
    
    response = client.post('/api/auth/register', 
                         data=json.dumps(user_data),
                         content_type='application/json')
    
    token = json.loads(response.data)['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    return headers, user_data


class TestRepositoryRoutes:
    """Test cases for repository routes"""
    
    def test_get_repositories_empty(self, client, authenticated_user):
        """Test getting repositories when none exist"""
        headers, _ = authenticated_user
        
        response = client.get('/api/repositories', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repositories' in data
        assert len(data['repositories']) == 0
    
    @patch('requests.get')
    def test_connect_repository_success(self, mock_get, client, authenticated_user):
        """Test successful repository connection"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python',
            'stargazers_count': 10,
            'forks_count': 2
        }
        mock_get.return_value = mock_response
        
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        response = client.post('/api/repositories/connect', 
                             data=json.dumps(repo_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'repository' in data
        assert data['repository']['name'] == 'test-repo'
        assert data['repository']['full_name'] == 'testuser/test-repo'
        assert data['repository']['platform'] == 'github'
    
    def test_connect_repository_invalid_url(self, client, authenticated_user):
        """Test repository connection with invalid URL"""
        headers, _ = authenticated_user
        
        repo_data = {
            'platform': 'github',
            'repo_url': 'invalid-url',
            'access_token': 'test_token'
        }
        
        response = client.post('/api/repositories/connect', 
                             data=json.dumps(repo_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_connect_repository_missing_token(self, client, authenticated_user):
        """Test repository connection without access token"""
        headers, _ = authenticated_user
        
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo'
            # Missing access_token
        }
        
        response = client.post('/api/repositories/connect', 
                             data=json.dumps(repo_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('requests.get')
    def test_connect_repository_duplicate(self, mock_get, client, authenticated_user):
        """Test connecting the same repository twice"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python'
        }
        mock_get.return_value = mock_response
        
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        # First connection
        response1 = client.post('/api/repositories/connect', 
                              data=json.dumps(repo_data),
                              content_type='application/json',
                              headers=headers)
        assert response1.status_code == 201
        
        # Second connection (should fail)
        response2 = client.post('/api/repositories/connect', 
                              data=json.dumps(repo_data),
                              content_type='application/json',
                              headers=headers)
        assert response2.status_code == 400
        data = json.loads(response2.data)
        assert 'error' in data
        assert 'already connected' in data['error'].lower()
    
    @patch('requests.get')
    def test_get_repositories_with_data(self, mock_get, client, authenticated_user):
        """Test getting repositories after connecting some"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python'
        }
        mock_get.return_value = mock_response
        
        # Connect a repository first
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        client.post('/api/repositories/connect', 
                   data=json.dumps(repo_data),
                   content_type='application/json',
                   headers=headers)
        
        # Get repositories
        response = client.get('/api/repositories', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repositories' in data
        assert len(data['repositories']) == 1
        assert data['repositories'][0]['name'] == 'test-repo'
    
    @patch('requests.get')
    def test_get_repository_by_id(self, mock_get, client, authenticated_user):
        """Test getting a specific repository by ID"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python'
        }
        mock_get.return_value = mock_response
        
        # Connect a repository first
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        connect_response = client.post('/api/repositories/connect', 
                                     data=json.dumps(repo_data),
                                     content_type='application/json',
                                     headers=headers)
        
        repo_id = json.loads(connect_response.data)['repository']['id']
        
        # Get the repository
        response = client.get(f'/api/repositories/{repo_id}', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repository' in data
        assert data['repository']['id'] == repo_id
        assert data['repository']['name'] == 'test-repo'
    
    def test_get_repository_not_found(self, client, authenticated_user):
        """Test getting a non-existent repository"""
        headers, _ = authenticated_user
        
        response = client.get('/api/repositories/999', headers=headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('requests.get')
    def test_update_repository_settings(self, mock_get, client, authenticated_user):
        """Test updating repository settings"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python'
        }
        mock_get.return_value = mock_response
        
        # Connect a repository first
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        connect_response = client.post('/api/repositories/connect', 
                                     data=json.dumps(repo_data),
                                     content_type='application/json',
                                     headers=headers)
        
        repo_id = json.loads(connect_response.data)['repository']['id']
        
        # Update settings
        settings_data = {
            'is_enabled': False,
            'auto_review': False,
            'security_scan': True
        }
        
        response = client.put(f'/api/repositories/{repo_id}/settings', 
                            data=json.dumps(settings_data),
                            content_type='application/json',
                            headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repository' in data
        assert data['repository']['is_enabled'] == False
    
    @patch('requests.get')
    def test_disconnect_repository(self, mock_get, client, authenticated_user):
        """Test disconnecting a repository"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Test repository',
            'private': False,
            'language': 'Python'
        }
        mock_get.return_value = mock_response
        
        # Connect a repository first
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        connect_response = client.post('/api/repositories/connect', 
                                     data=json.dumps(repo_data),
                                     content_type='application/json',
                                     headers=headers)
        
        repo_id = json.loads(connect_response.data)['repository']['id']
        
        # Disconnect the repository
        response = client.delete(f'/api/repositories/{repo_id}', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'message' in data
        
        # Verify repository is deleted
        get_response = client.get(f'/api/repositories/{repo_id}', headers=headers)
        assert get_response.status_code == 404
    
    @patch('requests.get')
    def test_sync_repository(self, mock_get, client, authenticated_user):
        """Test syncing repository data"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'id': 123456,
            'name': 'test-repo',
            'full_name': 'testuser/test-repo',
            'description': 'Updated description',
            'private': False,
            'language': 'Python',
            'stargazers_count': 15,  # Updated count
            'forks_count': 3
        }
        mock_get.return_value = mock_response
        
        # Connect a repository first
        repo_data = {
            'platform': 'github',
            'repo_url': 'https://github.com/testuser/test-repo',
            'access_token': 'test_token'
        }
        
        connect_response = client.post('/api/repositories/connect', 
                                     data=json.dumps(repo_data),
                                     content_type='application/json',
                                     headers=headers)
        
        repo_id = json.loads(connect_response.data)['repository']['id']
        
        # Sync the repository
        response = client.post(f'/api/repositories/{repo_id}/sync', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repository' in data
        assert data['repository']['description'] == 'Updated description'
        assert data['repository']['stars_count'] == 15
    
    @patch('requests.get')
    def test_discover_repositories(self, mock_get, client, authenticated_user):
        """Test discovering repositories from GitHub"""
        headers, _ = authenticated_user
        
        # Mock GitHub API response for user repositories
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                'id': 123456,
                'name': 'repo1',
                'full_name': 'testuser/repo1',
                'description': 'First repository',
                'private': False,
                'language': 'Python'
            },
            {
                'id': 123457,
                'name': 'repo2',
                'full_name': 'testuser/repo2',
                'description': 'Second repository',
                'private': True,
                'language': 'JavaScript'
            }
        ]
        mock_get.return_value = mock_response
        
        discover_data = {
            'platform': 'github',
            'access_token': 'test_token'
        }
        
        response = client.post('/api/repositories/discover', 
                             data=json.dumps(discover_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'repositories' in data
        assert len(data['repositories']) == 2
        assert data['repositories'][0]['name'] == 'repo1'
        assert data['repositories'][1]['name'] == 'repo2'


class TestRepositoryModel:
    """Test cases for Repository model"""
    
    def test_repository_creation(self, client):
        """Test repository model creation"""
        with app.app_context():
            db.create_all()
            
            # Create user first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            # Create repository
            repository = Repository(
                name='test-repo',
                full_name='testuser/test-repo',
                platform='github',
                user_id=user.id,
                description='Test repository',
                language='Python',
                is_private=False
            )
            db.session.add(repository)
            db.session.commit()
            
            # Verify repository was created
            saved_repo = Repository.query.filter_by(name='test-repo').first()
            assert saved_repo is not None
            assert saved_repo.full_name == 'testuser/test-repo'
            assert saved_repo.platform == 'github'
            assert saved_repo.user_id == user.id
            assert saved_repo.is_enabled == True  # Default value
    
    def test_repository_to_dict(self, client):
        """Test repository serialization to dictionary"""
        with app.app_context():
            db.create_all()
            
            # Create user first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            # Create repository
            repository = Repository(
                name='test-repo',
                full_name='testuser/test-repo',
                platform='github',
                user_id=user.id,
                description='Test repository',
                language='Python',
                is_private=False,
                stars_count=10,
                forks_count=2
            )
            db.session.add(repository)
            db.session.commit()
            
            repo_dict = repository.to_dict()
            
            assert 'id' in repo_dict
            assert repo_dict['name'] == 'test-repo'
            assert repo_dict['full_name'] == 'testuser/test-repo'
            assert repo_dict['platform'] == 'github'
            assert repo_dict['description'] == 'Test repository'
            assert repo_dict['language'] == 'Python'
            assert repo_dict['is_private'] == False
            assert repo_dict['stars_count'] == 10
            assert repo_dict['forks_count'] == 2
            assert 'created_at' in repo_dict
            assert 'updated_at' in repo_dict


if __name__ == '__main__':
    pytest.main([__file__])

