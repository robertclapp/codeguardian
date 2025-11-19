"""
Custom Review Rules Engine for CodeGuardian

Allows users to define and manage custom code quality rules
for their teams and projects.
"""

import logging
import re
import json
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
from src.exceptions import NotFoundError, ValidationError, AuthorizationError
from src.constants import PaginationConfig

logger = logging.getLogger(__name__)

rules_bp = Blueprint('rules', __name__)


# In-memory storage for rules (would be database in production)
_custom_rules: Dict[int, Dict[str, Any]] = {}
_rule_sets: Dict[int, Dict[str, Any]] = {}
_rule_counter = 0
_rule_set_counter = 0


# Built-in rule templates
RULE_TEMPLATES = {
    'no-console-log': {
        'name': 'No Console Logs',
        'description': 'Disallow console.log statements in production code',
        'pattern': r'console\.(log|debug|info|warn|error)\s*\(',
        'languages': ['javascript', 'typescript'],
        'severity': 'warning',
        'category': 'best_practices',
        'message': 'Remove console.{method} statement before production deployment',
        'fix_suggestion': 'Use a proper logging library instead'
    },
    'no-todo-comments': {
        'name': 'No TODO Comments',
        'description': 'Flag TODO and FIXME comments for tracking',
        'pattern': r'(TODO|FIXME|HACK|XXX)[\s:]+',
        'languages': ['*'],
        'severity': 'info',
        'category': 'maintainability',
        'message': 'Found {match} comment that should be addressed',
        'fix_suggestion': 'Create an issue to track this task and remove the comment'
    },
    'no-hardcoded-credentials': {
        'name': 'No Hardcoded Credentials',
        'description': 'Detect hardcoded passwords, API keys, and tokens',
        'pattern': r'(password|secret|api_key|apikey|token|auth)\s*[=:]\s*["\'][^"\']{8,}["\']',
        'languages': ['*'],
        'severity': 'critical',
        'category': 'security',
        'message': 'Potential hardcoded credential detected',
        'fix_suggestion': 'Use environment variables or a secrets manager'
    },
    'max-function-length': {
        'name': 'Maximum Function Length',
        'description': 'Enforce maximum lines per function',
        'type': 'ast',
        'check': 'function_length',
        'threshold': 50,
        'languages': ['python', 'javascript', 'typescript'],
        'severity': 'warning',
        'category': 'maintainability',
        'message': 'Function exceeds {threshold} lines ({actual} lines)',
        'fix_suggestion': 'Consider breaking down into smaller functions'
    },
    'max-complexity': {
        'name': 'Maximum Cyclomatic Complexity',
        'description': 'Limit function complexity',
        'type': 'ast',
        'check': 'cyclomatic_complexity',
        'threshold': 10,
        'languages': ['python', 'javascript', 'typescript'],
        'severity': 'warning',
        'category': 'maintainability',
        'message': 'Function has cyclomatic complexity of {actual} (max: {threshold})',
        'fix_suggestion': 'Reduce branching by extracting conditions or using early returns'
    },
    'require-docstrings': {
        'name': 'Require Docstrings',
        'description': 'Require docstrings for functions and classes',
        'type': 'ast',
        'check': 'has_docstring',
        'languages': ['python'],
        'severity': 'warning',
        'category': 'documentation',
        'message': '{type} "{name}" is missing a docstring',
        'fix_suggestion': 'Add a descriptive docstring explaining purpose and parameters'
    },
    'no-eval': {
        'name': 'No Eval',
        'description': 'Disallow use of eval()',
        'pattern': r'\beval\s*\(',
        'languages': ['javascript', 'typescript', 'python'],
        'severity': 'critical',
        'category': 'security',
        'message': 'Avoid using eval() as it can execute arbitrary code',
        'fix_suggestion': 'Use safer alternatives like JSON.parse() or specific parsing functions'
    },
    'no-sql-injection': {
        'name': 'No SQL String Concatenation',
        'description': 'Detect potential SQL injection vulnerabilities',
        'pattern': r'(execute|query)\s*\(\s*["\'].*\%s.*["\'].*%|f["\'].*SELECT.*\{',
        'languages': ['python'],
        'severity': 'critical',
        'category': 'security',
        'message': 'Potential SQL injection vulnerability detected',
        'fix_suggestion': 'Use parameterized queries instead of string formatting'
    }
}


