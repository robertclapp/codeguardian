"""
CodeGuardian Python SDK
Official Python client library for CodeGuardian API
"""

import requests
import json
import time
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import asyncio
import aiohttp
from pathlib import Path


class Severity(Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class CodeIssue:
    line_number: int
    column: int
    severity: Severity
    category: str
    message: str
    suggestion: Optional[str] = None
    fix: Optional[Dict[str, str]] = None


@dataclass
class AnalysisResult:
    overall_score: int
    security_score: int
    performance_score: int
    maintainability_score: int
    issues: List[CodeIssue]
    suggestions: List[str]
    analysis_time: float


@dataclass
class ExplanationResult:
    description: str
    suggestions: str
    reasoning: str
    examples: List[str]


class CodeGuardianError(Exception):
    """Base exception for CodeGuardian SDK"""
    pass


class AuthenticationError(CodeGuardianError):
    """Raised when API authentication fails"""
    pass


class RateLimitError(CodeGuardianError):
    """Raised when API rate limit is exceeded"""
    pass


class AnalysisError(CodeGuardianError):
    """Raised when code analysis fails"""
    pass


class CodeGuardianClient:
    """
    CodeGuardian API Client
    
    Provides access to CodeGuardian's AI-powered code analysis and mentorship features.
    
    Example:
        client = CodeGuardianClient(api_key="your-api-key")
        result = client.analyze_code("print('hello world')", language="python")
        print(f"Score: {result.overall_score}/100")
    """
    
    def __init__(
        self,
        api_key: str,
        api_url: str = "https://codeguardian-api.onrender.com",
        timeout: int = 30,
        max_retries: int = 3
    ):
        """
        Initialize CodeGuardian client
        
        Args:
            api_key: Your CodeGuardian API key
            api_url: API base URL (default: production URL)
            timeout: Request timeout in seconds
            max_retries: Maximum number of retry attempts
        """
        self.api_key = api_key
        self.api_url = api_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeGuardian-Python-SDK/1.0.0'
        })
    
    def analyze_code(
        self,
        code: str,
        language: str = "python",
        filename: Optional[str] = None,
        mentorship: bool = True,
        security_focus: bool = True,
        **options
    ) -> AnalysisResult:
        """
        Analyze code for issues, security vulnerabilities, and improvements
        
        Args:
            code: Source code to analyze
            language: Programming language (python, javascript, java, etc.)
            filename: Optional filename for context
            mentorship: Enable AI mentorship explanations
            security_focus: Focus on security vulnerabilities
            **options: Additional analysis options
            
        Returns:
            AnalysisResult with scores, issues, and suggestions
            
        Raises:
            AnalysisError: If analysis fails
            AuthenticationError: If API key is invalid
            RateLimitError: If rate limit is exceeded
        """
        payload = {
            'code': code,
            'language': language,
            'fileName': filename,
            'options': {
                'mentorship': mentorship,
                'securityFocus': security_focus,
                **options
            }
        }
        
        start_time = time.time()
        response = self._make_request('POST', '/api/reviews/analyze', json=payload)
        analysis_time = time.time() - start_time
        
        return self._parse_analysis_result(response, analysis_time)
    
    def analyze_file(
        self,
        file_path: Union[str, Path],
        language: Optional[str] = None,
        **options
    ) -> AnalysisResult:
        """
        Analyze a code file
        
        Args:
            file_path: Path to the code file
            language: Programming language (auto-detected if not provided)
            **options: Additional analysis options
            
        Returns:
            AnalysisResult with analysis results
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
        
        if language is None:
            language = self._detect_language(file_path)
        
        return self.analyze_code(
            code=code,
            language=language,
            filename=str(file_path),
            **options
        )
    
    def analyze_directory(
        self,
        directory_path: Union[str, Path],
        recursive: bool = True,
        file_patterns: Optional[List[str]] = None,
        **options
    ) -> Dict[str, AnalysisResult]:
        """
        Analyze all code files in a directory
        
        Args:
            directory_path: Path to the directory
            recursive: Analyze subdirectories recursively
            file_patterns: File patterns to include (e.g., ['*.py', '*.js'])
            **options: Additional analysis options
            
        Returns:
            Dictionary mapping file paths to analysis results
        """
        directory_path = Path(directory_path)
        
        if not directory_path.exists():
            raise FileNotFoundError(f"Directory not found: {directory_path}")
        
        if file_patterns is None:
            file_patterns = [
                '*.py', '*.js', '*.ts', '*.java', '*.cpp', '*.c',
                '*.cs', '*.go', '*.rs', '*.php', '*.rb'
            ]
        
        files = []
        for pattern in file_patterns:
            if recursive:
                files.extend(directory_path.rglob(pattern))
            else:
                files.extend(directory_path.glob(pattern))
        
        results = {}
        for file_path in files:
            try:
                result = self.analyze_file(file_path, **options)
                results[str(file_path)] = result
            except Exception as e:
                print(f"Error analyzing {file_path}: {e}")
        
        return results
    
    def explain_code(
        self,
        code: str,
        language: str = "python",
        mentorship_level: str = "detailed"
    ) -> ExplanationResult:
        """
        Get AI explanation and mentorship for code
        
        Args:
            code: Source code to explain
            language: Programming language
            mentorship_level: Level of detail (basic, detailed, expert)
            
        Returns:
            ExplanationResult with description, suggestions, and reasoning
        """
        payload = {
            'code': code,
            'language': language,
            'mentorshipLevel': mentorship_level
        }
        
        response = self._make_request('POST', '/api/reviews/explain', json=payload)
        
        return ExplanationResult(
            description=response.get('description', ''),
            suggestions=response.get('suggestions', ''),
            reasoning=response.get('reasoning', ''),
            examples=response.get('examples', [])
        )
    
    def get_suggestions(
        self,
        code: str,
        language: str = "python",
        context: Optional[str] = None
    ) -> List[str]:
        """
        Get improvement suggestions for code
        
        Args:
            code: Source code
            language: Programming language
            context: Additional context for suggestions
            
        Returns:
            List of improvement suggestions
        """
        payload = {
            'code': code,
            'language': language,
            'context': context
        }
        
        response = self._make_request('POST', '/api/reviews/suggestions', json=payload)
        return response.get('suggestions', [])
    
    def check_security(
        self,
        code: str,
        language: str = "python"
    ) -> List[CodeIssue]:
        """
        Check code for security vulnerabilities
        
        Args:
            code: Source code to check
            language: Programming language
            
        Returns:
            List of security issues found
        """
        result = self.analyze_code(
            code=code,
            language=language,
            security_focus=True,
            mentorship=False
        )
        
        # Filter for security-related issues
        security_issues = [
            issue for issue in result.issues
            if 'security' in issue.category.lower()
        ]
        
        return security_issues
    
    def get_user_profile(self) -> Dict[str, Any]:
        """Get user profile information"""
        return self._make_request('GET', '/api/auth/profile')
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get API usage statistics"""
        return self._make_request('GET', '/api/reviews/stats')
    
    def test_connection(self) -> bool:
        """Test API connection"""
        try:
            response = self._make_request('GET', '/health')
            return response.get('status') == 'healthy'
        except Exception:
            return False
    
    def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        url = f"{self.api_url}{endpoint}"
        
        for attempt in range(self.max_retries + 1):
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    timeout=self.timeout,
                    **kwargs
                )
                
                if response.status_code == 401:
                    raise AuthenticationError("Invalid API key")
                elif response.status_code == 429:
                    if attempt < self.max_retries:
                        time.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    raise RateLimitError("Rate limit exceeded")
                elif response.status_code >= 400:
                    raise CodeGuardianError(f"API error: {response.status_code}")
                
                return response.json()
                
            except requests.exceptions.RequestException as e:
                if attempt < self.max_retries:
                    time.sleep(1)
                    continue
                raise CodeGuardianError(f"Request failed: {e}")
        
        raise CodeGuardianError("Max retries exceeded")
    
    def _parse_analysis_result(
        self,
        response: Dict[str, Any],
        analysis_time: float
    ) -> AnalysisResult:
        """Parse API response into AnalysisResult"""
        comments = response.get('comments', [])
        issues = []
        
        for comment in comments:
            issues.append(CodeIssue(
                line_number=comment.get('line_number', 0),
                column=comment.get('column', 0),
                severity=Severity(comment.get('severity', 'low')),
                category=comment.get('category', 'general'),
                message=comment.get('message', ''),
                suggestion=comment.get('suggestion'),
                fix=comment.get('fix')
            ))
        
        return AnalysisResult(
            overall_score=response.get('overall_score', 0),
            security_score=response.get('security_score', 0),
            performance_score=response.get('performance_score', 0),
            maintainability_score=response.get('maintainability_score', 0),
            issues=issues,
            suggestions=response.get('suggestions', []),
            analysis_time=analysis_time
        )
    
    def _detect_language(self, file_path: Path) -> str:
        """Detect programming language from file extension"""
        extension_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.ts': 'typescript',
            '.jsx': 'javascript',
            '.tsx': 'typescript',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby'
        }
        return extension_map.get(file_path.suffix.lower(), 'text')


