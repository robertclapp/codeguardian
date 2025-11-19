"""
AI Code Explanation routes for CodeGuardian

Provides natural language explanations for code at various complexity levels.
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.user import User
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

explanations_bp = Blueprint('explanations', __name__)


# Complexity levels for explanations
COMPLEXITY_LEVELS = {
    'beginner': {
        'name': 'Beginner',
        'description': 'Simple explanations using basic concepts, suitable for those new to programming',
        'style': 'Use simple analogies, avoid jargon, explain every concept step by step'
    },
    'intermediate': {
        'name': 'Intermediate',
        'description': 'Balanced explanations assuming familiarity with programming basics',
        'style': 'Use technical terms with brief explanations, focus on logic flow and patterns'
    },
    'advanced': {
        'name': 'Advanced',
        'description': 'Technical explanations for experienced developers',
        'style': 'Use technical terminology freely, discuss performance implications and edge cases'
    },
    'expert': {
        'name': 'Expert',
        'description': 'Deep technical analysis for senior developers',
        'style': 'Focus on architecture, optimization, tradeoffs, and advanced patterns'
    }
}


# In-memory storage for explanations and Q&A
_explanations: Dict[int, Dict[str, Any]] = {}
_qa_sessions: Dict[int, List[Dict[str, Any]]] = {}
_explanation_counter = 0


@explanations_bp.route('/explain', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def explain_code() -> Tuple[Any, int]:
    """
    Generate natural language explanation for code.

    Request Body:
        code (str): Code to explain
        language (str): Programming language
        complexity (str, optional): Complexity level (beginner, intermediate, advanced, expert)
        focus (str, optional): Specific aspect to focus on (logic, performance, security, etc.)
        line_by_line (bool, optional): Generate line-by-line explanations

    Returns:
        Code explanation.
    """
    global _explanation_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    code = RequestValidator.get_required_field(data, 'code', str)
    language = RequestValidator.get_required_field(data, 'language', str)
    complexity = RequestValidator.get_optional_field(data, 'complexity', 'intermediate', str)
    focus = RequestValidator.get_optional_field(data, 'focus', 'general', str)
    line_by_line = RequestValidator.get_optional_field(data, 'line_by_line', False, bool)

    # Validate complexity
    if complexity not in COMPLEXITY_LEVELS:
        raise ValidationError(
            f"Invalid complexity level. Must be one of: {', '.join(COMPLEXITY_LEVELS.keys())}",
            field='complexity'
        )

    # Validate code length
    if len(code) > 50000:
        raise ValidationError("Code must be 50,000 characters or less", field='code')

    # Generate explanation (simulated - in production would call AI service)
    explanation = _generate_explanation(code, language, complexity, focus, line_by_line)

    # Store explanation
    _explanation_counter += 1
    explanation_id = _explanation_counter
    now = datetime.utcnow().isoformat()

    stored = {
        'id': explanation_id,
        'user_id': user.id,
        'code': code,
        'language': language,
        'complexity': complexity,
        'focus': focus,
        'explanation': explanation,
        'created_at': now
    }

    _explanations[explanation_id] = stored

    logger.info(f"User {user.id} generated explanation {explanation_id}")

    return APIResponse.success(
        data={
            'explanation_id': explanation_id,
            **explanation
        },
        message="Code explanation generated successfully"
    )


def _generate_explanation(code: str, language: str, complexity: str, focus: str, line_by_line: bool) -> Dict[str, Any]:
    """Generate code explanation (simulated AI response)."""
    lines = code.strip().split('\n')
    complexity_info = COMPLEXITY_LEVELS[complexity]

    result = {
        'summary': _generate_summary(code, language, complexity),
        'detailed_explanation': _generate_detailed_explanation(code, language, complexity, focus),
        'key_concepts': _extract_key_concepts(code, language),
        'complexity_level': complexity,
        'focus_area': focus,
        'language': language,
        'metrics': {
            'lines_of_code': len(lines),
            'estimated_complexity': _estimate_complexity(code),
            'concepts_identified': 5
        }
    }

    if line_by_line:
        result['line_explanations'] = _generate_line_explanations(lines, language, complexity)

    # Add related documentation and resources
    result['resources'] = _get_related_resources(code, language)

    return result


def _generate_summary(code: str, language: str, complexity: str) -> str:
    """Generate a summary of the code."""
    # In production, this would be generated by AI
    lines = len(code.split('\n'))

    if complexity == 'beginner':
        return f"""This is a {language} code snippet with {lines} lines.

The code appears to define functions and process data. Think of it like a recipe - it has ingredients (variables) and instructions (functions) that tell the computer what to do step by step.

