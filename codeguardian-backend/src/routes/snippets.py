"""
Code Snippet Library routes for CodeGuardian

Provides functionality to save, share, and search high-quality code snippets.
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin
from sqlalchemy import or_, func

from src.database import db
from src.models.user import User
from src.models.repository import Repository
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError, AuthorizationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

snippets_bp = Blueprint('snippets', __name__)


# In-memory storage for snippets (would be a database model in production)
# This is a demonstration - in production, create a Snippet model
_snippets_store: Dict[int, Dict[str, Any]] = {}
_snippet_counter = 0


@snippets_bp.route('/snippets', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_snippets() -> Tuple[Any, int]:
    """
    List code snippets with filtering and pagination.

    Query Parameters:
        page (int): Page number (default: 1)
        per_page (int): Items per page (default: 20, max: 100)
        language (str): Filter by programming language
        category (str): Filter by category
        search (str): Search in title and description
        shared (bool): Include shared snippets from team
        sort (str): Sort by 'created', 'updated', 'title', 'score' (default: 'created')
        order (str): Sort order 'asc' or 'desc' (default: 'desc')

    Returns:
        Paginated list of snippets.
    """
    user = request.current_user

    # Parse pagination
    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param(
        'per_page',
        PaginationConfig.DEFAULT_PER_PAGE,
        min_val=1,
        max_val=PaginationConfig.MAX_PER_PAGE
    )

    # Parse filters
    language = request.args.get('language', '').strip().lower()
    category = request.args.get('category', '').strip().lower()
    search = request.args.get('search', '').strip()
    include_shared = request.args.get('shared', 'true').lower() == 'true'
    sort_by = request.args.get('sort', 'created')
    order = request.args.get('order', 'desc')

    # Filter snippets
    filtered_snippets = []
    for snippet_id, snippet in _snippets_store.items():
        # Check ownership or shared access
        is_owner = snippet['user_id'] == user.id
        is_shared = snippet.get('is_shared', False) and include_shared

        if not is_owner and not is_shared:
            continue

        # Apply filters
        if language and snippet.get('language', '').lower() != language:
            continue

        if category and snippet.get('category', '').lower() != category:
            continue

        if search:
            search_lower = search.lower()
            title_match = search_lower in snippet.get('title', '').lower()
            desc_match = search_lower in snippet.get('description', '').lower()
            code_match = search_lower in snippet.get('code', '').lower()
            if not (title_match or desc_match or code_match):
                continue

        filtered_snippets.append({
            'id': snippet_id,
            **snippet,
            'is_owner': is_owner
        })

    # Sort snippets
    sort_key_map = {
        'created': lambda x: x.get('created_at', ''),
        'updated': lambda x: x.get('updated_at', ''),
        'title': lambda x: x.get('title', '').lower(),
        'score': lambda x: x.get('quality_score', 0)
    }
    sort_key = sort_key_map.get(sort_by, sort_key_map['created'])
    filtered_snippets.sort(key=sort_key, reverse=(order == 'desc'))

    # Paginate
    total = len(filtered_snippets)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_snippets = filtered_snippets[start:end]

    # Get available languages and categories for filters
    all_languages = set()
    all_categories = set()
    for snippet in _snippets_store.values():
        if snippet['user_id'] == user.id or snippet.get('is_shared'):
            all_languages.add(snippet.get('language', 'unknown'))
            all_categories.add(snippet.get('category', 'general'))

    return APIResponse.paginated(
        items=paginated_snippets,
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} snippets"
    )


@snippets_bp.route('/snippets', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def create_snippet() -> Tuple[Any, int]:
    """
    Create a new code snippet.

    Request Body:
        title (str): Snippet title
        code (str): The code content
        language (str): Programming language
        description (str, optional): Description of the snippet
        category (str, optional): Category (e.g., 'algorithm', 'pattern', 'utility')
        tags (list, optional): List of tags
        is_shared (bool, optional): Share with team (default: false)
        quality_score (float, optional): Quality score from review

    Returns:
        Created snippet data.
    """
    global _snippet_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    # Validate required fields
    title = RequestValidator.get_required_field(data, 'title', str)
    code = RequestValidator.get_required_field(data, 'code', str)
    language = RequestValidator.get_required_field(data, 'language', str)

    # Validate title length
    if len(title) > 200:
        raise ValidationError("Title must be 200 characters or less", field='title')

    if len(title) < 3:
        raise ValidationError("Title must be at least 3 characters", field='title')

    # Validate code
    if len(code) > 50000:
        raise ValidationError("Code must be 50,000 characters or less", field='code')

    if not code.strip():
        raise ValidationError("Code cannot be empty", field='code')

    # Get optional fields
    description = RequestValidator.get_optional_field(data, 'description', '', str)
    category = RequestValidator.get_optional_field(data, 'category', 'general', str)
    tags = RequestValidator.get_optional_field(data, 'tags', [], list)
    is_shared = RequestValidator.get_optional_field(data, 'is_shared', False, bool)
    quality_score = RequestValidator.get_optional_field(data, 'quality_score', 0.0, float)

    # Validate description length
    if len(description) > 1000:
        raise ValidationError("Description must be 1000 characters or less", field='description')

    # Validate tags
    if len(tags) > 10:
        raise ValidationError("Maximum 10 tags allowed", field='tags')

    for tag in tags:
        if not isinstance(tag, str) or len(tag) > 50:
            raise ValidationError("Each tag must be a string of 50 characters or less", field='tags')

    # Create snippet
    _snippet_counter += 1
    snippet_id = _snippet_counter
    now = datetime.utcnow().isoformat()

    snippet = {
        'user_id': user.id,
        'title': title,
        'code': code,
        'language': language.lower(),
        'description': description,
        'category': category.lower(),
        'tags': [tag.lower() for tag in tags],
        'is_shared': is_shared,
        'quality_score': quality_score,
        'usage_count': 0,
        'created_at': now,
        'updated_at': now,
        'created_by': user.username
    }

    _snippets_store[snippet_id] = snippet

    logger.info(f"User {user.id} created snippet {snippet_id}: {title}")

    return APIResponse.created(
        data={
            'id': snippet_id,
            **snippet
        },
        message="Snippet created successfully"
    )


@snippets_bp.route('/snippets/<int:snippet_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_snippet(snippet_id: int) -> Tuple[Any, int]:
    """
    Get a specific snippet by ID.

    Path Parameters:
        snippet_id: ID of the snippet

    Returns:
        Snippet data.
    """
    user = request.current_user

    snippet = _snippets_store.get(snippet_id)
    if not snippet:
        raise NotFoundError("Snippet", snippet_id)

    # Check access
    is_owner = snippet['user_id'] == user.id
    is_shared = snippet.get('is_shared', False)

    if not is_owner and not is_shared:
        raise AuthorizationError("You don't have access to this snippet")

    # Increment usage count
    snippet['usage_count'] = snippet.get('usage_count', 0) + 1

    return APIResponse.success(
        data={
            'id': snippet_id,
            **snippet,
            'is_owner': is_owner
        },
        message="Snippet retrieved successfully"
    )


@snippets_bp.route('/snippets/<int:snippet_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_snippet(snippet_id: int) -> Tuple[Any, int]:
    """
    Update an existing snippet.

    Path Parameters:
        snippet_id: ID of the snippet

    Request Body:
        title (str, optional): New title
        code (str, optional): New code content
        language (str, optional): New language
        description (str, optional): New description
        category (str, optional): New category
        tags (list, optional): New tags
        is_shared (bool, optional): Update sharing status

    Returns:
        Updated snippet data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    snippet = _snippets_store.get(snippet_id)
    if not snippet:
        raise NotFoundError("Snippet", snippet_id)

    # Only owner can update
    if snippet['user_id'] != user.id:
        raise AuthorizationError("You can only update your own snippets")

    # Update fields
    if 'title' in data:
        title = data['title']
        if len(title) > 200:
            raise ValidationError("Title must be 200 characters or less", field='title')
        if len(title) < 3:
            raise ValidationError("Title must be at least 3 characters", field='title')
        snippet['title'] = title

    if 'code' in data:
        code = data['code']
        if len(code) > 50000:
            raise ValidationError("Code must be 50,000 characters or less", field='code')
        if not code.strip():
            raise ValidationError("Code cannot be empty", field='code')
        snippet['code'] = code

    if 'language' in data:
        snippet['language'] = data['language'].lower()

    if 'description' in data:
        description = data['description']
        if len(description) > 1000:
            raise ValidationError("Description must be 1000 characters or less", field='description')
        snippet['description'] = description

    if 'category' in data:
        snippet['category'] = data['category'].lower()

    if 'tags' in data:
        tags = data['tags']
        if len(tags) > 10:
            raise ValidationError("Maximum 10 tags allowed", field='tags')
        snippet['tags'] = [tag.lower() for tag in tags]

    if 'is_shared' in data:
        snippet['is_shared'] = bool(data['is_shared'])

    snippet['updated_at'] = datetime.utcnow().isoformat()

    logger.info(f"User {user.id} updated snippet {snippet_id}")

    return APIResponse.success(
        data={
            'id': snippet_id,
            **snippet,
            'is_owner': True
        },
        message="Snippet updated successfully"
    )


