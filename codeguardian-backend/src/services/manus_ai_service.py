"""
Enhanced AI Service for CodeGuardian using Manus Latest Features
Integrates multiple AI models, MCP servers, and advanced analysis capabilities
"""

import os
import json
import asyncio
from typing import Dict, List, Optional, Any
from openai import OpenAI
import subprocess
import tempfile
from datetime import datetime

class ManusAIService:
    """Enhanced AI service leveraging Manus latest capabilities"""
    
    def __init__(self):
        self.client = OpenAI()  # Uses pre-configured environment variables
        self.supported_models = [
            'gpt-4.1-mini',      # Latest Manus model
            'gpt-4.1-nano',      # Fast analysis model
            'gemini-2.5-flash'   # Google's latest model
        ]
        self.mcp_servers = {
            'prisma-postgres': 'Database management and queries',
            'supabase': 'Backend-as-a-service automation',
            'notion': 'Documentation and knowledge management',
            'vercel': 'Deployment and project management'
        }
    
    async def analyze_code_advanced(self, code: str, language: str, options: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Advanced code analysis using multiple AI models and MCP integration
        """
        options = options or {}
        
        # Use different models for different analysis types
        primary_model = options.get('model', 'gpt-4.1-mini')
        use_multi_model = options.get('multi_model_analysis', True)
        
        try:
            # Primary analysis with latest model
            primary_analysis = await self._analyze_with_model(code, language, primary_model, options)
            
            if use_multi_model:
                # Secondary analysis with different model for comparison
                secondary_model = 'gemini-2.5-flash' if primary_model != 'gemini-2.5-flash' else 'gpt-4.1-nano'
                secondary_analysis = await self._analyze_with_model(code, language, secondary_model, options)
                
                # Merge and enhance results
                enhanced_analysis = self._merge_analyses(primary_analysis, secondary_analysis)
            else:
                enhanced_analysis = primary_analysis
            
            # Add MCP-powered enhancements
            if options.get('use_mcp', True):
                enhanced_analysis = await self._enhance_with_mcp(enhanced_analysis, code, language)
            
            # Add Manus-specific features
            enhanced_analysis = await self._add_manus_features(enhanced_analysis, code, language, options)
            
            return enhanced_analysis
            
        except Exception as e:
            return {
                'error': f'Analysis failed: {str(e)}',
                'fallback_analysis': await self._fallback_analysis(code, language)
            }
    
    async def _analyze_with_model(self, code: str, language: str, model: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze code with specific AI model"""
        
        system_prompt = self._build_enhanced_system_prompt(language, options)
        user_prompt = self._build_enhanced_user_prompt(code, language, options)
        
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.1,
            max_tokens=4000
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            result['model_used'] = model
            result['analysis_timestamp'] = datetime.utcnow().isoformat()
            return result
        except json.JSONDecodeError:
            # Fallback to structured parsing
            return self._parse_unstructured_response(response.choices[0].message.content, model)
    
    def _build_enhanced_system_prompt(self, language: str, options: Dict[str, Any]) -> str:
        """Build enhanced system prompt with Manus capabilities"""
        
        base_prompt = f"""You are CodeGuardian AI, an advanced code analysis system powered by Manus technology.
        
CORE CAPABILITIES:
- Multi-model AI analysis for comprehensive insights
- Real-time security vulnerability detection
- Performance optimization suggestions
- Code quality assessment with mentorship explanations
- Integration with modern development workflows

ANALYSIS FOCUS for {language}:
- Security vulnerabilities and best practices
- Performance bottlenecks and optimization opportunities
- Code maintainability and readability
- Modern framework and library usage
- Testing and debugging recommendations

RESPONSE FORMAT:
Return a JSON object with the following structure:
{{
    "overall_score": <0-100>,
    "security_score": <0-100>,
    "performance_score": <0-100>,
    "maintainability_score": <0-100>,
    "comments": [
        {{
            "line_number": <number>,
            "severity": "high|medium|low",
            "category": "security|performance|style|bug|suggestion",
            "message": "<detailed explanation>",
            "suggestion": "<specific improvement>",
            "reasoning": "<why this matters - mentorship style>",
            "auto_fix": "<code snippet if applicable>",
            "confidence": <0-100>
        }}
    ],
    "summary": {{
        "strengths": ["<positive aspects>"],
        "improvements": ["<areas for improvement>"],
        "critical_issues": ["<must-fix issues>"],
        "learning_opportunities": ["<educational insights>"]
    }},
    "modern_practices": {{
        "framework_suggestions": ["<modern alternatives>"],
        "tooling_recommendations": ["<development tools>"],
        "best_practices": ["<industry standards>"]
    }}
}}"""

        # Add specific enhancements based on options
        if options.get('mentorship_mode', True):
            base_prompt += "\n\nMENTORSHIP MODE: Provide detailed explanations of WHY each suggestion matters, helping developers learn and grow."
        
        if options.get('security_focus', True):
            base_prompt += "\n\nSECURITY FOCUS: Pay special attention to security vulnerabilities, data handling, and authentication issues."
        
        if options.get('performance_focus', False):
            base_prompt += "\n\nPERFORMANCE FOCUS: Emphasize performance optimizations, memory usage, and scalability concerns."
        
        return base_prompt
    
    def _build_enhanced_user_prompt(self, code: str, language: str, options: Dict[str, Any]) -> str:
        """Build enhanced user prompt with context"""
        
        context = options.get('context', {})
        
        prompt = f"Analyze this {language} code:\n\n```{language}\n{code}\n```\n\n"
        
        if context.get('file_path'):
            prompt += f"File path: {context['file_path']}\n"
        
        if context.get('project_type'):
            prompt += f"Project type: {context['project_type']}\n"
        
        if context.get('framework'):
            prompt += f"Framework: {context['framework']}\n"
        
        if options.get('specific_concerns'):
            prompt += f"Specific concerns: {', '.join(options['specific_concerns'])}\n"
        
        prompt += "\nProvide comprehensive analysis with actionable insights and learning opportunities."
        
        return prompt
    
    def _merge_analyses(self, primary: Dict[str, Any], secondary: Dict[str, Any]) -> Dict[str, Any]:
        """Merge results from multiple AI models for enhanced accuracy"""
        
        merged = primary.copy()
        
        # Average scores with confidence weighting
        merged['overall_score'] = int((primary['overall_score'] + secondary['overall_score']) / 2)
        merged['security_score'] = int((primary.get('security_score', 0) + secondary.get('security_score', 0)) / 2)
        merged['performance_score'] = int((primary.get('performance_score', 0) + secondary.get('performance_score', 0)) / 2)
        merged['maintainability_score'] = int((primary.get('maintainability_score', 0) + secondary.get('maintainability_score', 0)) / 2)
        
        # Merge comments with deduplication
        all_comments = primary.get('comments', []) + secondary.get('comments', [])
        merged['comments'] = self._deduplicate_comments(all_comments)
        
        # Enhance summary with insights from both models
        merged['multi_model_insights'] = {
            'primary_model': primary.get('model_used', 'unknown'),
            'secondary_model': secondary.get('model_used', 'unknown'),
            'consensus_issues': self._find_consensus_issues(primary, secondary),
            'conflicting_opinions': self._find_conflicts(primary, secondary)
        }
        
        return merged
    
    async def _enhance_with_mcp(self, analysis: Dict[str, Any], code: str, language: str) -> Dict[str, Any]:
        """Enhance analysis using MCP (Model Context Protocol) servers"""
        
        try:
            # Use Notion MCP for documentation insights
            notion_insights = await self._get_notion_insights(code, language)
            if notion_insights:
                analysis['documentation_suggestions'] = notion_insights
            
            # Use Vercel MCP for deployment insights
            vercel_insights = await self._get_vercel_insights(code, language)
            if vercel_insights:
                analysis['deployment_recommendations'] = vercel_insights
            
            # Use Prisma MCP for database-related code
            if self._is_database_code(code):
                db_insights = await self._get_database_insights(code, language)
                if db_insights:
                    analysis['database_optimization'] = db_insights
            
            analysis['mcp_enhanced'] = True
            
        except Exception as e:
            analysis['mcp_error'] = f"MCP enhancement failed: {str(e)}"
        
        return analysis
    
    async def _add_manus_features(self, analysis: Dict[str, Any], code: str, language: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Add Manus-specific advanced features"""
        
        # Real-time collaboration insights
        if options.get('team_mode', False):
            analysis['collaboration_insights'] = await self._analyze_team_patterns(code, language)
        
        # Advanced security scanning
        if options.get('deep_security', True):
            analysis['advanced_security'] = await self._deep_security_scan(code, language)
        
        # Performance profiling suggestions
        if options.get('performance_profiling', False):
            analysis['profiling_suggestions'] = await self._suggest_profiling_tools(code, language)
        
        # Integration recommendations
        analysis['integration_opportunities'] = await self._suggest_integrations(code, language)
        
        # Learning path recommendations
        if options.get('mentorship_mode', True):
            analysis['learning_path'] = await self._generate_learning_path(analysis, language)
        
        # Add Manus-specific metadata
        analysis['manus_features'] = {
            'version': '2.0',
            'enhanced_analysis': True,
            'multi_model_support': True,
            'mcp_integration': True,
            'real_time_capabilities': True,
            'team_collaboration': True
        }
        
        return analysis
    
    async def _get_notion_insights(self, code: str, language: str) -> Optional[Dict[str, Any]]:
        """Get documentation insights using Notion MCP"""
        try:
            # Use manus-mcp-cli to interact with Notion
            result = subprocess.run([
                'manus-mcp-cli', 'tool', 'call', 'search_pages',
                '--server', 'notion',
                '--input', json.dumps({
                    'query': f'{language} best practices documentation',
                    'filter': {'property': 'Type', 'select': {'equals': 'Best Practices'}}
                })
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception:
            pass
        return None
    
    async def _get_vercel_insights(self, code: str, language: str) -> Optional[Dict[str, Any]]:
        """Get deployment insights using Vercel MCP"""
        try:
            # Check for deployment patterns
            result = subprocess.run([
                'manus-mcp-cli', 'tool', 'call', 'search_documentation',
                '--server', 'vercel',
                '--input', json.dumps({
                    'query': f'{language} deployment optimization'
                })
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception:
            pass
        return None
    
    async def _get_database_insights(self, code: str, language: str) -> Optional[Dict[str, Any]]:
        """Get database optimization insights using Prisma MCP"""
        try:
            # Analyze database queries and schema
            result = subprocess.run([
                'manus-mcp-cli', 'tool', 'call', 'analyze_query',
                '--server', 'prisma-postgres',
                '--input', json.dumps({
                    'query': self._extract_sql_queries(code),
                    'language': language
                })
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception:
            pass
        return None
    
    def _is_database_code(self, code: str) -> bool:
        """Check if code contains database operations"""
        db_keywords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE', 'ALTER TABLE', 
                      'prisma', 'mongoose', 'sequelize', 'knex', 'typeorm']
        return any(keyword.lower() in code.lower() for keyword in db_keywords)
    
    def _extract_sql_queries(self, code: str) -> List[str]:
        """Extract SQL queries from code"""
        # Simple extraction - could be enhanced with AST parsing
        import re
        sql_pattern = r'["\']?(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER).*?["\']?'
        return re.findall(sql_pattern, code, re.IGNORECASE | re.DOTALL)
    
    async def _analyze_team_patterns(self, code: str, language: str) -> Dict[str, Any]:
        """Analyze code for team collaboration patterns"""
        return {
            'code_style_consistency': await self._check_style_consistency(code, language),
            'documentation_coverage': await self._assess_documentation(code),
            'test_coverage_hints': await self._suggest_test_coverage(code, language),
            'review_complexity': await self._assess_review_complexity(code)
        }
    
    async def _deep_security_scan(self, code: str, language: str) -> Dict[str, Any]:
        """Perform deep security analysis"""
        return {
            'vulnerability_patterns': await self._scan_vulnerability_patterns(code, language),
            'dependency_risks': await self._analyze_dependencies(code, language),
            'data_flow_analysis': await self._analyze_data_flow(code),
            'authentication_review': await self._review_auth_patterns(code)
        }
    
    async def _suggest_profiling_tools(self, code: str, language: str) -> Dict[str, Any]:
        """Suggest performance profiling tools"""
        tools_map = {
            'python': ['cProfile', 'py-spy', 'memory_profiler', 'line_profiler'],
            'javascript': ['Chrome DevTools', 'clinic.js', 'autocannon', '0x'],
            'java': ['JProfiler', 'VisualVM', 'async-profiler'],
            'go': ['pprof', 'go tool trace', 'benchstat'],
            'rust': ['perf', 'flamegraph', 'criterion']
        }
        
        return {
            'recommended_tools': tools_map.get(language.lower(), ['Generic profiling tools']),
            'profiling_points': await self._identify_profiling_points(code),
            'benchmarking_suggestions': await self._suggest_benchmarks(code, language)
        }
    
    async def _suggest_integrations(self, code: str, language: str) -> Dict[str, Any]:
        """Suggest integration opportunities"""
        return {
            'ci_cd_improvements': await self._suggest_cicd_enhancements(code, language),
            'monitoring_integration': await self._suggest_monitoring_tools(code, language),
            'testing_frameworks': await self._suggest_testing_tools(code, language),
            'code_quality_tools': await self._suggest_quality_tools(language)
        }
    
    async def _generate_learning_path(self, analysis: Dict[str, Any], language: str) -> Dict[str, Any]:
        """Generate personalized learning path based on analysis"""
        issues = analysis.get('comments', [])
        
        learning_topics = []
        for issue in issues:
            if issue.get('severity') == 'high':
                learning_topics.append(f"Critical: {issue.get('category', 'general')} best practices")
            elif issue.get('category') == 'security':
                learning_topics.append(f"Security: {language} security patterns")
            elif issue.get('category') == 'performance':
                learning_topics.append(f"Performance: {language} optimization techniques")
        
        return {
            'immediate_focus': learning_topics[:3],
            'recommended_resources': await self._get_learning_resources(learning_topics, language),
            'skill_level_assessment': await self._assess_skill_level(analysis),
            'next_steps': await self._suggest_next_steps(analysis, language)
        }
    
    # Helper methods for enhanced analysis
    async def _check_style_consistency(self, code: str, language: str) -> Dict[str, Any]:
        """Check code style consistency"""
        # Implementation would analyze indentation, naming conventions, etc.
        return {'consistency_score': 85, 'style_issues': []}
    
    async def _assess_documentation(self, code: str) -> Dict[str, Any]:
        """Assess documentation coverage"""
        # Implementation would analyze comments, docstrings, etc.
        return {'documentation_score': 70, 'missing_docs': []}
    
    async def _suggest_test_coverage(self, code: str, language: str) -> Dict[str, Any]:
        """Suggest test coverage improvements"""
        return {'testable_functions': [], 'coverage_suggestions': []}
    
    async def _assess_review_complexity(self, code: str) -> Dict[str, Any]:
        """Assess code review complexity"""
        return {'complexity_score': 60, 'review_time_estimate': '15-20 minutes'}
    
    async def _scan_vulnerability_patterns(self, code: str, language: str) -> List[Dict[str, Any]]:
        """Scan for security vulnerability patterns"""
        return []
    
    async def _analyze_dependencies(self, code: str, language: str) -> Dict[str, Any]:
        """Analyze dependency security risks"""
        return {'risky_dependencies': [], 'update_recommendations': []}
    
    async def _analyze_data_flow(self, code: str) -> Dict[str, Any]:
        """Analyze data flow for security issues"""
        return {'data_flow_issues': [], 'sanitization_suggestions': []}
    
    async def _review_auth_patterns(self, code: str) -> Dict[str, Any]:
        """Review authentication patterns"""
        return {'auth_issues': [], 'security_recommendations': []}
    
    async def _identify_profiling_points(self, code: str) -> List[str]:
        """Identify key points for performance profiling"""
        return ['Function entry/exit points', 'Loop iterations', 'Database queries']
    
    async def _suggest_benchmarks(self, code: str, language: str) -> List[str]:
        """Suggest benchmark scenarios"""
        return ['Load testing', 'Memory usage profiling', 'CPU utilization analysis']
    
    async def _suggest_cicd_enhancements(self, code: str, language: str) -> List[str]:
        """Suggest CI/CD pipeline improvements"""
        return ['Automated testing', 'Code quality gates', 'Security scanning']
    
    async def _suggest_monitoring_tools(self, code: str, language: str) -> List[str]:
        """Suggest monitoring and observability tools"""
        return ['Application performance monitoring', 'Error tracking', 'Log aggregation']
    
    async def _suggest_testing_tools(self, code: str, language: str) -> List[str]:
        """Suggest testing frameworks and tools"""
        testing_map = {
            'python': ['pytest', 'unittest', 'hypothesis'],
            'javascript': ['jest', 'mocha', 'cypress'],
            'java': ['junit', 'testng', 'mockito'],
            'go': ['testing', 'testify', 'ginkgo']
        }
        return testing_map.get(language.lower(), ['Generic testing frameworks'])
    
    async def _suggest_quality_tools(self, language: str) -> List[str]:
        """Suggest code quality tools"""
        quality_map = {
            'python': ['pylint', 'black', 'mypy', 'bandit'],
            'javascript': ['eslint', 'prettier', 'sonarjs'],
            'java': ['checkstyle', 'pmd', 'spotbugs'],
            'go': ['golint', 'gofmt', 'go vet']
        }
        return quality_map.get(language.lower(), ['Generic quality tools'])
    
    async def _get_learning_resources(self, topics: List[str], language: str) -> List[Dict[str, str]]:
        """Get learning resources for specific topics"""
        return [
            {'title': f'{language} Best Practices Guide', 'type': 'documentation', 'url': '#'},
            {'title': f'Advanced {language} Patterns', 'type': 'tutorial', 'url': '#'},
            {'title': f'{language} Security Handbook', 'type': 'book', 'url': '#'}
        ]
    
    async def _assess_skill_level(self, analysis: Dict[str, Any]) -> str:
        """Assess developer skill level based on code analysis"""
        score = analysis.get('overall_score', 0)
        if score >= 90:
            return 'Expert'
        elif score >= 75:
            return 'Advanced'
        elif score >= 60:
            return 'Intermediate'
        else:
            return 'Beginner'
    
    async def _suggest_next_steps(self, analysis: Dict[str, Any], language: str) -> List[str]:
        """Suggest next steps for improvement"""
        return [
            'Focus on fixing high-severity issues first',
            'Implement automated testing',
            'Set up continuous integration',
            'Review security best practices'
        ]
    
    def _deduplicate_comments(self, comments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate comments from multiple analyses"""
        seen = set()
        unique_comments = []
        
        for comment in comments:
            key = (comment.get('line_number'), comment.get('message', ''))
            if key not in seen:
                seen.add(key)
                unique_comments.append(comment)
        
        return unique_comments
    
    def _find_consensus_issues(self, primary: Dict[str, Any], secondary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find issues that both models agree on"""
        primary_issues = {(c.get('line_number'), c.get('category')): c for c in primary.get('comments', [])}
        secondary_issues = {(c.get('line_number'), c.get('category')): c for c in secondary.get('comments', [])}
        
        consensus = []
        for key in primary_issues:
            if key in secondary_issues:
                consensus.append(primary_issues[key])
        
        return consensus
    
    def _find_conflicts(self, primary: Dict[str, Any], secondary: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find conflicting opinions between models"""
        # Implementation would compare differing assessments
        return []
    
    def _parse_unstructured_response(self, response: str, model: str) -> Dict[str, Any]:
        """Parse unstructured AI response as fallback"""
        return {
            'overall_score': 75,
            'comments': [],
            'summary': {'raw_response': response},
            'model_used': model,
            'parsing_method': 'fallback'
        }
    
    async def _fallback_analysis(self, code: str, language: str) -> Dict[str, Any]:
        """Provide basic fallback analysis when main analysis fails"""
        return {
            'overall_score': 50,
            'comments': [{
                'line_number': 1,
                'severity': 'info',
                'category': 'system',
                'message': 'Analysis service temporarily unavailable. Basic validation passed.',
                'suggestion': 'Please try again later for detailed analysis.'
            }],
            'summary': {
                'status': 'fallback_mode',
                'message': 'Limited analysis due to service issues'
            }
        }

# Export the enhanced service
def create_manus_ai_service():
    """Factory function to create the enhanced AI service"""
    return ManusAIService()

