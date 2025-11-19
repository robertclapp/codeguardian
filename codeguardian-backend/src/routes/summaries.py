"""
Summary Generation and Code Explanations for CodeGuardian

Auto-generate PR descriptions, changelogs, documentation,
and inline code explanations.
"""

from datetime import datetime
from typing import Dict, List
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from src.database import db
from src.models.repository import Repository
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService


summaries_bp = Blueprint('summaries', __name__)


# Models

class GeneratedSummary(db.Model):
    """Generated summaries and documentation"""
    __tablename__ = 'generated_summaries'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'))
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'))

    # Summary type
    summary_type = db.Column(db.String(50), nullable=False)  # pr_description, changelog, docs, explanation
    title = db.Column(db.String(200))

    # Content
    content = db.Column(db.Text, nullable=False)
    format = db.Column(db.String(20), default='markdown')  # markdown, plaintext, html

    # Source context
    source_code = db.Column(db.Text)
    file_path = db.Column(db.String(500))

    # Metadata
    tokens_used = db.Column(db.Integer)
    generation_time_ms = db.Column(db.Integer)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='generated_summaries')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'summary_type': self.summary_type,
            'title': self.title,
            'content': self.content,
            'format': self.format,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# API Routes - PR Description Generation

@summaries_bp.route('/summaries/pr-description', methods=['POST'])
@jwt_required()
def generate_pr_description():
    """
    Generate PR description from review results.

    Request Body:
        review_id (int): Review to generate description for
        style (str): Style of description (detailed, concise, technical)
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    review_id = data.get('review_id')
    if not review_id:
        return APIResponse.validation_error("review_id is required")

    review = Review.query.filter_by(id=review_id, user_id=user_id).first()
    if not review:
        return APIResponse.not_found('Review', review_id)

    style = data.get('style', 'detailed')

    # Generate PR description
    import time
    start_time = time.time()

    description = _generate_pr_description(review, style)

    generation_time = int((time.time() - start_time) * 1000)

    # Save summary
    summary = GeneratedSummary(
        user_id=user_id,
        review_id=review_id,
        summary_type='pr_description',
        title='Pull Request Description',
        content=description,
        generation_time_ms=generation_time
    )

    db.session.add(summary)
    db.session.commit()

    return APIResponse.success({
        'summary_id': summary.id,
        'description': description,
        'style': style
    })


@summaries_bp.route('/summaries/changelog', methods=['POST'])
@jwt_required()
def generate_changelog():
    """
    Generate changelog entry from reviews.

    Request Body:
        repository_id (int): Repository
        review_ids (list): Reviews to include
        version (str): Version number
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_id = data.get('repository_id')
    review_ids = data.get('review_ids', [])
    version = data.get('version', '1.0.0')

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Get reviews
    reviews = Review.query.filter(
        Review.id.in_(review_ids),
        Review.user_id == user_id
    ).all()

    # Generate changelog
    changelog = _generate_changelog(reviews, version)

    # Save summary
    summary = GeneratedSummary(
        user_id=user_id,
        repository_id=repository_id,
        summary_type='changelog',
        title=f'Changelog v{version}',
        content=changelog
    )

    db.session.add(summary)
    db.session.commit()

    return APIResponse.success({
        'summary_id': summary.id,
        'changelog': changelog,
        'version': version
    })


@summaries_bp.route('/summaries/release-notes', methods=['POST'])
@jwt_required()
def generate_release_notes():
    """Generate release notes from recent reviews"""
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_id = data.get('repository_id')
    version = data.get('version', '1.0.0')
    include_breaking = data.get('include_breaking', True)

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Get recent reviews
    reviews = Review.query.filter_by(
        repository_id=repository_id,
        user_id=user_id
    ).order_by(Review.created_at.desc()).limit(20).all()

    # Generate release notes
    notes = _generate_release_notes(reviews, version, include_breaking)

    summary = GeneratedSummary(
        user_id=user_id,
        repository_id=repository_id,
        summary_type='release_notes',
        title=f'Release Notes v{version}',
        content=notes
    )

    db.session.add(summary)
    db.session.commit()

    return APIResponse.success({
        'summary_id': summary.id,
        'release_notes': notes
    })


