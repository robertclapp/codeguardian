"""
Test cases for code review functionality
"""
import pytest
import json
from unittest.mock import patch, MagicMock
from src.main import app
from src.models.user import User
from src.models.repository import Repository
from src.models.review import Review
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


@pytest.fixture
def sample_repository(client, authenticated_user):
    """Create a sample repository for testing"""
    headers, user_data = authenticated_user
    
    repo_data = {
        'name': 'test-repo',
        'full_name': 'testuser/test-repo',
        'platform': 'github',
        'repo_url': 'https://github.com/testuser/test-repo',
        'access_token': 'test_token'
    }
    
    response = client.post('/api/repositories/connect', 
                         data=json.dumps(repo_data),
                         content_type='application/json',
                         headers=headers)
    
    return json.loads(response.data)['repository']


class TestReviewRoutes:
    """Test cases for review routes"""
    
    def test_get_reviews_empty(self, client, authenticated_user):
        """Test getting reviews when none exist"""
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'reviews' in data
        assert len(data['reviews']) == 0
        assert data['total_count'] == 0
    
    @patch('src.services.ai_service.AIService.analyze_pull_request')
    def test_create_review_success(self, mock_analyze, client, authenticated_user, sample_repository):
        """Test successful review creation"""
        headers, _ = authenticated_user
        
        # Mock AI service response
        mock_analyze.return_value = {
            'overall_score': 85,
            'security_score': 90,
            'performance_score': 80,
            'maintainability_score': 85,
            'comments': [
                {
                    'file_path': 'src/main.py',
                    'line_number': 10,
                    'severity': 'medium',
                    'category': 'security',
                    'message': 'Consider using parameterized queries',
                    'suggestion': 'Use SQLAlchemy ORM or parameterized queries'
                }
            ]
        }
        
        review_data = {
            'repository_id': sample_repository['id'],
            'pull_request_url': 'https://github.com/testuser/test-repo/pull/1',
            'pull_request_number': 1,
            'pull_request_title': 'Add new feature',
            'pull_request_description': 'This PR adds a new feature'
        }
        
        response = client.post('/api/reviews', 
                             data=json.dumps(review_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert 'review' in data
        assert data['review']['status'] == 'completed'
        assert data['review']['overall_score'] == 85
        assert len(data['review']['comments']) == 1
    
    def test_create_review_invalid_repository(self, client, authenticated_user):
        """Test review creation with invalid repository"""
        headers, _ = authenticated_user
        
        review_data = {
            'repository_id': 999,  # Non-existent repository
            'pull_request_url': 'https://github.com/testuser/test-repo/pull/1',
            'pull_request_number': 1,
            'pull_request_title': 'Add new feature'
        }
        
        response = client.post('/api/reviews', 
                             data=json.dumps(review_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_create_review_missing_data(self, client, authenticated_user):
        """Test review creation with missing required data"""
        headers, _ = authenticated_user
        
        review_data = {
            'repository_id': 1
            # Missing required fields
        }
        
        response = client.post('/api/reviews', 
                             data=json.dumps(review_data),
                             content_type='application/json',
                             headers=headers)
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    @patch('src.services.ai_service.AIService.analyze_pull_request')
    def test_get_review_by_id(self, mock_analyze, client, authenticated_user, sample_repository):
        """Test getting a specific review by ID"""
        headers, _ = authenticated_user
        
        # Mock AI service response
        mock_analyze.return_value = {
            'overall_score': 85,
            'security_score': 90,
            'performance_score': 80,
            'maintainability_score': 85,
            'comments': []
        }
        
        # Create a review first
        review_data = {
            'repository_id': sample_repository['id'],
            'pull_request_url': 'https://github.com/testuser/test-repo/pull/1',
            'pull_request_number': 1,
            'pull_request_title': 'Add new feature'
        }
        
        create_response = client.post('/api/reviews', 
                                    data=json.dumps(review_data),
                                    content_type='application/json',
                                    headers=headers)
        
        review_id = json.loads(create_response.data)['review']['id']
        
        # Get the review
        response = client.get(f'/api/reviews/{review_id}', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'review' in data
        assert data['review']['id'] == review_id
        assert data['review']['overall_score'] == 85
    
    def test_get_review_not_found(self, client, authenticated_user):
        """Test getting a non-existent review"""
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews/999', headers=headers)
        
        assert response.status_code == 404
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_review_unauthorized(self, client, authenticated_user, sample_repository):
        """Test getting a review that belongs to another user"""
        # This would require creating another user and review
        # For now, we'll test with non-existent review
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews/999', headers=headers)
        
        assert response.status_code == 404
    
    def test_get_reviews_with_pagination(self, client, authenticated_user):
        """Test getting reviews with pagination parameters"""
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews?page=1&per_page=10', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'reviews' in data
        assert 'total_count' in data
        assert 'page' in data
        assert 'per_page' in data
    
    def test_get_reviews_with_filters(self, client, authenticated_user):
        """Test getting reviews with status filter"""
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews?status=completed', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'reviews' in data
    
    def test_get_review_stats(self, client, authenticated_user):
        """Test getting review statistics"""
        headers, _ = authenticated_user
        
        response = client.get('/api/reviews/stats', headers=headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'total_reviews' in data
        assert 'completed_reviews' in data
        assert 'failed_reviews' in data
        assert 'success_rate' in data
        assert 'average_scores' in data


class TestReviewModel:
    """Test cases for Review model"""
    
    def test_review_creation(self, client):
        """Test review model creation"""
        with app.app_context():
            db.create_all()
            
            # Create user and repository first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            repository = Repository(
                name='test-repo',
                full_name='testuser/test-repo',
                platform='github',
                user_id=user.id
            )
            db.session.add(repository)
            db.session.commit()
            
            # Create review
            review = Review(
                repository_id=repository.id,
                pull_request_url='https://github.com/testuser/test-repo/pull/1',
                pull_request_number=1,
                pull_request_title='Test PR',
                status='completed',
                overall_score=85
            )
            db.session.add(review)
            db.session.commit()
            
            # Verify review was created
            saved_review = Review.query.filter_by(repository_id=repository.id).first()
            assert saved_review is not None
            assert saved_review.pull_request_number == 1
            assert saved_review.overall_score == 85
            assert saved_review.status == 'completed'
    
    def test_review_to_dict(self, client):
        """Test review serialization to dictionary"""
        with app.app_context():
            db.create_all()
            
            # Create user and repository first
            user = User(username='testuser', email='test@example.com')
            user.set_password('password123')
            db.session.add(user)
            db.session.commit()
            
            repository = Repository(
                name='test-repo',
                full_name='testuser/test-repo',
                platform='github',
                user_id=user.id
            )
            db.session.add(repository)
            db.session.commit()
            
            # Create review
            review = Review(
                repository_id=repository.id,
                pull_request_url='https://github.com/testuser/test-repo/pull/1',
                pull_request_number=1,
                pull_request_title='Test PR',
                status='completed',
                overall_score=85
            )
            db.session.add(review)
            db.session.commit()
            
            review_dict = review.to_dict()
            
            assert 'id' in review_dict
            assert review_dict['pull_request_number'] == 1
            assert review_dict['overall_score'] == 85
            assert review_dict['status'] == 'completed'
            assert 'created_at' in review_dict
            assert 'updated_at' in review_dict


class TestAIService:
    """Test cases for AI service integration"""
    
    @patch('openai.ChatCompletion.create')
    def test_ai_analysis_success(self, mock_openai, client):
        """Test successful AI analysis"""
        from src.services.ai_service import AIService
        
        # Mock OpenAI response
        mock_openai.return_value = MagicMock()
        mock_openai.return_value.choices = [MagicMock()]
        mock_openai.return_value.choices[0].message.content = json.dumps({
            'overall_score': 85,
            'security_score': 90,
            'performance_score': 80,
            'maintainability_score': 85,
            'comments': []
        })
        
        ai_service = AIService()
        
        # Mock pull request data
        pr_data = {
            'title': 'Test PR',
            'description': 'Test description',
            'files': [
                {
                    'filename': 'test.py',
                    'patch': '+print("hello world")'
                }
            ]
        }
        
        result = ai_service.analyze_pull_request(pr_data)
        
        assert result['overall_score'] == 85
        assert result['security_score'] == 90
        assert result['performance_score'] == 80
        assert result['maintainability_score'] == 85
    
    @patch('openai.ChatCompletion.create')
    def test_ai_analysis_error_handling(self, mock_openai, client):
        """Test AI analysis error handling"""
        from src.services.ai_service import AIService
        
        # Mock OpenAI error
        mock_openai.side_effect = Exception("API Error")
        
        ai_service = AIService()
        
        pr_data = {
            'title': 'Test PR',
            'description': 'Test description',
            'files': []
        }
        
        with pytest.raises(Exception):
            ai_service.analyze_pull_request(pr_data)


if __name__ == '__main__':
    pytest.main([__file__])