@rules_bp.route('/rules', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_rules() -> Tuple[Any, int]:
    """
    List custom rules with filtering and pagination.

    Query Parameters:
        page (int): Page number
        per_page (int): Items per page
        language (str): Filter by language
        category (str): Filter by category
        severity (str): Filter by severity
        include_templates (bool): Include built-in templates

    Returns:
        Paginated list of rules.
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
    category = request.args.get('category', '').lower()
    severity = request.args.get('severity', '').lower()
    include_templates = request.args.get('include_templates', 'false').lower() == 'true'

    # Collect user's rules
    rules = []

    for rule_id, rule in _custom_rules.items():
        if rule['user_id'] != user.id:
            continue

        if language and language not in rule.get('languages', ['*']) and '*' not in rule.get('languages', []):
            continue
        if category and rule.get('category', '').lower() != category:
            continue
        if severity and rule.get('severity', '').lower() != severity:
            continue

        rules.append({
            'id': rule_id,
            'type': 'custom',
            **rule
        })

    # Add templates if requested
    if include_templates:
        for template_id, template in RULE_TEMPLATES.items():
            if language and language not in template.get('languages', ['*']) and '*' not in template.get('languages', []):
                continue
            if category and template.get('category', '').lower() != category:
                continue
            if severity and template.get('severity', '').lower() != severity:
                continue

            rules.append({
                'id': template_id,
                'type': 'template',
                **template
            })

    # Sort by name
    rules.sort(key=lambda x: x.get('name', '').lower())

    # Paginate
    total = len(rules)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = rules[start:end]

    return APIResponse.paginated(
        items=paginated,
        total=total,
        page=page,
        per_page=per_page,
        message=f"Found {total} rules"
    )


@rules_bp.route('/rules', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def create_rule() -> Tuple[Any, int]:
    """
    Create a new custom rule.

    Request Body:
        name (str): Rule name
        description (str): Rule description
        pattern (str, optional): Regex pattern to match
        type (str, optional): Rule type ('pattern' or 'ast')
        languages (list): Applicable languages
        severity (str): 'info', 'warning', 'error', 'critical'
        category (str): Category (security, performance, etc.)
        message (str): Message to display when rule matches
        fix_suggestion (str, optional): Suggested fix

    Returns:
        Created rule data.
    """
    global _rule_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    # Validate required fields
    name = RequestValidator.get_required_field(data, 'name', str)
    description = RequestValidator.get_required_field(data, 'description', str)
    languages = RequestValidator.get_required_field(data, 'languages', list)
    severity = RequestValidator.get_required_field(data, 'severity', str)
    category = RequestValidator.get_required_field(data, 'category', str)
    message = RequestValidator.get_required_field(data, 'message', str)

    # Validate name
    if len(name) < 3 or len(name) > 100:
        raise ValidationError("Name must be between 3 and 100 characters", field='name')

    # Validate severity
    valid_severities = ['info', 'warning', 'error', 'critical']
    if severity.lower() not in valid_severities:
        raise ValidationError(f"Severity must be one of: {', '.join(valid_severities)}", field='severity')

    # Validate category
    valid_categories = ['security', 'performance', 'maintainability', 'best_practices', 'documentation', 'style']
    if category.lower() not in valid_categories:
        raise ValidationError(f"Category must be one of: {', '.join(valid_categories)}", field='category')

    # Get optional fields
    rule_type = RequestValidator.get_optional_field(data, 'type', 'pattern', str)
    pattern = RequestValidator.get_optional_field(data, 'pattern', '', str)
    fix_suggestion = RequestValidator.get_optional_field(data, 'fix_suggestion', '', str)
    enabled = RequestValidator.get_optional_field(data, 'enabled', True, bool)

    # Validate pattern if provided
    if rule_type == 'pattern' and pattern:
        try:
            re.compile(pattern)
        except re.error as e:
            raise ValidationError(f"Invalid regex pattern: {str(e)}", field='pattern')

    # Create rule
    _rule_counter += 1
    rule_id = _rule_counter
    now = datetime.utcnow().isoformat()

    rule = {
        'user_id': user.id,
        'name': name,
        'description': description,
        'type': rule_type,
        'pattern': pattern,
        'languages': [lang.lower() for lang in languages],
        'severity': severity.lower(),
        'category': category.lower(),
        'message': message,
        'fix_suggestion': fix_suggestion,
        'enabled': enabled,
        'match_count': 0,
        'created_at': now,
        'updated_at': now
    }

    _custom_rules[rule_id] = rule

    logger.info(f"User {user.id} created rule {rule_id}: {name}")

    return APIResponse.created(
        data={'id': rule_id, **rule},
        message="Rule created successfully"
    )


@rules_bp.route('/rules/<int:rule_id>', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_rule(rule_id: int) -> Tuple[Any, int]:
    """
    Get a specific rule by ID.

    Path Parameters:
        rule_id: ID of the rule

    Returns:
        Rule data.
    """
    user = request.current_user

    rule = _custom_rules.get(rule_id)
    if not rule:
        raise NotFoundError("Rule", rule_id)

    if rule['user_id'] != user.id:
        raise AuthorizationError("You don't have access to this rule")

    return APIResponse.success(
        data={'id': rule_id, **rule},
        message="Rule retrieved successfully"
    )


@rules_bp.route('/rules/<int:rule_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_rule(rule_id: int) -> Tuple[Any, int]:
    """
    Update an existing rule.

    Path Parameters:
        rule_id: ID of the rule

    Request Body:
        (Any fields from create_rule)

    Returns:
        Updated rule data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    rule = _custom_rules.get(rule_id)
    if not rule:
        raise NotFoundError("Rule", rule_id)

    if rule['user_id'] != user.id:
        raise AuthorizationError("You can only update your own rules")

    # Update fields
    updatable_fields = ['name', 'description', 'type', 'pattern', 'languages',
                       'severity', 'category', 'message', 'fix_suggestion', 'enabled']

    for field in updatable_fields:
        if field in data:
            value = data[field]

            # Validate specific fields
            if field == 'pattern' and value:
                try:
                    re.compile(value)
                except re.error as e:
                    raise ValidationError(f"Invalid regex pattern: {str(e)}", field='pattern')

            if field == 'severity':
                valid_severities = ['info', 'warning', 'error', 'critical']
                if value.lower() not in valid_severities:
                    raise ValidationError(f"Severity must be one of: {', '.join(valid_severities)}", field='severity')
                value = value.lower()

            if field == 'category':
                valid_categories = ['security', 'performance', 'maintainability', 'best_practices', 'documentation', 'style']
                if value.lower() not in valid_categories:
                    raise ValidationError(f"Category must be one of: {', '.join(valid_categories)}", field='category')
                value = value.lower()

            if field == 'languages':
                value = [lang.lower() for lang in value]

            rule[field] = value

    rule['updated_at'] = datetime.utcnow().isoformat()

    logger.info(f"User {user.id} updated rule {rule_id}")

    return APIResponse.success(
        data={'id': rule_id, **rule},
        message="Rule updated successfully"
    )


@rules_bp.route('/rules/<int:rule_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_rule(rule_id: int) -> Tuple[Any, int]:
    """
    Delete a rule.

    Path Parameters:
        rule_id: ID of the rule

    Returns:
        Deletion confirmation.
    """
    user = request.current_user

    rule = _custom_rules.get(rule_id)
    if not rule:
        raise NotFoundError("Rule", rule_id)

    if rule['user_id'] != user.id:
        raise AuthorizationError("You can only delete your own rules")

    del _custom_rules[rule_id]

    logger.info(f"User {user.id} deleted rule {rule_id}")

    return APIResponse.success(message="Rule deleted successfully")


@rules_bp.route('/rules/templates', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_templates() -> Tuple[Any, int]:
    """
    Get available rule templates.

    Query Parameters:
        language (str): Filter by language
        category (str): Filter by category

    Returns:
        List of rule templates.
    """
    language = request.args.get('language', '').lower()
    category = request.args.get('category', '').lower()

    templates = []
    for template_id, template in RULE_TEMPLATES.items():
        if language:
            if language not in template.get('languages', ['*']) and '*' not in template.get('languages', []):
                continue
        if category and template.get('category', '').lower() != category:
            continue

        templates.append({
            'id': template_id,
            **template
        })

    return APIResponse.success(
        data={
            'templates': templates,
            'total': len(templates)
        },
        message=f"Found {len(templates)} templates"
    )


@rules_bp.route('/rules/templates/<template_id>/use', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def use_template(template_id: str) -> Tuple[Any, int]:
    """
    Create a rule from a template.

    Path Parameters:
        template_id: ID of the template

    Request Body:
        overrides (dict, optional): Fields to override from template

    Returns:
        Created rule data.
    """
    global _rule_counter
    user = request.current_user

    template = RULE_TEMPLATES.get(template_id)
    if not template:
        raise NotFoundError("Template", template_id)

    data = request.get_json() or {}
    overrides = data.get('overrides', {})

    # Create rule from template
    _rule_counter += 1
    rule_id = _rule_counter
    now = datetime.utcnow().isoformat()

    rule = {
        'user_id': user.id,
        'name': overrides.get('name', template['name']),
        'description': overrides.get('description', template['description']),
        'type': template.get('type', 'pattern'),
        'pattern': overrides.get('pattern', template.get('pattern', '')),
        'languages': overrides.get('languages', template['languages']),
        'severity': overrides.get('severity', template['severity']),
        'category': overrides.get('category', template['category']),
        'message': overrides.get('message', template['message']),
        'fix_suggestion': overrides.get('fix_suggestion', template.get('fix_suggestion', '')),
        'enabled': True,
        'match_count': 0,
        'created_at': now,
        'updated_at': now,
        'from_template': template_id
    }

    _custom_rules[rule_id] = rule

    logger.info(f"User {user.id} created rule {rule_id} from template {template_id}")

    return APIResponse.created(
        data={'id': rule_id, **rule},
        message=f"Rule created from template '{template['name']}'"
    )


@rules_bp.route('/rules/test', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def test_rule() -> Tuple[Any, int]:
    """
    Test a rule against sample code.

    Request Body:
        pattern (str): Regex pattern to test
        code (str): Code to test against
        language (str): Programming language

    Returns:
        Test results with matches.
    """
    data = RequestValidator.get_json_body()

    pattern = RequestValidator.get_required_field(data, 'pattern', str)
    code = RequestValidator.get_required_field(data, 'code', str)
    language = RequestValidator.get_optional_field(data, 'language', 'python', str)

    # Validate pattern
    try:
        regex = re.compile(pattern)
    except re.error as e:
        raise ValidationError(f"Invalid regex pattern: {str(e)}", field='pattern')

    # Find matches
    matches = []
    for line_num, line in enumerate(code.split('\n'), 1):
        for match in regex.finditer(line):
            matches.append({
                'line': line_num,
                'column': match.start() + 1,
                'match': match.group(),
                'context': line.strip()
            })

    return APIResponse.success(
        data={
            'pattern': pattern,
            'language': language,
            'matches': matches,
            'total_matches': len(matches),
            'lines_scanned': len(code.split('\n'))
        },
        message=f"Found {len(matches)} matches"
    )


# Rule Sets (collections of rules)

@rules_bp.route('/rule-sets', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_rule_sets() -> Tuple[Any, int]:
    """
    List rule sets for the current user.

    Returns:
        List of rule sets.
    """
    user = request.current_user

    sets = [
        {'id': set_id, **rule_set}
        for set_id, rule_set in _rule_sets.items()
        if rule_set['user_id'] == user.id
    ]

    sets.sort(key=lambda x: x.get('name', '').lower())

    return APIResponse.success(
        data={
            'rule_sets': sets,
            'total': len(sets)
        },
        message=f"Found {len(sets)} rule sets"
    )


@rules_bp.route('/rule-sets', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def create_rule_set() -> Tuple[Any, int]:
    """
    Create a new rule set.

    Request Body:
        name (str): Set name
        description (str): Set description
        rule_ids (list): List of rule IDs to include
        is_default (bool, optional): Set as default for new repos

    Returns:
        Created rule set data.
    """
    global _rule_set_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    name = RequestValidator.get_required_field(data, 'name', str)
    description = RequestValidator.get_required_field(data, 'description', str)
    rule_ids = RequestValidator.get_required_field(data, 'rule_ids', list)
    is_default = RequestValidator.get_optional_field(data, 'is_default', False, bool)

    # Validate rules exist and belong to user
    for rule_id in rule_ids:
        if isinstance(rule_id, int):
            rule = _custom_rules.get(rule_id)
            if not rule or rule['user_id'] != user.id:
                raise ValidationError(f"Rule {rule_id} not found or not accessible", field='rule_ids')

    _rule_set_counter += 1
    set_id = _rule_set_counter
    now = datetime.utcnow().isoformat()

    rule_set = {
        'user_id': user.id,
        'name': name,
        'description': description,
        'rule_ids': rule_ids,
        'is_default': is_default,
        'created_at': now,
        'updated_at': now
    }

    _rule_sets[set_id] = rule_set

    # If is_default, unset other defaults
    if is_default:
        for other_id, other_set in _rule_sets.items():
            if other_id != set_id and other_set['user_id'] == user.id:
                other_set['is_default'] = False

    logger.info(f"User {user.id} created rule set {set_id}: {name}")

    return APIResponse.created(
        data={'id': set_id, **rule_set},
        message="Rule set created successfully"
    )


@rules_bp.route('/rule-sets/<int:set_id>', methods=['PUT'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def update_rule_set(set_id: int) -> Tuple[Any, int]:
    """
    Update a rule set.

    Path Parameters:
        set_id: ID of the rule set

    Returns:
        Updated rule set data.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    rule_set = _rule_sets.get(set_id)
    if not rule_set:
        raise NotFoundError("Rule set", set_id)

    if rule_set['user_id'] != user.id:
        raise AuthorizationError("You can only update your own rule sets")

    # Update fields
    for field in ['name', 'description', 'rule_ids', 'is_default']:
        if field in data:
            rule_set[field] = data[field]

    # Handle is_default
    if data.get('is_default'):
        for other_id, other_set in _rule_sets.items():
            if other_id != set_id and other_set['user_id'] == user.id:
                other_set['is_default'] = False

    rule_set['updated_at'] = datetime.utcnow().isoformat()

    return APIResponse.success(
        data={'id': set_id, **rule_set},
        message="Rule set updated successfully"
    )


@rules_bp.route('/rule-sets/<int:set_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_rule_set(set_id: int) -> Tuple[Any, int]:
    """
    Delete a rule set.

    Path Parameters:
        set_id: ID of the rule set

    Returns:
        Deletion confirmation.
    """
    user = request.current_user

    rule_set = _rule_sets.get(set_id)
    if not rule_set:
        raise NotFoundError("Rule set", set_id)

    if rule_set['user_id'] != user.id:
        raise AuthorizationError("You can only delete your own rule sets")

    del _rule_sets[set_id]

    logger.info(f"User {user.id} deleted rule set {set_id}")

    return APIResponse.success(message="Rule set deleted successfully")


@rules_bp.route('/rule-sets/<int:set_id>/export', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def export_rule_set(set_id: int) -> Tuple[Any, int]:
    """
    Export a rule set for sharing or backup.

    Path Parameters:
        set_id: ID of the rule set

    Returns:
        Exportable rule set data.
    """
    user = request.current_user

    rule_set = _rule_sets.get(set_id)
    if not rule_set:
        raise NotFoundError("Rule set", set_id)

    if rule_set['user_id'] != user.id:
        raise AuthorizationError("You can only export your own rule sets")

    # Get full rule data
    rules = []
    for rule_id in rule_set['rule_ids']:
        if isinstance(rule_id, int):
            rule = _custom_rules.get(rule_id)
            if rule:
                # Remove user-specific fields
                export_rule = {k: v for k, v in rule.items() if k not in ['user_id', 'match_count']}
                rules.append(export_rule)
        elif isinstance(rule_id, str):
            # Template reference
            template = RULE_TEMPLATES.get(rule_id)
            if template:
                rules.append({'template': rule_id, **template})

    export_data = {
        'name': rule_set['name'],
        'description': rule_set['description'],
        'rules': rules,
        'exported_at': datetime.utcnow().isoformat(),
        'version': '1.0'
    }

    return APIResponse.success(
        data=export_data,
        message="Rule set exported successfully"
    )


@rules_bp.route('/rule-sets/import', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def import_rule_set() -> Tuple[Any, int]:
    """
    Import a rule set from exported data.

    Request Body:
        name (str): Name for imported set
        description (str, optional): Override description
        rules (list): Exported rules data

    Returns:
        Imported rule set data.
    """
    global _rule_counter, _rule_set_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    name = RequestValidator.get_required_field(data, 'name', str)
    rules = RequestValidator.get_required_field(data, 'rules', list)
    description = RequestValidator.get_optional_field(data, 'description', data.get('description', 'Imported rule set'), str)

    # Create rules from import
    imported_rule_ids = []
    now = datetime.utcnow().isoformat()

    for rule_data in rules:
        if 'template' in rule_data:
            # Reference to template
            imported_rule_ids.append(rule_data['template'])
        else:
            # Custom rule
            _rule_counter += 1
            rule_id = _rule_counter

            rule = {
                'user_id': user.id,
                'name': rule_data.get('name', 'Imported Rule'),
                'description': rule_data.get('description', ''),
                'type': rule_data.get('type', 'pattern'),
                'pattern': rule_data.get('pattern', ''),
                'languages': rule_data.get('languages', ['*']),
                'severity': rule_data.get('severity', 'warning'),
                'category': rule_data.get('category', 'best_practices'),
                'message': rule_data.get('message', 'Rule violation'),
                'fix_suggestion': rule_data.get('fix_suggestion', ''),
                'enabled': True,
                'match_count': 0,
                'created_at': now,
                'updated_at': now
            }

            _custom_rules[rule_id] = rule
            imported_rule_ids.append(rule_id)

    # Create rule set
    _rule_set_counter += 1
    set_id = _rule_set_counter

    rule_set = {
        'user_id': user.id,
        'name': name,
        'description': description,
        'rule_ids': imported_rule_ids,
        'is_default': False,
        'created_at': now,
        'updated_at': now
    }

    _rule_sets[set_id] = rule_set

    logger.info(f"User {user.id} imported rule set {set_id} with {len(imported_rule_ids)} rules")

    return APIResponse.created(
        data={
            'id': set_id,
            **rule_set,
            'rules_imported': len(imported_rule_ids)
        },
        message=f"Rule set imported with {len(imported_rule_ids)} rules"
    )
