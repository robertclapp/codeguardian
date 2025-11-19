"""
Marketplace routes for CodeGuardian

Provides marketplace for sharing custom rules, integrations, and extensions.
"""

import logging
from typing import Any, Tuple
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

marketplace_bp = Blueprint('marketplace', __name__)


# In-memory marketplace items (would be database in production)
_marketplace_items = {
    1: {
        'id': 1, 'type': 'rule_set', 'name': 'Security Best Practices',
        'description': 'Comprehensive security rules for web applications',
        'author': 'CodeGuardian Team', 'author_id': 1,
        'downloads': 1250, 'rating': 4.8, 'reviews': 45,
        'price': 0, 'tags': ['security', 'web', 'owasp'],
        'created_at': '2025-01-15T10:00:00Z'
    },
    2: {
        'id': 2, 'type': 'integration', 'name': 'Slack Notifier',
        'description': 'Send review results to Slack channels',
        'author': 'Community', 'author_id': 2,
        'downloads': 890, 'rating': 4.5, 'reviews': 32,
        'price': 0, 'tags': ['slack', 'notifications', 'integration'],
        'created_at': '2025-02-01T10:00:00Z'
    },
    3: {
        'id': 3, 'type': 'rule_set', 'name': 'Python PEP8 Extended',
        'description': 'Extended PEP8 rules with custom checks',
        'author': 'PythonDev', 'author_id': 3,
        'downloads': 2100, 'rating': 4.9, 'reviews': 78,
        'price': 0, 'tags': ['python', 'style', 'pep8'],
        'created_at': '2025-01-20T10:00:00Z'
    }
}


@marketplace_bp.route('/marketplace/items', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def browse_marketplace() -> Tuple[Any, int]:
    """
    Browse marketplace items.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        type (str): Filter by type (rule_set, integration, extension)
        search (str): Search query
        sort (str): Sort by (downloads, rating, newest)
        tags (str): Comma-separated tags

    Returns:
        Paginated marketplace items.
    """
    page = RequestValidator.get_int_param('page', 1, min_val=1)
    per_page = RequestValidator.get_int_param('per_page', 20, min_val=1, max_val=100)

    item_type = request.args.get('type', '')
    search = request.args.get('search', '').lower()
    sort_by = request.args.get('sort', 'downloads')
    tags = [t.strip() for t in request.args.get('tags', '').split(',') if t.strip()]

    # Filter items
    items = list(_marketplace_items.values())

    if item_type:
        items = [i for i in items if i['type'] == item_type]

    if search:
        items = [i for i in items if search in i['name'].lower() or search in i['description'].lower()]

    if tags:
        items = [i for i in items if any(t in i['tags'] for t in tags)]

    # Sort
    sort_key = {'downloads': lambda x: -x['downloads'],
                'rating': lambda x: -x['rating'],
                'newest': lambda x: x['created_at']}.get(sort_by, lambda x: -x['downloads'])
    items.sort(key=sort_key)

    # Paginate
    total = len(items)
    start = (page - 1) * per_page
    items = items[start:start + per_page]

    return APIResponse.paginated(
        items=items, total=total, page=page, per_page=per_page,
        message=f"Found {total} marketplace items"
    )


@marketplace_bp.route('/marketplace/items/<int:item_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_marketplace_item(item_id: int) -> Tuple[Any, int]:
    """Get marketplace item details."""
    item = _marketplace_items.get(item_id)
    if not item:
        raise NotFoundError("Marketplace item", item_id)

    return APIResponse.success(data=item, message="Item retrieved")


@marketplace_bp.route('/marketplace/items/<int:item_id>/install', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def install_item(item_id: int) -> Tuple[Any, int]:
    """Install a marketplace item."""
    user = request.current_user

    item = _marketplace_items.get(item_id)
    if not item:
        raise NotFoundError("Marketplace item", item_id)

    # Simulate installation
    item['downloads'] += 1

    logger.info(f"User {user.id} installed marketplace item {item_id}")

    return APIResponse.success(
        data={'installed': True, 'item_id': item_id},
        message=f"Successfully installed '{item['name']}'"
    )


@marketplace_bp.route('/marketplace/publish', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def publish_item() -> Tuple[Any, int]:
    """
    Publish a new marketplace item.

    Request Body:
        name (str): Item name
        type (str): Item type
        description (str): Description
        content (dict): Item content/configuration
        tags (list): Tags

    Returns:
        Published item.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    name = RequestValidator.get_required_field(data, 'name', str)
    item_type = RequestValidator.get_required_field(data, 'type', str)
    description = RequestValidator.get_required_field(data, 'description', str)
    tags = RequestValidator.get_optional_field(data, 'tags', [], list)

    # Create item
    item_id = max(_marketplace_items.keys()) + 1
    item = {
        'id': item_id,
        'type': item_type,
        'name': name,
        'description': description,
        'author': user.username,
        'author_id': user.id,
        'downloads': 0,
        'rating': 0,
        'reviews': 0,
        'price': 0,
        'tags': tags,
        'created_at': datetime.utcnow().isoformat()
    }

    _marketplace_items[item_id] = item

    return APIResponse.created(data=item, message="Item published successfully")


@marketplace_bp.route('/marketplace/my-items', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_my_items() -> Tuple[Any, int]:
    """Get items published by current user."""
    user = request.current_user

    items = [i for i in _marketplace_items.values() if i['author_id'] == user.id]

    return APIResponse.success(
        data={'items': items, 'total': len(items)},
        message=f"Found {len(items)} published items"
    )
