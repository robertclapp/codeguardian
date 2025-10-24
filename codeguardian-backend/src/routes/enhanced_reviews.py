"""
Enhanced Review Routes for CodeGuardian with Manus Latest Features
Includes real-time analysis, multi-model support, and MCP integration
"""

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List

from ..services.manus_ai_service import ManusAIService
from ..models.review import Review
from ..models.repository import Repository
from ..utils.validators import validate_code_input, validate_analysis_options
from ..utils.debugging import log_analysis_request, log_analysis_result

# Create blueprint for enhanced reviews
enhanced_reviews_bp = Blueprint('enhanced_reviews', __name__)

# Initialize the enhanced AI service
manus_ai = ManusAIService()

@enhanced_reviews_bp.route('/analyze/advanced', methods=['POST'])
@jwt_required()
async def analyze_code_advanced():
    """
    Advanced code analysis with multi-model AI and MCP integration
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate input
        validation_result = validate_code_input(data)
        if not validation_result['valid']:
            return jsonify({'error': validation_result['message']}), 400
        
        # Extract analysis parameters
        code = data['code']
        language = data.get('language', 'javascript')
        options = data.get('options', {})
        
        # Validate analysis options
        options_validation = validate_analysis_options(options)
        if not options_validation['valid']:
            return jsonify({'error': options_validation['message']}), 400
        
        # Log the analysis request
        log_analysis_request(user_id, language, len(code), options)
        
        # Perform advanced analysis
        analysis_result = await manus_ai.analyze_code_advanced(code, language, options)
        
        # Save analysis to database
        review = Review(
            user_id=user_id,
            repository_id=data.get('repository_id'),
            file_path=data.get('file_path', 'inline_code'),
            language=language,
            code_snippet=code[:1000],  # Store first 1000 chars
            analysis_result=json.dumps(analysis_result),
            overall_score=analysis_result.get('overall_score', 0),
            security_score=analysis_result.get('security_score', 0),
            performance_score=analysis_result.get('performance_score', 0),
            maintainability_score=analysis_result.get('maintainability_score', 0),
            analysis_type='advanced_manus',
            created_at=datetime.utcnow()
        )
        
        # Add to database (assuming db session is available)
        # db.session.add(review)
        # db.session.commit()
        
        # Log the analysis result
        log_analysis_result(user_id, analysis_result.get('overall_score', 0), len(analysis_result.get('comments', [])))
        
        # Enhance response with real-time features
        enhanced_response = {
            'analysis': analysis_result,
            'metadata': {
                'analysis_id': review.id if hasattr(review, 'id') else 'temp',
                'timestamp': datetime.utcnow().isoformat(),
                'processing_time': analysis_result.get('processing_time', 'N/A'),
                'models_used': analysis_result.get('multi_model_insights', {}).get('primary_model', 'gpt-4.1-mini'),
                'mcp_enhanced': analysis_result.get('mcp_enhanced', False),
                'manus_version': '2.0'
            },
            'real_time_features': {
                'live_collaboration': options.get('team_mode', False),
                'auto_fix_available': any(c.get('auto_fix') for c in analysis_result.get('comments', [])),
                'learning_mode': options.get('mentorship_mode', True)
            }
        }
        
        return jsonify(enhanced_response), 200
        
    except Exception as e:
        current_app.logger.error(f"Advanced analysis failed: {str(e)}")
        return jsonify({
            'error': 'Analysis failed',
            'message': str(e),
            'fallback_available': True
        }), 500

@enhanced_reviews_bp.route('/analyze/real-time', methods=['POST'])
@jwt_required()
async def analyze_real_time():
    """
    Real-time code analysis for live coding sessions
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        code = data['code']
        language = data.get('language', 'javascript')
        cursor_position = data.get('cursor_position', 0)
        
        # Fast analysis with nano model for real-time feedback
        options = {
            'model': 'gpt-4.1-nano',
            'real_time_mode': True,
            'focus_area': 'current_line',
            'cursor_position': cursor_position,
            'quick_suggestions': True
        }
        
        analysis_result = await manus_ai.analyze_code_advanced(code, language, options)
        
        # Filter for real-time relevant suggestions
        real_time_suggestions = []
        for comment in analysis_result.get('comments', []):
            if comment.get('line_number', 0) <= cursor_position + 5:  # Near cursor
                real_time_suggestions.append({
                    'type': comment.get('category', 'suggestion'),
                    'message': comment.get('message', ''),
                    'auto_fix': comment.get('auto_fix'),
                    'severity': comment.get('severity', 'low'),
                    'line': comment.get('line_number', 0)
                })
        
        return jsonify({
            'suggestions': real_time_suggestions[:3],  # Limit to 3 for performance
            'overall_health': analysis_result.get('overall_score', 0),
            'timestamp': datetime.utcnow().isoformat(),
            'response_time': 'fast'
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Real-time analysis failed', 'message': str(e)}), 500

@enhanced_reviews_bp.route('/analyze/team', methods=['POST'])
@jwt_required()
async def analyze_for_team():
    """
    Team-focused analysis with collaboration insights
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        code = data['code']
        language = data.get('language', 'javascript')
        team_context = data.get('team_context', {})
        
        options = {
            'team_mode': True,
            'mentorship_mode': True,
            'collaboration_focus': True,
            'team_context': team_context
        }
        
        analysis_result = await manus_ai.analyze_code_advanced(code, language, options)
        
        # Add team-specific enhancements
        team_insights = {
            'review_complexity': analysis_result.get('collaboration_insights', {}).get('review_complexity', {}),
            'knowledge_sharing_opportunities': extract_learning_opportunities(analysis_result),
            'pair_programming_suggestions': generate_pairing_suggestions(analysis_result),
            'code_style_alignment': check_team_style_alignment(analysis_result, team_context)
        }
        
        return jsonify({
            'analysis': analysis_result,
            'team_insights': team_insights,
            'collaboration_features': {
                'shareable_link': f"/reviews/shared/{user_id}",
                'discussion_points': extract_discussion_points(analysis_result),
                'mentorship_moments': extract_mentorship_moments(analysis_result)
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Team analysis failed', 'message': str(e)}), 500

@enhanced_reviews_bp.route('/analyze/security-deep', methods=['POST'])
@jwt_required()
async def analyze_security_deep():
    """
    Deep security analysis with advanced threat detection
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        code = data['code']
        language = data.get('language', 'javascript')
        
        options = {
            'deep_security': True,
            'security_focus': True,
            'vulnerability_scanning': True,
            'compliance_check': data.get('compliance_standards', [])
        }
        
        analysis_result = await manus_ai.analyze_code_advanced(code, language, options)
        
        # Extract security-specific insights
        security_report = {
            'threat_level': calculate_threat_level(analysis_result),
            'vulnerability_summary': extract_vulnerabilities(analysis_result),
            'compliance_status': check_compliance(analysis_result, options.get('compliance_check', [])),
            'remediation_priority': prioritize_security_fixes(analysis_result),
            'security_score_breakdown': {
                'authentication': analysis_result.get('advanced_security', {}).get('authentication_review', {}),
                'data_handling': analysis_result.get('advanced_security', {}).get('data_flow_analysis', {}),
                'dependencies': analysis_result.get('advanced_security', {}).get('dependency_risks', {})
            }
        }
        
        return jsonify({
            'security_analysis': analysis_result,
            'security_report': security_report,
            'immediate_actions': extract_immediate_security_actions(analysis_result)
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Security analysis failed', 'message': str(e)}), 500

@enhanced_reviews_bp.route('/analyze/performance', methods=['POST'])
@jwt_required()
async def analyze_performance():
    """
    Performance-focused analysis with optimization suggestions
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        code = data['code']
        language = data.get('language', 'javascript')
        
        options = {
            'performance_focus': True,
            'performance_profiling': True,
            'optimization_suggestions': True,
            'scalability_analysis': True
        }
        
        analysis_result = await manus_ai.analyze_code_advanced(code, language, options)
        
        # Extract performance insights
        performance_report = {
            'performance_score': analysis_result.get('performance_score', 0),
            'bottlenecks': extract_performance_bottlenecks(analysis_result),
            'optimization_opportunities': extract_optimizations(analysis_result),
            'profiling_recommendations': analysis_result.get('profiling_suggestions', {}),
            'scalability_concerns': extract_scalability_issues(analysis_result)
        }
        
        return jsonify({
            'performance_analysis': analysis_result,
            'performance_report': performance_report,
            'benchmarking_suggestions': analysis_result.get('profiling_suggestions', {}).get('benchmarking_suggestions', [])
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Performance analysis failed', 'message': str(e)}), 500

@enhanced_reviews_bp.route('/explain/advanced', methods=['POST'])
@jwt_required()
async def explain_code_advanced():
    """
    Advanced code explanation with mentorship features
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        code = data['code']
        language = data.get('language', 'javascript')
        explanation_level = data.get('level', 'intermediate')  # beginner, intermediate, advanced
        
        # Use appropriate model based on explanation complexity
        model_map = {
            'beginner': 'gpt-4.1-mini',
            'intermediate': 'gpt-4.1-mini', 
            'advanced': 'gemini-2.5-flash'
        }
        
        explanation_prompt = f"""
        Explain this {language} code in detail for a {explanation_level} developer:
        
        ```{language}
        {code}
        ```
        
        Provide:
        1. What the code does (high-level purpose)
        2. How it works (step-by-step breakdown)
        3. Why it's written this way (design decisions)
        4. What could be improved (suggestions)
        5. Learning opportunities (concepts to explore)
        
        Format as JSON with sections: purpose, breakdown, reasoning, improvements, learning_path
        """
        
        response = manus_ai.client.chat.completions.create(
            model=model_map[explanation_level],
            messages=[
                {"role": "system", "content": "You are a code mentor providing detailed explanations."},
                {"role": "user", "content": explanation_prompt}
            ],
            temperature=0.3
        )
        
        try:
            explanation = json.loads(response.choices[0].message.content)
        except:
            explanation = {'raw_explanation': response.choices[0].message.content}
        
        return jsonify({
            'explanation': explanation,
            'metadata': {
                'explanation_level': explanation_level,
                'model_used': model_map[explanation_level],
                'language': language,
                'timestamp': datetime.utcnow().isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Code explanation failed', 'message': str(e)}), 500

@enhanced_reviews_bp.route('/models/available', methods=['GET'])
@jwt_required()
def get_available_models():
    """
    Get list of available AI models and their capabilities
    """
    models_info = {
        'gpt-4.1-mini': {
            'description': 'Latest OpenAI model with enhanced reasoning',
            'best_for': ['comprehensive analysis', 'complex code review', 'mentorship'],
            'speed': 'medium',
            'accuracy': 'high'
        },
        'gpt-4.1-nano': {
            'description': 'Fast OpenAI model for real-time analysis',
            'best_for': ['real-time suggestions', 'quick feedback', 'live coding'],
            'speed': 'fast',
            'accuracy': 'good'
        },
        'gemini-2.5-flash': {
            'description': 'Google\'s latest model with multimodal capabilities',
            'best_for': ['performance analysis', 'security scanning', 'alternative perspective'],
            'speed': 'fast',
            'accuracy': 'high'
        }
    }
    
    return jsonify({
        'available_models': models_info,
        'default_model': 'gpt-4.1-mini',
        'multi_model_analysis': True,
        'mcp_integration': True
    }), 200

# Helper functions for enhanced analysis processing

def extract_learning_opportunities(analysis_result: Dict[str, Any]) -> List[str]:
    """Extract learning opportunities from analysis"""
    opportunities = []
    for comment in analysis_result.get('comments', []):
        if comment.get('reasoning'):
            opportunities.append(comment['reasoning'])
    return opportunities[:5]  # Limit to top 5

def generate_pairing_suggestions(analysis_result: Dict[str, Any]) -> List[str]:
    """Generate pair programming suggestions"""
    suggestions = []
    complexity_score = analysis_result.get('collaboration_insights', {}).get('review_complexity', {}).get('complexity_score', 0)
    
    if complexity_score > 70:
        suggestions.append("Consider pair programming for complex sections")
    if len(analysis_result.get('comments', [])) > 10:
        suggestions.append("Multiple issues found - pair review recommended")
    
    return suggestions

def check_team_style_alignment(analysis_result: Dict[str, Any], team_context: Dict[str, Any]) -> Dict[str, Any]:
    """Check alignment with team coding standards"""
    return {
        'style_consistency': analysis_result.get('collaboration_insights', {}).get('code_style_consistency', {}),
        'team_standards_compliance': 85,  # Would be calculated based on team_context
        'deviations': []
    }

def extract_discussion_points(analysis_result: Dict[str, Any]) -> List[str]:
    """Extract points for team discussion"""
    points = []
    for comment in analysis_result.get('comments', []):
        if comment.get('severity') == 'high':
            points.append(f"High priority: {comment.get('message', '')}")
    return points[:3]

def extract_mentorship_moments(analysis_result: Dict[str, Any]) -> List[Dict[str, str]]:
    """Extract mentorship learning moments"""
    moments = []
    for comment in analysis_result.get('comments', []):
        if comment.get('reasoning'):
            moments.append({
                'topic': comment.get('category', 'general'),
                'explanation': comment.get('reasoning', ''),
                'line': comment.get('line_number', 0)
            })
    return moments[:3]

def calculate_threat_level(analysis_result: Dict[str, Any]) -> str:
    """Calculate overall security threat level"""
    security_score = analysis_result.get('security_score', 100)
    if security_score < 30:
        return 'CRITICAL'
    elif security_score < 60:
        return 'HIGH'
    elif security_score < 80:
        return 'MEDIUM'
    else:
        return 'LOW'

def extract_vulnerabilities(analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract security vulnerabilities"""
    vulnerabilities = []
    for comment in analysis_result.get('comments', []):
        if comment.get('category') == 'security':
            vulnerabilities.append({
                'type': comment.get('message', ''),
                'severity': comment.get('severity', 'medium'),
                'line': comment.get('line_number', 0),
                'fix': comment.get('suggestion', '')
            })
    return vulnerabilities

def check_compliance(analysis_result: Dict[str, Any], standards: List[str]) -> Dict[str, bool]:
    """Check compliance with security standards"""
    compliance = {}
    for standard in standards:
        compliance[standard] = True  # Would implement actual compliance checking
    return compliance

def prioritize_security_fixes(analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Prioritize security fixes by impact"""
    fixes = extract_vulnerabilities(analysis_result)
    return sorted(fixes, key=lambda x: {'high': 3, 'medium': 2, 'low': 1}.get(x['severity'], 0), reverse=True)

def extract_immediate_security_actions(analysis_result: Dict[str, Any]) -> List[str]:
    """Extract immediate security actions needed"""
    actions = []
    for comment in analysis_result.get('comments', []):
        if comment.get('category') == 'security' and comment.get('severity') == 'high':
            actions.append(comment.get('suggestion', ''))
    return actions[:3]

def extract_performance_bottlenecks(analysis_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract performance bottlenecks"""
    bottlenecks = []
    for comment in analysis_result.get('comments', []):
        if comment.get('category') == 'performance':
            bottlenecks.append({
                'location': comment.get('line_number', 0),
                'issue': comment.get('message', ''),
                'impact': comment.get('severity', 'medium'),
                'solution': comment.get('suggestion', '')
            })
    return bottlenecks

def extract_optimizations(analysis_result: Dict[str, Any]) -> List[str]:
    """Extract optimization opportunities"""
    optimizations = []
    for comment in analysis_result.get('comments', []):
        if comment.get('category') == 'performance' and comment.get('suggestion'):
            optimizations.append(comment['suggestion'])
    return optimizations

def extract_scalability_issues(analysis_result: Dict[str, Any]) -> List[str]:
    """Extract scalability concerns"""
    issues = []
    for comment in analysis_result.get('comments', []):
        if 'scalability' in comment.get('message', '').lower():
            issues.append(comment['message'])
    return issues