Key points:
- The code takes some input and produces output
- It uses common programming patterns to organize the logic
- Each part has a specific job to do"""

    elif complexity == 'intermediate':
        return f"""This {language} code ({lines} lines) implements data processing logic.

The code structure follows common design patterns:
- Input validation and processing
- Core business logic execution
- Result formatting and return

The implementation uses standard library functions and follows conventional patterns for error handling."""

    else:
        return f"""This {language} implementation ({lines} LOC) demonstrates a data transformation pipeline.

Architecture overview:
- Modular design with clear separation of concerns
- Defensive input validation with fail-fast semantics
- Efficient data structures for O(n) complexity
- Comprehensive error handling with context preservation"""


def _generate_detailed_explanation(code: str, language: str, complexity: str, focus: str) -> str:
    """Generate detailed explanation based on focus area."""
    focus_explanations = {
        'general': """### Overall Structure

The code is organized into logical sections:

1. **Imports and Dependencies**: External modules needed for functionality
2. **Configuration**: Constants and settings
3. **Core Functions**: Main logic implementation
4. **Helper Functions**: Utility operations
5. **Entry Point**: Where execution begins

### Control Flow

The program follows a sequential flow with conditional branches for different scenarios.
Error handling is implemented using try-except blocks to gracefully handle unexpected situations.

### Data Flow

Data enters through parameters, gets transformed through processing functions,
and exits as return values or side effects.""",

        'performance': """### Performance Analysis

**Time Complexity**: O(n) - linear time where n is input size
**Space Complexity**: O(n) - additional space for data structures

**Potential Optimizations**:
- Consider caching repeated computations
- Use generators for memory efficiency with large datasets
- Profile hot paths for micro-optimizations

**Resource Usage**:
- Memory allocation is within acceptable bounds
- No obvious memory leaks detected
- I/O operations are non-blocking where possible""",

        'security': """### Security Considerations

**Input Validation**:
- Inputs should be validated before processing
- Type checking prevents injection attacks
- Boundary checks prevent overflow vulnerabilities

**Data Protection**:
- Sensitive data should be encrypted
- Avoid logging credentials or PII
- Use parameterized queries for database operations

**Best Practices**:
- Follow principle of least privilege
- Sanitize all user inputs
- Implement proper error handling without information leakage""",

        'logic': """### Logic Breakdown

**Primary Algorithm**:
The code implements a transformation algorithm that:
1. Accepts input parameters
2. Validates constraints
3. Applies transformation rules
4. Returns processed results

**Decision Points**:
- Conditional branches handle different scenarios
- Guard clauses prevent invalid states
- Default values provide fallbacks