@snippets_bp.route('/snippets/<int:snippet_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_snippet(snippet_id: int) -> Tuple[Any, int]:
    """
    Delete a snippet.

    Path Parameters:
        snippet_id: ID of the snippet

    Returns:
        Deletion confirmation.
    """
    user = request.current_user

    snippet = _snippets_store.get(snippet_id)
    if not snippet:
        raise NotFoundError("Snippet", snippet_id)

    # Only owner can delete
    if snippet['user_id'] != user.id:
        raise AuthorizationError("You can only delete your own snippets")

    del _snippets_store[snippet_id]

    logger.info(f"User {user.id} deleted snippet {snippet_id}")

    return APIResponse.success(
        message="Snippet deleted successfully"
    )


@snippets_bp.route('/snippets/search', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def search_snippets() -> Tuple[Any, int]:
    """
    Advanced search for snippets.

    Query Parameters:
        q (str): Search query
        languages (str): Comma-separated list of languages
        categories (str): Comma-separated list of categories
        tags (str): Comma-separated list of tags
        min_score (float): Minimum quality score
        page (int): Page number
        per_page (int): Items per page

    Returns:
        Search results with relevance scoring.
    """
    user = request.current_user

    # Parse search parameters
    query = request.args.get('q', '').strip().lower()
    languages = [l.strip().lower() for l in request.args.get('languages', '').split(',') if l.strip()]
    categories = [c.strip().lower() for c in request.args.get('categories', '').split(',') if c.strip()]
    tags = [t.strip().lower() for t in request.args.get('tags', '').split(',') if t.strip()]
    min_score = float(request.args.get('min_score', 0))

    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param(
        'per_page',
        PaginationConfig.DEFAULT_PER_PAGE,
        min_val=1,
        max_val=PaginationConfig.MAX_PER_PAGE
    )

    results = []

    for snippet_id, snippet in _snippets_store.items():
        # Check access
        is_owner = snippet['user_id'] == user.id
        is_shared = snippet.get('is_shared', False)

        if not is_owner and not is_shared:
            continue

        # Apply filters
        if languages and snippet.get('language', '').lower() not in languages:
            continue

        if categories and snippet.get('category', '').lower() not in categories:
            continue

        if tags:
            snippet_tags = [t.lower() for t in snippet.get('tags', [])]
            if not any(tag in snippet_tags for tag in tags):
                continue

        if min_score > 0 and snippet.get('quality_score', 0) < min_score:
            continue

        # Calculate relevance score
        relevance = 0
        if query:
            title = snippet.get('title', '').lower()
            description = snippet.get('description', '').lower()
            code = snippet.get('code', '').lower()

            if query in title:
                relevance += 10
            if query in description:
                relevance += 5
            if query in code:
                relevance += 2

            # Skip if no match when query is provided
            if relevance == 0:
                continue
        else:
            relevance = snippet.get('quality_score', 0)

        results.append({
            'id': snippet_id,
            **snippet,
            'is_owner': is_owner,
            'relevance': relevance
        })

    # Sort by relevance
    results.sort(key=lambda x: x['relevance'], reverse=True)

    # Paginate
    total = len(results)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_results = results[start:end]

    return APIResponse.paginated(
        items=paginated_results,
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} matching snippets"
    )


@snippets_bp.route('/snippets/popular', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_popular_snippets() -> Tuple[Any, int]:
    """
    Get popular snippets based on usage and quality.

    Query Parameters:
        limit (int): Number of snippets to return (default: 10, max: 50)
        language (str): Filter by language

    Returns:
        List of popular snippets.
    """
    user = request.current_user

    limit = RequestValidator.get_int_param('limit', 10, min_val=1, max_val=50)
    language = request.args.get('language', '').strip().lower()

    popular = []

    for snippet_id, snippet in _snippets_store.items():
        # Only include shared snippets or own snippets
        is_owner = snippet['user_id'] == user.id
        is_shared = snippet.get('is_shared', False)

        if not is_owner and not is_shared:
            continue

        if language and snippet.get('language', '').lower() != language:
            continue

        # Calculate popularity score
        usage = snippet.get('usage_count', 0)
        quality = snippet.get('quality_score', 0)
        popularity = (usage * 0.3) + (quality * 0.7)

        popular.append({
            'id': snippet_id,
            **snippet,
            'is_owner': is_owner,
            'popularity_score': round(popularity, 2)
        })

    # Sort by popularity
    popular.sort(key=lambda x: x['popularity_score'], reverse=True)
    popular = popular[:limit]

    return APIResponse.success(
        data={
            'snippets': popular,
            'total': len(popular)
        },
        message=f"Retrieved {len(popular)} popular snippets"
    )


@snippets_bp.route('/snippets/languages', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_available_languages() -> Tuple[Any, int]:
    """
    Get list of languages used in snippets.

    Returns:
        List of languages with counts.
    """
    user = request.current_user

    language_counts: Dict[str, int] = {}

    for snippet in _snippets_store.values():
        # Only count accessible snippets
        is_owner = snippet['user_id'] == user.id
        is_shared = snippet.get('is_shared', False)

        if not is_owner and not is_shared:
            continue

        lang = snippet.get('language', 'unknown')
        language_counts[lang] = language_counts.get(lang, 0) + 1

    languages = [
        {'language': lang, 'count': count}
        for lang, count in sorted(language_counts.items(), key=lambda x: -x[1])
    ]

    return APIResponse.success(
        data={
            'languages': languages,
            'total': len(languages)
        },
        message=f"Found {len(languages)} languages"
    )


@snippets_bp.route('/snippets/categories', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_available_categories() -> Tuple[Any, int]:
    """
    Get list of categories used in snippets.

    Returns:
        List of categories with counts.
    """
    user = request.current_user

    category_counts: Dict[str, int] = {}

    for snippet in _snippets_store.values():
        # Only count accessible snippets
        is_owner = snippet['user_id'] == user.id
        is_shared = snippet.get('is_shared', False)

        if not is_owner and not is_shared:
            continue

        cat = snippet.get('category', 'general')
        category_counts[cat] = category_counts.get(cat, 0) + 1

    categories = [
        {'category': cat, 'count': count}
        for cat, count in sorted(category_counts.items(), key=lambda x: -x[1])
    ]

    return APIResponse.success(
        data={
            'categories': categories,
            'total': len(categories)
        },
        message=f"Found {len(categories)} categories"
    )


@snippets_bp.route('/snippets/<int:snippet_id>/copy', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def copy_snippet(snippet_id: int) -> Tuple[Any, int]:
    """
    Copy a shared snippet to your own collection.

    Path Parameters:
        snippet_id: ID of the snippet to copy

    Returns:
        New snippet data.
    """
    global _snippet_counter
    user = request.current_user

    snippet = _snippets_store.get(snippet_id)
    if not snippet:
        raise NotFoundError("Snippet", snippet_id)

    # Check if shared or own snippet
    is_owner = snippet['user_id'] == user.id
    is_shared = snippet.get('is_shared', False)

    if not is_owner and not is_shared:
        raise AuthorizationError("You don't have access to this snippet")

    if is_owner:
        raise ValidationError("Cannot copy your own snippet")

    # Create copy
    _snippet_counter += 1
    new_snippet_id = _snippet_counter
    now = datetime.utcnow().isoformat()

    new_snippet = {
        'user_id': user.id,
        'title': f"{snippet['title']} (copy)",
        'code': snippet['code'],
        'language': snippet['language'],
        'description': snippet.get('description', ''),
        'category': snippet.get('category', 'general'),
        'tags': snippet.get('tags', []).copy(),
        'is_shared': False,
        'quality_score': snippet.get('quality_score', 0),
        'usage_count': 0,
        'created_at': now,
        'updated_at': now,
        'created_by': user.username,
        'copied_from': snippet_id
    }

    _snippets_store[new_snippet_id] = new_snippet

    logger.info(f"User {user.id} copied snippet {snippet_id} to {new_snippet_id}")

    return APIResponse.created(
        data={
            'id': new_snippet_id,
            **new_snippet
        },
        message="Snippet copied successfully"
    )