# API Routes - Code Explanations

@summaries_bp.route('/summaries/explain', methods=['POST'])
@jwt_required()
def explain_code():
    """
    Generate explanation for code block.

    Request Body:
        code (str): Code to explain
        language (str): Programming language
        detail_level (str): brief, detailed, expert
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code')
    if not code:
        return APIResponse.validation_error("code is required")

    language = data.get('language', 'python')
    detail_level = data.get('detail_level', 'detailed')

    # Generate explanation
    explanation = _generate_code_explanation(code, language, detail_level)

    # Save summary
    summary = GeneratedSummary(
        user_id=user_id,
        summary_type='explanation',
        title='Code Explanation',
        content=explanation,
        source_code=code
    )

    db.session.add(summary)
    db.session.commit()

    return APIResponse.success({
        'summary_id': summary.id,
        'explanation': explanation,
        'language': language
    })


@summaries_bp.route('/summaries/document', methods=['POST'])
@jwt_required()
def generate_documentation():
    """
    Generate documentation for code.

    Request Body:
        code (str): Code to document
        language (str): Programming language
        doc_style (str): google, numpy, sphinx
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code')
    if not code:
        return APIResponse.validation_error("code is required")

    language = data.get('language', 'python')
    doc_style = data.get('doc_style', 'google')

    # Generate documentation
    documentation = _generate_documentation(code, language, doc_style)

    summary = GeneratedSummary(
        user_id=user_id,
        summary_type='docs',
        title='Generated Documentation',
        content=documentation,
        source_code=code
    )

    db.session.add(summary)
    db.session.commit()

    return APIResponse.success({
        'summary_id': summary.id,
        'documentation': documentation
    })


@summaries_bp.route('/summaries/inline-comments', methods=['POST'])
@jwt_required()
def generate_inline_comments():
    """Generate inline comments for code"""
    user_id = get_jwt_identity()
    data = request.get_json()

    code = data.get('code')
    if not code:
        return APIResponse.validation_error("code is required")

    language = data.get('language', 'python')

    # Generate commented code
    commented_code = _add_inline_comments(code, language)

    return APIResponse.success({
        'original_code': code,
        'commented_code': commented_code
    })


# API Routes - Team Updates

@summaries_bp.route('/summaries/team-update', methods=['POST'])
@jwt_required()
def generate_team_update():
    """Generate team update summary"""
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_id = data.get('repository_id')
    period = data.get('period', 'week')

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Get reviews for period
    from datetime import timedelta
    if period == 'week':
        start_date = datetime.utcnow() - timedelta(days=7)
    else:
        start_date = datetime.utcnow() - timedelta(days=30)

    reviews = Review.query.filter(
        Review.repository_id == repository_id,
        Review.created_at >= start_date
    ).all()

    # Generate update
    update = _generate_team_update(reviews, period)

    return APIResponse.success({
        'update': update,
        'period': period,
        'reviews_included': len(reviews)
    })


@summaries_bp.route('/summaries/history', methods=['GET'])
@jwt_required()
def get_summary_history():
    """Get history of generated summaries"""
    user_id = get_jwt_identity()

    summary_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 20)), 100)

    query = GeneratedSummary.query.filter_by(user_id=user_id)

    if summary_type:
        query = query.filter_by(summary_type=summary_type)

    summaries = query.order_by(GeneratedSummary.created_at.desc()).limit(limit).all()

    return APIResponse.success([s.to_dict() for s in summaries])


# Helper Functions