class AsyncCodeGuardianClient:
    """
    Async version of CodeGuardian client for high-performance applications
    """
    
    def __init__(
        self,
        api_key: str,
        api_url: str = "https://codeguardian-api.onrender.com",
        timeout: int = 30,
        max_retries: int = 3
    ):
        self.api_key = api_key
        self.api_url = api_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'CodeGuardian-Python-SDK/1.0.0'
        }
    
    async def analyze_code(
        self,
        code: str,
        language: str = "python",
        **options
    ) -> AnalysisResult:
        """Async version of analyze_code"""
        payload = {
            'code': code,
            'language': language,
            'options': options
        }
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            response = await self._make_request(
                session, 'POST', '/api/reviews/analyze', json=payload
            )
        
        analysis_time = time.time() - start_time
        return self._parse_analysis_result(response, analysis_time)
    
    async def analyze_multiple(
        self,
        code_samples: List[Dict[str, str]]
    ) -> List[AnalysisResult]:
        """Analyze multiple code samples concurrently"""
        async with aiohttp.ClientSession() as session:
            tasks = []
            for sample in code_samples:
                task = self.analyze_code(
                    code=sample['code'],
                    language=sample.get('language', 'python'),
                    **sample.get('options', {})
                )
                tasks.append(task)
            
            return await asyncio.gather(*tasks)
    
    async def _make_request(
        self,
        session: aiohttp.ClientSession,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make async HTTP request"""
        url = f"{self.api_url}{endpoint}"
        
        async with session.request(
            method=method,
            url=url,
            headers=self.headers,
            timeout=aiohttp.ClientTimeout(total=self.timeout),
            **kwargs
        ) as response:
            if response.status == 401:
                raise AuthenticationError("Invalid API key")
            elif response.status == 429:
                raise RateLimitError("Rate limit exceeded")
            elif response.status >= 400:
                raise CodeGuardianError(f"API error: {response.status}")
            
            return await response.json()
    
    def _parse_analysis_result(
        self,
        response: Dict[str, Any],
        analysis_time: float
    ) -> AnalysisResult:
        """Parse API response into AnalysisResult"""
        # Same implementation as sync version
        comments = response.get('comments', [])
        issues = []
        
        for comment in comments:
            issues.append(CodeIssue(
                line_number=comment.get('line_number', 0),
                column=comment.get('column', 0),
                severity=Severity(comment.get('severity', 'low')),
                category=comment.get('category', 'general'),
                message=comment.get('message', ''),
                suggestion=comment.get('suggestion'),
                fix=comment.get('fix')
            ))
        
        return AnalysisResult(
            overall_score=response.get('overall_score', 0),
            security_score=response.get('security_score', 0),
            performance_score=response.get('performance_score', 0),
            maintainability_score=response.get('maintainability_score', 0),
            issues=issues,
            suggestions=response.get('suggestions', []),
            analysis_time=analysis_time
        )


# Convenience functions
def analyze_code(code: str, api_key: str, **kwargs) -> AnalysisResult:
    """Quick analysis function"""
    client = CodeGuardianClient(api_key)
    return client.analyze_code(code, **kwargs)


def analyze_file(file_path: str, api_key: str, **kwargs) -> AnalysisResult:
    """Quick file analysis function"""
    client = CodeGuardianClient(api_key)
    return client.analyze_file(file_path, **kwargs)


def explain_code(code: str, api_key: str, **kwargs) -> ExplanationResult:
    """Quick code explanation function"""
    client = CodeGuardianClient(api_key)
    return client.explain_code(code, **kwargs)


# Example usage
if __name__ == "__main__":
    # Example usage
    api_key = "your-api-key-here"
    client = CodeGuardianClient(api_key)
    
    # Test connection
    if client.test_connection():
        print("✅ Connected to CodeGuardian API")
    else:
        print("❌ Connection failed")
        exit(1)
    
    # Analyze some code
    code = """
def unsafe_function(user_input):
    exec(user_input)  # Security vulnerability!
    return "done"
    """
    
    result = client.analyze_code(code, language="python")
    
    print(f"Overall Score: {result.overall_score}/100")
    print(f"Security Score: {result.security_score}/100")
    print(f"Issues Found: {len(result.issues)}")
    
    for issue in result.issues:
        print(f"  Line {issue.line_number}: {issue.message}")
        if issue.suggestion:
            print(f"    Suggestion: {issue.suggestion}")
    
    # Get explanation
    explanation = client.explain_code(code)
    print(f"\nExplanation: {explanation.description}")
    print(f"Suggestions: {explanation.suggestions}")