**State Management**:
- Variables track intermediate results
- State transitions are explicit
- Final state represents computation result"""
    }

    return focus_explanations.get(focus, focus_explanations['general'])


def _extract_key_concepts(code: str, language: str) -> List[Dict[str, str]]:
    """Extract key programming concepts from code."""
    # In production, this would use AI to identify actual concepts
    concepts = [
        {
            'name': 'Functions',
            'description': 'Reusable blocks of code that perform specific tasks',
            'example_in_code': 'Function definitions organize logic into manageable pieces'
        },
        {
            'name': 'Variables',
            'description': 'Named containers for storing data values',
            'example_in_code': 'Variables hold intermediate results and state'
        },
        {
            'name': 'Control Flow',
            'description': 'Structures that control the order of execution',
            'example_in_code': 'If statements and loops direct program flow'
        },
        {
            'name': 'Data Structures',
            'description': 'Organized ways to store and access data',
            'example_in_code': 'Lists, dictionaries, or objects store related data'
        },
        {
            'name': 'Error Handling',
            'description': 'Mechanisms to handle unexpected situations',
            'example_in_code': 'Try-except blocks catch and handle errors'
        }
    ]

    return concepts


def _estimate_complexity(code: str) -> str:
    """Estimate code complexity."""
    lines = len(code.split('\n'))
    if lines < 20:
        return 'Low'
    elif lines < 50:
        return 'Medium'
    elif lines < 100:
        return 'High'
    else:
        return 'Very High'


def _generate_line_explanations(lines: List[str], language: str, complexity: str) -> List[Dict[str, Any]]:
    """Generate explanations for each line."""
    explanations = []

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        if not stripped:
            continue

        explanation = {
            'line_number': i,
            'code': line,
            'explanation': _explain_line(stripped, language, complexity),
            'purpose': _get_line_purpose(stripped, language)
        }

        explanations.append(explanation)

    return explanations


def _explain_line(line: str, language: str, complexity: str) -> str:
    """Explain a single line of code."""
    # Simple heuristic explanations (AI would generate better ones)
    if line.startswith('#') or line.startswith('//'):
        return "This is a comment explaining the code"
    elif 'import' in line or 'from' in line:
        return "This imports external functionality into the program"
    elif 'def ' in line or 'function ' in line:
        return "This defines a new function that can be called later"
    elif 'class ' in line:
        return "This defines a new class (blueprint for objects)"
    elif 'return ' in line:
        return "This returns a value from the function"
    elif 'if ' in line:
        return "This checks a condition and branches accordingly"
    elif 'for ' in line or 'while ' in line:
        return "This creates a loop to repeat actions"
    elif '=' in line and '==' not in line:
        return "This assigns a value to a variable"
    else:
        return "This performs an operation as part of the program logic"


def _get_line_purpose(line: str, language: str) -> str:
    """Get the purpose category of a line."""
    if line.startswith('#') or line.startswith('//'):
        return 'documentation'
    elif 'import' in line or 'from' in line:
        return 'import'
    elif 'def ' in line or 'function ' in line or 'class ' in line:
        return 'definition'
    elif 'return ' in line:
        return 'return'
    elif 'if ' in line or 'elif ' in line or 'else' in line:
        return 'conditional'
    elif 'for ' in line or 'while ' in line:
        return 'loop'
    elif '=' in line:
        return 'assignment'
    else:
        return 'execution'


def _get_related_resources(code: str, language: str) -> List[Dict[str, str]]:
    """Get related learning resources."""
    resources = [
        {
            'title': f'{language.title()} Documentation',
            'url': f'https://docs.python.org/' if language == 'python' else f'https://developer.mozilla.org/',
            'type': 'documentation'
        },
        {
            'title': 'Design Patterns',
            'url': 'https://refactoring.guru/design-patterns',
            'type': 'learning'
        },
        {
            'title': 'Clean Code Principles',
            'url': 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
            'type': 'book'
        }
    ]

    return resources


@explanations_bp.route('/explain/<int:explanation_id>/ask', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def ask_question(explanation_id: int) -> Tuple[Any, int]:
    """
    Ask a follow-up question about explained code.

    Path Parameters:
        explanation_id: ID of the explanation

    Request Body:
        question (str): The question to ask

    Returns:
        Answer to the question.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    question = RequestValidator.get_required_field(data, 'question', str)

    # Get explanation
    explanation = _explanations.get(explanation_id)
    if not explanation:
        raise NotFoundError("Explanation", explanation_id)

    if explanation['user_id'] != user.id:
        raise ValidationError("You can only ask questions about your own explanations")

    # Generate answer (simulated)
    answer = _generate_answer(question, explanation)

    # Store in Q&A session
    if explanation_id not in _qa_sessions:
        _qa_sessions[explanation_id] = []

    qa_entry = {
        'question': question,
        'answer': answer,
        'asked_at': datetime.utcnow().isoformat()
    }

    _qa_sessions[explanation_id].append(qa_entry)

    return APIResponse.success(
        data={
            'question': question,
            'answer': answer,
            'context': {
                'language': explanation['language'],
                'complexity': explanation['complexity']
            }
        },
        message="Question answered"
    )


def _generate_answer(question: str, explanation: Dict) -> str:
    """Generate answer to a question (simulated AI response)."""
    question_lower = question.lower()

    # Simple keyword matching for demo (AI would generate real answers)
    if 'what does' in question_lower or 'what is' in question_lower:
        return f"""Based on the {explanation['language']} code you submitted:

This code performs data processing and transformation. The specific element you're asking about
serves to organize the logic and handle specific scenarios within the program flow.

Key points:
- It's part of the overall program structure
- It works with related components to achieve the goal
- It follows {explanation['language']} conventions"""

    elif 'why' in question_lower:
        return f"""The code is written this way for several reasons:

1. **Readability**: The structure makes it easy to understand the flow
2. **Maintainability**: Modular design allows easy modifications
3. **Performance**: The approach balances efficiency with clarity
4. **Convention**: It follows standard {explanation['language']} patterns

Alternative approaches exist, but this implementation represents a good balance of these factors."""

    elif 'how' in question_lower:
        return f"""Here's how this works:

1. **Input**: Data enters through parameters or external sources
2. **Processing**: The code transforms data through its functions
3. **Output**: Results are returned or stored

Step by step:
- First, inputs are validated
- Then, transformations are applied
- Finally, results are formatted and returned

The {explanation['complexity']} complexity level means we're explaining this with appropriate technical depth."""

    else:
        return f"""Regarding your question about the {explanation['language']} code:

The code implements logic for data processing. Based on the context of your question,
here are some relevant points:

- The code follows standard patterns for {explanation['language']}
- Error handling is implemented for robustness
- The structure supports easy testing and modification

Would you like me to explain any specific part in more detail?"""