def _generate_pr_description(review: Review, style: str) -> str:
    """Generate PR description from review"""
    results = review.results or {}
    issues = results.get('issues', [])

    # Group issues by category
    categories = {}
    for issue in issues:
        cat = issue.get('category', 'general')
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(issue.get('message', ''))

    # Build description
    if style == 'concise':
        description = f"## Summary\n\nAddressed {len(issues)} code quality issues.\n\n"
        description += "### Changes\n"
        for cat, msgs in categories.items():
            description += f"- {cat.title()}: {len(msgs)} fixes\n"
    else:
        description = "## Summary\n\n"
        description += f"This PR addresses {len(issues)} code quality issues identified during review.\n\n"

        description += "## Changes Made\n\n"
        for cat, msgs in categories.items():
            description += f"### {cat.title()}\n"
            for msg in msgs[:3]:  # Limit to 3 per category
                description += f"- {msg}\n"
            if len(msgs) > 3:
                description += f"- ...and {len(msgs) - 3} more\n"
            description += "\n"

        description += "## Testing\n\n"
        description += "- [ ] Unit tests pass\n"
        description += "- [ ] Integration tests pass\n"
        description += "- [ ] Manual testing completed\n"

    return description


def _generate_changelog(reviews: List[Review], version: str) -> str:
    """Generate changelog from reviews"""
    changelog = f"# Changelog\n\n## [{version}] - {datetime.utcnow().strftime('%Y-%m-%d')}\n\n"

    all_issues = []
    for review in reviews:
        results = review.results or {}
        all_issues.extend(results.get('issues', []))

    # Group by category
    added = []
    changed = []
    fixed = []

    for issue in all_issues:
        cat = issue.get('category', '').lower()
        msg = issue.get('message', '')

        if 'security' in cat:
            fixed.append(f"Security: {msg}")
        elif 'performance' in cat:
            changed.append(f"Performance: {msg}")
        else:
            fixed.append(msg)

    if added:
        changelog += "### Added\n"
        for item in added[:5]:
            changelog += f"- {item}\n"
        changelog += "\n"

    if changed:
        changelog += "### Changed\n"
        for item in changed[:5]:
            changelog += f"- {item}\n"
        changelog += "\n"

    if fixed:
        changelog += "### Fixed\n"
        for item in fixed[:5]:
            changelog += f"- {item}\n"
        changelog += "\n"

    return changelog


def _generate_release_notes(reviews: List[Review], version: str, include_breaking: bool) -> str:
    """Generate release notes"""
    notes = f"# Release Notes v{version}\n\n"
    notes += f"Released: {datetime.utcnow().strftime('%B %d, %Y')}\n\n"

    total_fixes = sum(len((r.results or {}).get('issues', [])) for r in reviews)

    notes += "## Overview\n\n"
    notes += f"This release includes fixes for {total_fixes} code quality issues.\n\n"

    if include_breaking:
        notes += "## Breaking Changes\n\n"
        notes += "- None in this release\n\n"

    notes += "## Improvements\n\n"
    notes += "- Enhanced code quality\n"
    notes += "- Improved security posture\n"
    notes += "- Better performance\n\n"

    notes += "## Upgrade Guide\n\n"
    notes += "1. Pull the latest changes\n"
    notes += "2. Run `npm install` or `pip install -r requirements.txt`\n"
    notes += "3. Run tests to verify\n"

    return notes


def _generate_code_explanation(code: str, language: str, detail_level: str) -> str:
    """Generate explanation for code"""
    lines = code.strip().split('\n')

    explanation = f"## Code Explanation\n\n"
    explanation += f"**Language**: {language}\n\n"

    # Analyze code structure
    if 'def ' in code or 'function ' in code:
        explanation += "### Overview\n"
        explanation += "This code defines one or more functions.\n\n"

    if 'class ' in code:
        explanation += "### Classes\n"
        explanation += "This code defines one or more classes.\n\n"

    if detail_level == 'detailed':
        explanation += "### Line-by-Line Analysis\n\n"
        for i, line in enumerate(lines[:10], 1):
            if line.strip():
                explanation += f"**Line {i}**: `{line.strip()}`\n"
                explanation += f"- {_explain_line(line, language)}\n\n"

    explanation += "### Key Concepts\n"
    if 'async' in code:
        explanation += "- **Asynchronous programming**: Uses async/await for non-blocking operations\n"
    if 'try' in code:
        explanation += "- **Error handling**: Uses try/catch for exception management\n"
    if 'import' in code or 'require' in code:
        explanation += "- **Module imports**: Brings in external dependencies\n"

    return explanation


