"""
Auto-Fix Suggestions routes for CodeGuardian

Provides AI-generated code fixes that can be automatically applied.
"""

import logging
import json
import difflib
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.review import Review, ReviewComment
from src.models.repository import Repository, PullRequest
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

fixes_bp = Blueprint('fixes', __name__)


@fixes_bp.route('/reviews/<int:review_id>/fixes', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_fixes(review_id: int) -> Tuple[Any, int]:
    """
    Get AI-generated fix suggestions for a review.

    Path Parameters:
        review_id: ID of the review

    Returns:
        List of suggested fixes with code snippets.
    """
    user = request.current_user

    # Get review and verify ownership
    review = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Review.id == review_id,
        Repository.user_id == user.id
    ).first()

    if not review:
        raise NotFoundError("Review", review_id)

    # Get comments with fix suggestions
    comments = db.session.query(ReviewComment).filter(
        ReviewComment.review_id == review_id
    ).all()

    fixes = []
    for comment in comments:
        # Generate fix suggestion for each issue
        fix = _generate_fix_suggestion(comment)
        if fix:
            fixes.append(fix)

    # Sort by severity (critical first)
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3}
    fixes.sort(key=lambda x: severity_order.get(x['severity'], 4))

    auto_applicable_count = sum(1 for f in fixes if f['auto_applicable'])

    return APIResponse.success(
        data={
            'fixes': fixes,
            'total_fixes': len(fixes),
            'auto_applicable_count': auto_applicable_count,
            'review_id': review_id
        },
        message=f"Found {len(fixes)} fix suggestions"
    )


@fixes_bp.route('/reviews/<int:review_id>/fixes/<string:fix_id>', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def apply_fix(review_id: int, fix_id: str) -> Tuple[Any, int]:
    """
    Apply a specific fix suggestion.

    Path Parameters:
        review_id: ID of the review
        fix_id: ID of the fix to apply

    Returns:
        Applied fix result with updated code.
    """
    user = request.current_user

    # Verify review ownership
    review = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Review.id == review_id,
        Repository.user_id == user.id
    ).first()

    if not review:
        raise NotFoundError("Review", review_id)

    # Get the comment for this fix
    comment_id = fix_id.replace('fix_', '')
    comment = db.session.query(ReviewComment).filter(
        ReviewComment.id == int(comment_id),
        ReviewComment.review_id == review_id
    ).first()

    if not comment:
        raise NotFoundError("Fix", fix_id)

    # Generate and apply the fix
    fix = _generate_fix_suggestion(comment)
    if not fix or not fix['auto_applicable']:
        raise ValidationError("This fix cannot be automatically applied")

    # In a real implementation, this would:
    # 1. Fetch the actual file from the repository
    # 2. Apply the fix
    # 3. Create a commit or PR with the changes
    # For now, return the simulated result

    result = {
        'fix_id': fix_id,
        'applied': True,
        'original_code': fix['original_code'],
        'fixed_code': fix['suggested_fix'],
        'diff': _generate_diff(fix['original_code'], fix['suggested_fix']),
        'applied_at': datetime.utcnow().isoformat()
    }

    logger.info(f"Applied fix {fix_id} for review {review_id} by user {user.id}")

    return APIResponse.success(
        data=result,
        message="Fix applied successfully"
    )


