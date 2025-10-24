import os
import openai
import json
import random
from typing import Dict, List, Any

class AIService:
    """AI service for code analysis and mentorship"""
    
    def __init__(self):
        # Initialize OpenAI client
        openai.api_key = os.environ.get('OPENAI_API_KEY')
        openai.api_base = os.environ.get('OPENAI_API_BASE', 'https://api.openai.com/v1')
        self.model = os.environ.get('OPENAI_MODEL', 'gpt-4')
    
    def analyze_pull_request(self, repository_url: str, pr_number: int, pr_title: str, pr_description: str) -> Dict[str, Any]:
        """Analyze a pull request using AI"""
        try:
            # In a real implementation, this would:
            # 1. Clone the repository
            # 2. Get the diff for the PR
            # 3. Analyze the code changes using AI
            # 4. Return structured feedback
            
            # For demo purposes, we'll return mock data with some AI-generated content
            prompt = f"""
            Analyze this pull request and provide a comprehensive code review:
            
            Repository: {repository_url}
            PR #{pr_number}: {pr_title}
            Description: {pr_description}
            
            Please provide:
            1. Overall assessment and score (0-100)
            2. Security analysis and score (0-100)
            3. Performance analysis and score (0-100)
            4. Maintainability analysis and score (0-100)
            5. Summary of changes
            6. Recommendations for improvement
            7. Specific code comments with file paths and line numbers
            
            Format the response as JSON.
            """
            
            # For demo, return realistic mock data
            # In production, this would call the OpenAI API
            return self._generate_mock_review_data(pr_title, pr_description)
            
        except Exception as e:
            raise Exception(f"AI analysis failed: {str(e)}")
    
    def _generate_mock_review_data(self, pr_title: str, pr_description: str) -> Dict[str, Any]:
        """Generate realistic mock review data for demo purposes"""
        
        # Generate realistic scores with some randomness
        base_score = random.randint(75, 95)
        
        mock_comments = [
            {
                'file_path': 'src/components/UserProfile.tsx',
                'line_number': 45,
                'type': 'suggestion',
                'severity': 'medium',
                'category': 'performance',
                'title': 'Consider memoizing expensive computation',
                'message': 'The user data transformation in this component re-runs on every render. Consider using useMemo to optimize performance.',
                'suggested_fix': 'Wrap the transformation logic with useMemo hook',
                'original_code': 'const processedData = transformUserData(userData);',
                'suggested_code': 'const processedData = useMemo(() => transformUserData(userData), [userData]);'
            },
            {
                'file_path': 'src/api/auth.ts',
                'line_number': 23,
                'type': 'warning',
                'severity': 'high',
                'category': 'security',
                'title': 'Potential security vulnerability',
                'message': 'Storing sensitive tokens in localStorage can be vulnerable to XSS attacks. Consider using httpOnly cookies instead.',
                'suggested_fix': 'Use secure httpOnly cookies for token storage',
                'original_code': 'localStorage.setItem("token", authToken);',
                'suggested_code': '// Use httpOnly cookies instead of localStorage for tokens'
            },
            {
                'file_path': 'src/utils/validation.ts',
                'line_number': 12,
                'type': 'suggestion',
                'severity': 'low',
                'category': 'style',
                'title': 'Improve error message clarity',
                'message': 'The error message could be more descriptive to help users understand what went wrong.',
                'suggested_fix': 'Provide more specific error messages',
                'original_code': 'throw new Error("Invalid input");',
                'suggested_code': 'throw new Error("Email format is invalid. Please enter a valid email address.");'
            }
        ]
        
        recommendations = [
            'Consider adding unit tests for the new authentication logic',
            'The error handling could be more robust in the API layer',
            'Documentation should be updated to reflect the new user profile features',
            'Consider implementing input sanitization for user-generated content'
        ]
        
        return {
            'overall_score': base_score + random.randint(-5, 5),
            'security_score': base_score + random.randint(-10, 10),
            'performance_score': base_score + random.randint(-8, 8),
            'maintainability_score': base_score + random.randint(-6, 6),
            'summary': f'This pull request introduces {pr_title.lower()}. The code quality is generally good with some areas for improvement. The changes follow established patterns and maintain consistency with the existing codebase.',
            'recommendations': recommendations,
            'comments': mock_comments,
            'model_used': 'gpt-4',
            'tokens_used': random.randint(1200, 2500)
        }
    
    def generate_mentorship_session(self, user_profile: Dict[str, Any], topic: str, difficulty_level: str) -> Dict[str, Any]:
        """Generate a personalized mentorship session"""
        try:
            # In a real implementation, this would use AI to generate personalized content
            # For demo purposes, we'll return structured mock data
            
            learning_objectives = self._get_learning_objectives(topic, difficulty_level)
            content = self._get_session_content(topic, difficulty_level)
            
            return {
                'title': f'{difficulty_level.title()} {topic.title()} Mastery',
                'description': f'A comprehensive {difficulty_level} level session on {topic} tailored to your coding style and experience.',
                'learning_objectives': learning_objectives,
                'content': content
            }
            
        except Exception as e:
            raise Exception(f"Mentorship session generation failed: {str(e)}")
    
    def _get_learning_objectives(self, topic: str, difficulty_level: str) -> List[str]:
        """Get learning objectives based on topic and difficulty"""
        objectives_map = {
            'javascript': {
                'beginner': [
                    'Understand JavaScript fundamentals and syntax',
                    'Learn about variables, functions, and control structures',
                    'Practice DOM manipulation basics'
                ],
                'intermediate': [
                    'Master asynchronous JavaScript and promises',
                    'Understand closures and scope',
                    'Learn modern ES6+ features'
                ],
                'advanced': [
                    'Implement advanced design patterns',
                    'Optimize performance and memory usage',
                    'Master functional programming concepts'
                ]
            },
            'react': {
                'beginner': [
                    'Understand React components and JSX',
                    'Learn state management with useState',
                    'Practice event handling and props'
                ],
                'intermediate': [
                    'Master React hooks and custom hooks',
                    'Understand context API and state management',
                    'Learn component lifecycle and optimization'
                ],
                'advanced': [
                    'Implement advanced patterns like render props',
                    'Master performance optimization techniques',
                    'Build complex state management solutions'
                ]
            },
            'python': {
                'beginner': [
                    'Understand Python syntax and data types',
                    'Learn control structures and functions',
                    'Practice file handling and basic I/O'
                ],
                'intermediate': [
                    'Master object-oriented programming',
                    'Understand decorators and generators',
                    'Learn error handling and testing'
                ],
                'advanced': [
                    'Implement metaclasses and descriptors',
                    'Master concurrency and async programming',
                    'Build scalable application architectures'
                ]
            }
        }
        
        return objectives_map.get(topic.lower(), {}).get(difficulty_level, [
            f'Learn {topic} fundamentals',
            f'Practice {topic} best practices',
            f'Apply {topic} in real projects'
        ])
    
    def _get_session_content(self, topic: str, difficulty_level: str) -> Dict[str, Any]:
        """Get session content structure"""
        return {
            'sections': [
                {
                    'title': 'Introduction',
                    'type': 'text',
                    'content': f'Welcome to your {difficulty_level} {topic} learning session. This session is designed to help you master key concepts and improve your coding skills.'
                },
                {
                    'title': 'Key Concepts',
                    'type': 'concepts',
                    'content': f'Core {topic} concepts you\'ll learn in this session.'
                },
                {
                    'title': 'Practical Examples',
                    'type': 'code',
                    'content': f'Hands-on {topic} examples and exercises.'
                },
                {
                    'title': 'Best Practices',
                    'type': 'tips',
                    'content': f'Industry best practices for {topic} development.'
                },
                {
                    'title': 'Next Steps',
                    'type': 'action',
                    'content': 'Recommended next steps to continue your learning journey.'
                }
            ],
            'estimated_duration': 30,  # minutes
            'difficulty': difficulty_level,
            'prerequisites': f'Basic understanding of programming concepts' if difficulty_level != 'beginner' else 'None'
        }
    
    def analyze_code_quality(self, code: str, language: str) -> Dict[str, Any]:
        """Analyze code quality and provide suggestions"""
        try:
            # In a real implementation, this would analyze the code using AI
            # For demo purposes, return mock analysis
            
            return {
                'quality_score': random.randint(70, 95),
                'issues': [
                    {
                        'type': 'style',
                        'severity': 'low',
                        'message': 'Consider using more descriptive variable names',
                        'line': random.randint(1, 50)
                    },
                    {
                        'type': 'performance',
                        'severity': 'medium',
                        'message': 'This loop could be optimized for better performance',
                        'line': random.randint(1, 50)
                    }
                ],
                'suggestions': [
                    'Add error handling for edge cases',
                    'Consider breaking this function into smaller, more focused functions',
                    'Add documentation comments for complex logic'
                ]
            }
            
        except Exception as e:
            raise Exception(f"Code quality analysis failed: {str(e)}")
    
    def generate_code_suggestions(self, context: str, language: str) -> List[str]:
        """Generate code suggestions based on context"""
        try:
            # Mock suggestions for demo
            suggestions = [
                f'Consider using {language} best practices for error handling',
                f'Add type annotations to improve code clarity',
                f'Implement unit tests for this functionality',
                f'Consider using design patterns appropriate for {language}',
                f'Add logging for better debugging and monitoring'
            ]
            
            return random.sample(suggestions, min(3, len(suggestions)))
            
        except Exception as e:
            raise Exception(f"Code suggestion generation failed: {str(e)}")