def _explain_line(line: str, language: str) -> str:
    """Generate explanation for a single line"""
    line = line.strip()

    if line.startswith('def ') or line.startswith('function '):
        return "Defines a function"
    elif line.startswith('class '):
        return "Defines a class"
    elif line.startswith('import ') or line.startswith('from '):
        return "Imports a module"
    elif line.startswith('return '):
        return "Returns a value from the function"
    elif line.startswith('if '):
        return "Conditional statement"
    elif line.startswith('for ') or line.startswith('while '):
        return "Loop structure"
    elif '=' in line and not '==' in line:
        return "Variable assignment"
    else:
        return "Statement"


def _generate_documentation(code: str, language: str, doc_style: str) -> str:
    """Generate documentation for code"""
    # Find functions
    import re

    if language == 'python':
        functions = re.findall(r'def\s+(\w+)\s*\(([^)]*)\)', code)
    else:
        functions = re.findall(r'function\s+(\w+)\s*\(([^)]*)\)', code)

    docs = "# Generated Documentation\n\n"

    for func_name, params in functions:
        params_list = [p.strip() for p in params.split(',') if p.strip()]

        if doc_style == 'google':
            docs += f"## `{func_name}`\n\n"
            docs += "```python\n"
            docs += f'def {func_name}({params}):\n'
            docs += f'    """Description of {func_name}.\n\n'
            if params_list:
                docs += "    Args:\n"
                for param in params_list:
                    param_name = param.split(':')[0].strip()
                    docs += f"        {param_name}: Description of {param_name}\n"
                docs += "\n"
            docs += "    Returns:\n"
            docs += "        Description of return value\n"
            docs += '    """\n'
            docs += "```\n\n"
        else:
            docs += f"### {func_name}\n\n"
            docs += f"**Parameters**: {', '.join(params_list) if params_list else 'None'}\n\n"
            docs += f"**Returns**: TBD\n\n"

    return docs


def _add_inline_comments(code: str, language: str) -> str:
    """Add inline comments to code"""
    lines = code.split('\n')
    commented = []

    comment_char = '#' if language == 'python' else '//'

    for line in lines:
        stripped = line.strip()

        if not stripped or stripped.startswith(comment_char):
            commented.append(line)
            continue

        # Add comment for significant lines
        if 'def ' in line or 'function ' in line:
            commented.append(f"{comment_char} Function definition")
        elif 'class ' in line:
            commented.append(f"{comment_char} Class definition")
        elif 'return ' in line:
            commented.append(f"{comment_char} Return statement")

        commented.append(line)

    return '\n'.join(commented)


def _generate_team_update(reviews: List[Review], period: str) -> str:
    """Generate team update summary"""
    total_issues = sum(len((r.results or {}).get('issues', [])) for r in reviews)

    update = f"# Team Update - {period.title()}\n\n"
    update += f"## Summary\n\n"
    update += f"- **Reviews completed**: {len(reviews)}\n"
    update += f"- **Issues identified**: {total_issues}\n"
    update += f"- **Avg issues per review**: {round(total_issues / len(reviews), 1) if reviews else 0}\n\n"

    update += "## Highlights\n\n"
    update += "- Code quality improving\n"
    update += "- Security posture maintained\n\n"

    update += "## Focus Areas\n\n"
    update += "- Continue addressing performance issues\n"
    update += "- Increase test coverage\n"

    return update