@fixes_bp.route('/reviews/<int:review_id>/fixes/bulk', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def apply_bulk_fixes(review_id: int) -> Tuple[Any, int]:
    """
    Apply multiple fixes at once.

    Path Parameters:
        review_id: ID of the review

    Request Body:
        fix_ids (list): List of fix IDs to apply

    Returns:
        Results for each fix application.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    fix_ids = RequestValidator.get_required_field(data, 'fix_ids', list)

    if not fix_ids:
        raise ValidationError("fix_ids cannot be empty", field='fix_ids')

    if len(fix_ids) > 50:
        raise ValidationError("Cannot apply more than 50 fixes at once", field='fix_ids')

    # Verify review ownership
    review = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Review.id == review_id,
        Repository.user_id == user.id
    ).first()

    if not review:
        raise NotFoundError("Review", review_id)

    results = {
        'applied': [],
        'failed': [],
        'skipped': []
    }

    for fix_id in fix_ids:
        try:
            comment_id = fix_id.replace('fix_', '')
            comment = db.session.query(ReviewComment).filter(
                ReviewComment.id == int(comment_id),
                ReviewComment.review_id == review_id
            ).first()

            if not comment:
                results['skipped'].append({
                    'fix_id': fix_id,
                    'reason': 'Fix not found'
                })
                continue

            fix = _generate_fix_suggestion(comment)
            if not fix or not fix['auto_applicable']:
                results['skipped'].append({
                    'fix_id': fix_id,
                    'reason': 'Not auto-applicable'
                })
                continue

            # Apply the fix (simulated)
            results['applied'].append({
                'fix_id': fix_id,
                'applied_at': datetime.utcnow().isoformat()
            })

        except Exception as e:
            logger.error(f"Failed to apply fix {fix_id}: {str(e)}")
            results['failed'].append({
                'fix_id': fix_id,
                'reason': str(e)
            })

    return APIResponse.success(
        data={
            **results,
            'summary': {
                'total': len(fix_ids),
                'applied': len(results['applied']),
                'failed': len(results['failed']),
                'skipped': len(results['skipped'])
            }
        },
        message=f"Applied {len(results['applied'])} of {len(fix_ids)} fixes"
    )


@fixes_bp.route('/reviews/<int:review_id>/fixes/preview', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def preview_fix(review_id: int) -> Tuple[Any, int]:
    """
    Preview a fix before applying it.

    Path Parameters:
        review_id: ID of the review

    Request Body:
        fix_id (str): ID of the fix to preview

    Returns:
        Diff preview of the fix.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    fix_id = RequestValidator.get_required_field(data, 'fix_id', str)

    # Verify review ownership
    review = db.session.query(Review).join(
        PullRequest
    ).join(
        Repository
    ).filter(
        Review.id == review_id,
        Repository.user_id == user.id
    ).first()

    if not review:
        raise NotFoundError("Review", review_id)

    # Get the comment for this fix
    comment_id = fix_id.replace('fix_', '')
    comment = db.session.query(ReviewComment).filter(
        ReviewComment.id == int(comment_id),
        ReviewComment.review_id == review_id
    ).first()

    if not comment:
        raise NotFoundError("Fix", fix_id)

    fix = _generate_fix_suggestion(comment)
    if not fix:
        raise NotFoundError("Fix suggestion", fix_id)

    # Generate detailed diff
    diff_lines = _generate_diff(fix['original_code'], fix['suggested_fix'])

    # Count changes
    additions = sum(1 for line in diff_lines if line.startswith('+') and not line.startswith('+++'))
    deletions = sum(1 for line in diff_lines if line.startswith('-') and not line.startswith('---'))

    preview = {
        'fix_id': fix_id,
        'original_code': fix['original_code'],
        'suggested_fix': fix['suggested_fix'],
        'diff': diff_lines,
        'stats': {
            'additions': additions,
            'deletions': deletions,
            'total_changes': additions + deletions
        },
        'explanation': fix['explanation'],
        'confidence': fix['confidence'],
        'can_auto_apply': fix['auto_applicable']
    }

    return APIResponse.success(
        data=preview,
        message="Fix preview generated"
    )


@fixes_bp.route('/code/analyze-fix', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def analyze_code_for_fixes() -> Tuple[Any, int]:
    """
    Analyze code snippet and suggest fixes without creating a review.

    Request Body:
        code (str): Code to analyze
        language (str): Programming language

    Returns:
        List of suggested fixes.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    code = RequestValidator.get_required_field(data, 'code', str)
    language = RequestValidator.get_optional_field(data, 'language', 'javascript', str)

    # Validate code size
    RequestValidator.validate_code_size(code)

    # Analyze code and generate fixes
    fixes = _analyze_code_for_fixes(code, language)

    return APIResponse.success(
        data={
            'fixes': fixes,
            'total_fixes': len(fixes),
            'auto_applicable_count': sum(1 for f in fixes if f['auto_applicable']),
            'language': language
        },
        message=f"Found {len(fixes)} potential fixes"
    )


# Helper functions

def _generate_fix_suggestion(comment: ReviewComment) -> Optional[Dict[str, Any]]:
    """Generate a fix suggestion for a review comment."""
    if not comment.suggestion:
        return None

    # In a real implementation, this would use AI to generate actual fixes
    # For now, return structured suggestions based on the comment

    fix = {
        'id': f"fix_{comment.id}",
        'line_number': comment.line_number or 0,
        'issue_type': comment.category or 'general',
        'severity': comment.severity or 'medium',
        'original_code': _get_sample_original_code(comment),
        'suggested_fix': _get_sample_fixed_code(comment),
        'explanation': comment.suggestion,
        'confidence': 0.85,
        'auto_applicable': _is_auto_applicable(comment)
    }

    return fix


def _get_sample_original_code(comment: ReviewComment) -> str:
    """Get sample original code for demonstration."""
    # In production, this would fetch the actual code from the repository
    category = comment.category or ''

    if 'security' in category.lower():
        return "password = request.args.get('pwd')"
    elif 'performance' in category.lower():
        return "for item in items:\n    result.append(process(item))"
    elif 'maintainability' in category.lower():
        return "def func(a, b, c, d, e, f, g):\n    return a + b + c + d + e + f + g"
    else:
        return "# Original code would appear here"


def _get_sample_fixed_code(comment: ReviewComment) -> str:
    """Get sample fixed code for demonstration."""
    category = comment.category or ''

    if 'security' in category.lower():
        return "password = request.form.get('pwd')  # Use POST instead of GET"
    elif 'performance' in category.lower():
        return "result = [process(item) for item in items]  # List comprehension"
    elif 'maintainability' in category.lower():
        return "def func(config: Config):\n    return sum(config.values)"
    else:
        return "# Fixed code would appear here"


def _is_auto_applicable(comment: ReviewComment) -> bool:
    """Determine if a fix can be automatically applied."""
    # Simple heuristic - could be enhanced with AI
    if not comment.suggestion:
        return False

    severity = comment.severity or 'medium'

    # Don't auto-apply critical changes without review
    if severity == 'critical':
        return False

    return True


def _generate_diff(original: str, fixed: str) -> List[str]:
    """Generate unified diff between original and fixed code."""
    original_lines = original.splitlines(keepends=True)
    fixed_lines = fixed.splitlines(keepends=True)

    diff = difflib.unified_diff(
        original_lines,
        fixed_lines,
        fromfile='original',
        tofile='fixed',
        lineterm=''
    )

    return list(diff)


def _analyze_code_for_fixes(code: str, language: str) -> List[Dict[str, Any]]:
    """Analyze code and generate fix suggestions."""
    fixes = []
    lines = code.split('\n')

    # Simple pattern-based analysis for demonstration
    # In production, this would use AI models

    for i, line in enumerate(lines, 1):
        # Check for common issues

        # Security: SQL injection
        if "execute(" in line and "%" in line:
            fixes.append({
                'id': f"fix_inline_{i}_1",
                'line_number': i,
                'issue_type': 'security',
                'severity': 'critical',
                'original_code': line.strip(),
                'suggested_fix': line.replace('%s', '?').replace('%', '').strip(),
                'explanation': 'Use parameterized queries to prevent SQL injection',
                'confidence': 0.95,
                'auto_applicable': True
            })

        # Performance: String concatenation in loop
        if '+=' in line and ('str' in line or '"' in line or "'" in line):
            fixes.append({
                'id': f"fix_inline_{i}_2",
                'line_number': i,
                'issue_type': 'performance',
                'severity': 'medium',
                'original_code': line.strip(),
                'suggested_fix': "# Consider using ''.join() for string concatenation",
                'explanation': 'String concatenation with += is O(n^2). Use join() for better performance.',
                'confidence': 0.75,
                'auto_applicable': False
            })

        # Security: Hardcoded credentials
        if any(keyword in line.lower() for keyword in ['password', 'secret', 'api_key']):
            if '=' in line and ('"' in line or "'" in line):
                fixes.append({
                    'id': f"fix_inline_{i}_3",
                    'line_number': i,
                    'issue_type': 'security',
                    'severity': 'critical',
                    'original_code': line.strip(),
                    'suggested_fix': "# Move to environment variables: os.environ.get('SECRET_NAME')",
                    'explanation': 'Hardcoded credentials should be moved to environment variables',
                    'confidence': 0.90,
                    'auto_applicable': False
                })

    return fixes