@explanations_bp.route('/explain/<int:explanation_id>/qa', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_qa_history(explanation_id: int) -> Tuple[Any, int]:
    """
    Get Q&A history for an explanation.

    Path Parameters:
        explanation_id: ID of the explanation

    Returns:
        List of questions and answers.
    """
    user = request.current_user

    explanation = _explanations.get(explanation_id)
    if not explanation:
        raise NotFoundError("Explanation", explanation_id)

    if explanation['user_id'] != user.id:
        raise ValidationError("You can only view your own Q&A history")

    history = _qa_sessions.get(explanation_id, [])

    return APIResponse.success(
        data={
            'explanation_id': explanation_id,
            'history': history,
            'total_questions': len(history)
        },
        message=f"Found {len(history)} Q&A entries"
    )


@explanations_bp.route('/explain/levels', methods=['GET'])
@cross_origin()
@log_request
@handle_errors
def get_complexity_levels() -> Tuple[Any, int]:
    """
    Get available complexity levels for explanations.

    Returns:
        List of complexity levels.
    """
    levels = [
        {'id': key, **value}
        for key, value in COMPLEXITY_LEVELS.items()
    ]

    return APIResponse.success(
        data={'levels': levels},
        message="Complexity levels retrieved"
    )


@explanations_bp.route('/explain/history', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_explanation_history() -> Tuple[Any, int]:
    """
    Get explanation history for the current user.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        language (str): Filter by language

    Returns:
        Paginated list of explanations.
    """
    user = request.current_user

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param(
        'per_page',
        PaginationConfig.DEFAULT_PER_PAGE,
        min_val=1,
        max_val=PaginationConfig.MAX_PER_PAGE
    )
    language = request.args.get('language', '').lower()

    # Filter explanations
    user_explanations = []
    for exp_id, exp in _explanations.items():
        if exp['user_id'] != user.id:
            continue
        if language and exp.get('language', '').lower() != language:
            continue

        # Summary without full code
        summary = {
            'id': exp_id,
            'language': exp['language'],
            'complexity': exp['complexity'],
            'focus': exp['focus'],
            'code_preview': exp['code'][:100] + '...' if len(exp['code']) > 100 else exp['code'],
            'created_at': exp['created_at']
        }
        user_explanations.append(summary)

    # Sort by created_at descending
    user_explanations.sort(key=lambda x: x['created_at'], reverse=True)

    # Paginate
    total = len(user_explanations)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = user_explanations[start:end]

    return APIResponse.paginated(
        items=paginated,
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} explanations"
    )


@explanations_bp.route('/explain/compare', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def compare_code() -> Tuple[Any, int]:
    """
    Compare two code snippets and explain differences.

    Request Body:
        code_a (str): First code snippet
        code_b (str): Second code snippet
        language (str): Programming language
        complexity (str, optional): Explanation complexity level

    Returns:
        Comparison explanation.
    """
    data = RequestValidator.get_json_body()

    code_a = RequestValidator.get_required_field(data, 'code_a', str)
    code_b = RequestValidator.get_required_field(data, 'code_b', str)
    language = RequestValidator.get_required_field(data, 'language', str)
    complexity = RequestValidator.get_optional_field(data, 'complexity', 'intermediate', str)

    # Generate comparison (simulated)
    comparison = {
        'overview': f"""## Code Comparison Analysis

### Summary
Comparing two {language} code snippets to identify differences in approach,
style, and implementation.

### Key Differences

1. **Structure**: The two snippets differ in their organizational approach
2. **Style**: Naming conventions and formatting vary
3. **Logic**: Some algorithmic differences are present

### Recommendation
Based on best practices, consider the following improvements for both versions.""",

        'differences': [
            {
                'aspect': 'Code Organization',
                'code_a': 'Uses linear structure',
                'code_b': 'Uses modular structure',
                'recommendation': 'Prefer modular structure for maintainability'
            },
            {
                'aspect': 'Error Handling',
                'code_a': 'Basic error handling',
                'code_b': 'Comprehensive error handling',
                'recommendation': 'Implement comprehensive error handling'
            },
            {
                'aspect': 'Performance',
                'code_a': 'O(n) complexity',
                'code_b': 'O(n log n) complexity',
                'recommendation': 'Choose based on use case requirements'
            }
        ],

        'metrics': {
            'code_a': {
                'lines': len(code_a.split('\n')),
                'complexity': _estimate_complexity(code_a)
            },
            'code_b': {
                'lines': len(code_b.split('\n')),
                'complexity': _estimate_complexity(code_b)
            }
        }
    }

    return APIResponse.success(
        data=comparison,
        message="Code comparison generated"
    )
