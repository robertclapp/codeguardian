"""
Webhook Integration routes for CodeGuardian

Provides CI/CD integration with GitHub, GitLab, and other platforms
for automatic code review on pull requests.
"""

import logging
import hmac
import hashlib
import json
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from flask import Blueprint, request
from flask_cors import cross_origin

from src.database import db
from src.models.user import User
from src.models.repository import Repository
from src.routes.auth import require_auth
from src.responses import APIResponse
from src.decorators import handle_errors, log_request, validate_json
from src.validation import RequestValidator
from src.exceptions import NotFoundError, ValidationError, AuthorizationError, ExternalServiceError
from src.constants import Platform

logger = logging.getLogger(__name__)

webhooks_bp = Blueprint('webhooks', __name__)


# In-memory storage for webhook configurations (would be database in production)
_webhook_configs: Dict[int, Dict[str, Any]] = {}
_webhook_events: List[Dict[str, Any]] = []
_quality_gates: Dict[int, Dict[str, Any]] = {}
_config_counter = 0
_event_counter = 0


def verify_github_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify GitHub webhook signature."""
    if not signature or not signature.startswith('sha256='):
        return False

    expected = 'sha256=' + hmac.new(
        secret.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)


def verify_gitlab_token(token: str, expected: str) -> bool:
    """Verify GitLab webhook token."""
    return hmac.compare_digest(token, expected)


@webhooks_bp.route('/webhooks/github', methods=['POST'])
@handle_errors
def github_webhook() -> Tuple[Any, int]:
    """
    Handle GitHub webhook events.

    Processes pull request events and triggers automatic code reviews.

    Headers:
        X-Hub-Signature-256: HMAC signature for verification
        X-GitHub-Event: Event type (pull_request, push, etc.)
        X-GitHub-Delivery: Unique delivery ID

    Returns:
        Webhook processing result.
    """
    global _event_counter

    # Get headers
    signature = request.headers.get('X-Hub-Signature-256', '')
    event_type = request.headers.get('X-GitHub-Event', '')
    delivery_id = request.headers.get('X-GitHub-Delivery', '')

    if not event_type:
        raise ValidationError("Missing X-GitHub-Event header")

    payload = request.get_data()
    data = request.get_json() or {}

    # Find matching webhook configuration
    repo_full_name = data.get('repository', {}).get('full_name', '')
    config = None

    for cfg in _webhook_configs.values():
        if cfg.get('platform') == 'github' and cfg.get('repository') == repo_full_name:
            config = cfg
            break

    # Verify signature if config found
    if config and config.get('secret'):
        if not verify_github_signature(payload, signature, config['secret']):
            logger.warning(f"Invalid GitHub signature for {repo_full_name}")
            raise AuthorizationError("Invalid webhook signature")

    # Log event
    _event_counter += 1
    event = {
        'id': _event_counter,
        'platform': 'github',
        'event_type': event_type,
        'delivery_id': delivery_id,
        'repository': repo_full_name,
        'payload': data,
        'processed': False,
        'created_at': datetime.utcnow().isoformat()
    }
    _webhook_events.append(event)

    # Process event
    result = _process_github_event(event_type, data, config)

    event['processed'] = True
    event['result'] = result

    logger.info(f"Processed GitHub {event_type} event for {repo_full_name}")

    return APIResponse.success(
        data=result,
        message=f"Webhook event '{event_type}' processed successfully"
    )


def _process_github_event(event_type: str, data: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Process a GitHub webhook event."""
    if event_type == 'pull_request':
        return _handle_pull_request(data, config, 'github')
    elif event_type == 'push':
        return _handle_push(data, config, 'github')
    elif event_type == 'ping':
        return {'message': 'Pong! Webhook configured successfully.'}
    else:
        return {'message': f'Event type "{event_type}" acknowledged but not processed'}


def _handle_pull_request(data: Dict, config: Optional[Dict], platform: str) -> Dict[str, Any]:
    """Handle pull request event - trigger code review."""
    action = data.get('action', '')
    pr = data.get('pull_request', {})

    # Only process opened or synchronized PRs
    if action not in ['opened', 'synchronize', 'reopened']:
        return {
            'action': action,
            'status': 'skipped',
            'message': f'PR action "{action}" does not trigger review'
        }

    pr_number = pr.get('number')
    pr_title = pr.get('title', '')
    pr_url = pr.get('html_url', '')
    head_sha = pr.get('head', {}).get('sha', '')
    base_branch = pr.get('base', {}).get('ref', '')
    head_branch = pr.get('head', {}).get('ref', '')

    # Simulate code review (in production, this would call the actual review service)
    review_result = _simulate_code_review(pr, config)

    # Check quality gate
    gate_result = _check_quality_gate(review_result, config)

    result = {
        'action': action,
        'pr_number': pr_number,
        'pr_title': pr_title,
        'pr_url': pr_url,
        'head_sha': head_sha,
        'base_branch': base_branch,
        'head_branch': head_branch,
        'review': review_result,
        'quality_gate': gate_result,
        'status': 'success' if gate_result['passed'] else 'failed'
    }

    # Generate PR comment
    if config and config.get('post_comments', True):
        result['comment'] = _generate_pr_comment(review_result, gate_result)

    return result


def _handle_push(data: Dict, config: Optional[Dict], platform: str) -> Dict[str, Any]:
    """Handle push event."""
    ref = data.get('ref', '')
    commits = data.get('commits', [])

    return {
        'ref': ref,
        'commits_count': len(commits),
        'status': 'acknowledged',
        'message': f'Push to {ref} with {len(commits)} commits acknowledged'
    }


def _simulate_code_review(pr: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Simulate a code review result (placeholder for actual AI review)."""
    # In production, this would:
    # 1. Fetch the PR diff
    # 2. Run the AI code review
    # 3. Return actual results

    return {
        'overall_score': 85.5,
        'issues': [
            {
                'type': 'security',
                'severity': 'high',
                'message': 'Potential SQL injection vulnerability',
                'file': 'src/database.py',
                'line': 42
            },
            {
                'type': 'performance',
                'severity': 'medium',
                'message': 'N+1 query pattern detected',
                'file': 'src/services/user.py',
                'line': 78
            },
            {
                'type': 'maintainability',
                'severity': 'low',
                'message': 'Function exceeds recommended complexity',
                'file': 'src/utils/parser.py',
                'line': 120
            }
        ],
        'summary': {
            'security': 78.0,
            'performance': 82.0,
            'maintainability': 88.0,
            'best_practices': 92.0
        },
        'files_reviewed': 15,
        'lines_analyzed': 1250
    }


def _check_quality_gate(review: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Check if review passes quality gate thresholds."""
    # Default thresholds
    thresholds = {
        'min_score': 70.0,
        'max_high_severity': 0,
        'max_medium_severity': 5,
        'block_on_security': True
    }

    # Override with config if available
    if config and config.get('quality_gate'):
        thresholds.update(config['quality_gate'])

    overall_score = review.get('overall_score', 0)
    issues = review.get('issues', [])

    high_count = sum(1 for i in issues if i.get('severity') == 'high')
    medium_count = sum(1 for i in issues if i.get('severity') == 'medium')
    security_issues = [i for i in issues if i.get('type') == 'security' and i.get('severity') in ['high', 'critical']]

    # Check conditions
    score_passed = overall_score >= thresholds['min_score']
    high_passed = high_count <= thresholds['max_high_severity']
    medium_passed = medium_count <= thresholds['max_medium_severity']
    security_passed = not (thresholds['block_on_security'] and security_issues)

    passed = score_passed and high_passed and medium_passed and security_passed

    failures = []
    if not score_passed:
        failures.append(f"Score {overall_score} below minimum {thresholds['min_score']}")
    if not high_passed:
        failures.append(f"{high_count} high severity issues (max {thresholds['max_high_severity']})")
    if not medium_passed:
        failures.append(f"{medium_count} medium severity issues (max {thresholds['max_medium_severity']})")
    if not security_passed:
        failures.append(f"{len(security_issues)} security issues blocking merge")

    return {
        'passed': passed,
        'thresholds': thresholds,
        'results': {
            'score': {'value': overall_score, 'passed': score_passed},
            'high_severity': {'value': high_count, 'passed': high_passed},
            'medium_severity': {'value': medium_count, 'passed': medium_passed},
            'security': {'value': len(security_issues), 'passed': security_passed}
        },
        'failures': failures
    }


def _generate_pr_comment(review: Dict, gate: Dict) -> str:
    """Generate a PR comment with review results."""
    status_emoji = "✅" if gate['passed'] else "❌"

    comment = f"""## CodeGuardian Review {status_emoji}

### Overall Score: {review['overall_score']}/100

| Category | Score |
|----------|-------|
| Security | {review['summary']['security']} |
| Performance | {review['summary']['performance']} |
| Maintainability | {review['summary']['maintainability']} |
| Best Practices | {review['summary']['best_practices']} |

### Issues Found: {len(review['issues'])}

"""

    for issue in review['issues']:
        severity_emoji = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}.get(issue['severity'], '⚪')
        comment += f"- {severity_emoji} **{issue['type'].title()}** ({issue['severity']}): {issue['message']} - `{issue['file']}:{issue['line']}`\n"

    comment += f"\n### Quality Gate: {'PASSED' if gate['passed'] else 'FAILED'}\n"

    if gate['failures']:
        comment += "\n**Failures:**\n"
        for failure in gate['failures']:
            comment += f"- {failure}\n"

    comment += "\n---\n*Powered by CodeGuardian*"

    return comment


@webhooks_bp.route('/webhooks/gitlab', methods=['POST'])
@handle_errors
def gitlab_webhook() -> Tuple[Any, int]:
    """
    Handle GitLab webhook events.

    Processes merge request events and triggers automatic code reviews.

    Headers:
        X-Gitlab-Token: Secret token for verification
        X-Gitlab-Event: Event type

    Returns:
        Webhook processing result.
    """
    global _event_counter

    # Get headers
    token = request.headers.get('X-Gitlab-Token', '')
    event_type = request.headers.get('X-Gitlab-Event', '')

    if not event_type:
        raise ValidationError("Missing X-Gitlab-Event header")

    data = request.get_json() or {}

    # Find matching webhook configuration
    project = data.get('project', {})
    repo_path = project.get('path_with_namespace', '')
    config = None

    for cfg in _webhook_configs.values():
        if cfg.get('platform') == 'gitlab' and cfg.get('repository') == repo_path:
            config = cfg
            break

    # Verify token if config found
    if config and config.get('secret'):
        if not verify_gitlab_token(token, config['secret']):
            logger.warning(f"Invalid GitLab token for {repo_path}")
            raise AuthorizationError("Invalid webhook token")

    # Log event
    _event_counter += 1
    event = {
        'id': _event_counter,
        'platform': 'gitlab',
        'event_type': event_type,
        'repository': repo_path,
        'payload': data,
        'processed': False,
        'created_at': datetime.utcnow().isoformat()
    }
    _webhook_events.append(event)

    # Process event
    result = _process_gitlab_event(event_type, data, config)

    event['processed'] = True
    event['result'] = result

    logger.info(f"Processed GitLab {event_type} event for {repo_path}")

    return APIResponse.success(
        data=result,
        message=f"Webhook event '{event_type}' processed successfully"
    )


def _process_gitlab_event(event_type: str, data: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Process a GitLab webhook event."""
    if event_type == 'Merge Request Hook':
        return _handle_merge_request(data, config)
    elif event_type == 'Push Hook':
        return _handle_gitlab_push(data, config)
    else:
        return {'message': f'Event type "{event_type}" acknowledged but not processed'}


def _handle_merge_request(data: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Handle GitLab merge request event."""
    attrs = data.get('object_attributes', {})
    action = attrs.get('action', '')

    if action not in ['open', 'update', 'reopen']:
        return {
            'action': action,
            'status': 'skipped',
            'message': f'MR action "{action}" does not trigger review'
        }

    # Similar to GitHub PR handling
    mr_number = attrs.get('iid')
    mr_title = attrs.get('title', '')
    mr_url = attrs.get('url', '')

    review_result = _simulate_code_review({}, config)
    gate_result = _check_quality_gate(review_result, config)

    return {
        'action': action,
        'mr_number': mr_number,
        'mr_title': mr_title,
        'mr_url': mr_url,
        'review': review_result,
        'quality_gate': gate_result,
        'status': 'success' if gate_result['passed'] else 'failed'
    }


def _handle_gitlab_push(data: Dict, config: Optional[Dict]) -> Dict[str, Any]:
    """Handle GitLab push event."""
    ref = data.get('ref', '')
    commits = data.get('commits', [])

    return {
        'ref': ref,
        'commits_count': len(commits),
        'status': 'acknowledged'
    }


@webhooks_bp.route('/webhooks/configure', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def configure_webhook() -> Tuple[Any, int]:
    """
    Configure webhook settings for a repository.

    Request Body:
        platform (str): 'github' or 'gitlab'
        repository (str): Repository full name
        secret (str, optional): Webhook secret for verification
        events (list, optional): Events to listen for
        post_comments (bool, optional): Post review comments on PRs
        quality_gate (dict, optional): Quality gate thresholds
        notifications (dict, optional): Notification settings

    Returns:
        Webhook configuration with generated URL.
    """
    global _config_counter
    user = request.current_user
    data = RequestValidator.get_json_body()

    # Validate required fields
    platform = RequestValidator.get_required_field(data, 'platform', str).lower()
    repository = RequestValidator.get_required_field(data, 'repository', str)

    if platform not in ['github', 'gitlab']:
        raise ValidationError(f"Invalid platform '{platform}'. Must be 'github' or 'gitlab'", field='platform')

    # Get optional fields
    secret = RequestValidator.get_optional_field(data, 'secret', '', str)
    events = RequestValidator.get_optional_field(data, 'events', ['pull_request', 'push'], list)
    post_comments = RequestValidator.get_optional_field(data, 'post_comments', True, bool)
    quality_gate = RequestValidator.get_optional_field(data, 'quality_gate', {}, dict)
    notifications = RequestValidator.get_optional_field(data, 'notifications', {}, dict)

    # Create or update configuration
    existing_config = None
    for config_id, cfg in _webhook_configs.items():
        if cfg['user_id'] == user.id and cfg['repository'] == repository and cfg['platform'] == platform:
            existing_config = config_id
            break

    now = datetime.utcnow().isoformat()

    if existing_config:
        config_id = existing_config
        _webhook_configs[config_id].update({
            'secret': secret,
            'events': events,
            'post_comments': post_comments,
            'quality_gate': quality_gate,
            'notifications': notifications,
            'updated_at': now
        })
        message = "Webhook configuration updated"
    else:
        _config_counter += 1
        config_id = _config_counter
        _webhook_configs[config_id] = {
            'id': config_id,
            'user_id': user.id,
            'platform': platform,
            'repository': repository,
            'secret': secret,
            'events': events,
            'post_comments': post_comments,
            'quality_gate': quality_gate,
            'notifications': notifications,
            'enabled': True,
            'created_at': now,
            'updated_at': now
        }
        message = "Webhook configuration created"

    # Generate webhook URL
    base_url = request.host_url.rstrip('/')
    webhook_url = f"{base_url}/api/webhooks/{platform}"

    logger.info(f"User {user.id} configured webhook for {platform}/{repository}")

    return APIResponse.success(
        data={
            **_webhook_configs[config_id],
            'webhook_url': webhook_url,
            'setup_instructions': _get_setup_instructions(platform, webhook_url, secret)
        },
        message=message
    )


def _get_setup_instructions(platform: str, url: str, secret: str) -> Dict[str, Any]:
    """Get setup instructions for the webhook."""
    if platform == 'github':
        return {
            'steps': [
                'Go to your repository Settings > Webhooks > Add webhook',
                f'Set Payload URL to: {url}',
                'Set Content type to: application/json',
                f'Set Secret to: {secret}' if secret else 'Leave Secret empty (not recommended)',
                'Select events: Pull requests, Pushes',
                'Click "Add webhook"'
            ],
            'documentation': 'https://docs.github.com/en/webhooks'
        }
    else:
        return {
            'steps': [
                'Go to your project Settings > Webhooks > Add webhook',
                f'Set URL to: {url}',
                f'Set Secret token to: {secret}' if secret else 'Leave Secret token empty (not recommended)',
                'Select triggers: Merge request events, Push events',
                'Click "Add webhook"'
            ],
            'documentation': 'https://docs.gitlab.com/ee/user/project/integrations/webhooks.html'
        }


@webhooks_bp.route('/webhooks/configurations', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_webhook_configurations() -> Tuple[Any, int]:
    """
    List webhook configurations for the current user.

    Returns:
        List of webhook configurations.
    """
    user = request.current_user

    configs = [
        cfg for cfg in _webhook_configs.values()
        if cfg['user_id'] == user.id
    ]

    # Sort by created_at descending
    configs.sort(key=lambda x: x.get('created_at', ''), reverse=True)

    return APIResponse.success(
        data={
            'configurations': configs,
            'total': len(configs)
        },
        message=f"Found {len(configs)} webhook configurations"
    )


@webhooks_bp.route('/webhooks/configurations/<int:config_id>', methods=['DELETE'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def delete_webhook_configuration(config_id: int) -> Tuple[Any, int]:
    """
    Delete a webhook configuration.

    Path Parameters:
        config_id: ID of the configuration to delete

    Returns:
        Deletion confirmation.
    """
    user = request.current_user

    config = _webhook_configs.get(config_id)
    if not config:
        raise NotFoundError("Webhook configuration", config_id)

    if config['user_id'] != user.id:
        raise AuthorizationError("You can only delete your own webhook configurations")

    del _webhook_configs[config_id]

    logger.info(f"User {user.id} deleted webhook configuration {config_id}")

    return APIResponse.success(message="Webhook configuration deleted")


@webhooks_bp.route('/webhooks/events', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def list_webhook_events() -> Tuple[Any, int]:
    """
    List recent webhook events for the current user's repositories.

    Query Parameters:
        platform (str): Filter by platform
        repository (str): Filter by repository
        limit (int): Number of events to return (default: 50)

    Returns:
        List of webhook events.
    """
    user = request.current_user

    platform = request.args.get('platform', '').lower()
    repository = request.args.get('repository', '')
    limit = RequestValidator.get_int_param('limit', 50, min_val=1, max_val=200)

    # Get user's configured repositories
    user_repos = {cfg['repository'] for cfg in _webhook_configs.values() if cfg['user_id'] == user.id}

    # Filter events
    events = []
    for event in reversed(_webhook_events):
        if event['repository'] not in user_repos:
            continue
        if platform and event['platform'] != platform:
            continue
        if repository and event['repository'] != repository:
            continue

        # Don't include full payload in list
        event_summary = {k: v for k, v in event.items() if k != 'payload'}
        events.append(event_summary)

        if len(events) >= limit:
            break

    return APIResponse.success(
        data={
            'events': events,
            'total': len(events)
        },
        message=f"Found {len(events)} webhook events"
    )


@webhooks_bp.route('/webhooks/quality-gates', methods=['GET'])
@cross_origin()
@require_auth
@log_request
@handle_errors
def get_quality_gate_templates() -> Tuple[Any, int]:
    """
    Get available quality gate templates.

    Returns:
        List of quality gate templates.
    """
    templates = [
        {
            'id': 'strict',
            'name': 'Strict',
            'description': 'High standards for production code',
            'thresholds': {
                'min_score': 85.0,
                'max_high_severity': 0,
                'max_medium_severity': 2,
                'block_on_security': True
            }
        },
        {
            'id': 'standard',
            'name': 'Standard',
            'description': 'Balanced approach for most projects',
            'thresholds': {
                'min_score': 70.0,
                'max_high_severity': 0,
                'max_medium_severity': 5,
                'block_on_security': True
            }
        },
        {
            'id': 'relaxed',
            'name': 'Relaxed',
            'description': 'Lenient rules for rapid development',
            'thresholds': {
                'min_score': 60.0,
                'max_high_severity': 1,
                'max_medium_severity': 10,
                'block_on_security': False
            }
        },
        {
            'id': 'security-focused',
            'name': 'Security Focused',
            'description': 'Strict security requirements',
            'thresholds': {
                'min_score': 70.0,
                'max_high_severity': 0,
                'max_medium_severity': 5,
                'block_on_security': True,
                'require_security_scan': True
            }
        }
    ]

    return APIResponse.success(
        data={'templates': templates},
        message="Quality gate templates retrieved"
    )


@webhooks_bp.route('/webhooks/test', methods=['POST'])
@cross_origin()
@require_auth
@log_request
@handle_errors
@validate_json
def test_webhook() -> Tuple[Any, int]:
    """
    Test webhook configuration by simulating an event.

    Request Body:
        config_id (int): Webhook configuration ID
        event_type (str): Event type to simulate

    Returns:
        Simulated event result.
    """
    user = request.current_user
    data = RequestValidator.get_json_body()

    config_id = RequestValidator.get_required_field(data, 'config_id', int)
    event_type = RequestValidator.get_optional_field(data, 'event_type', 'pull_request', str)

    config = _webhook_configs.get(config_id)
    if not config:
        raise NotFoundError("Webhook configuration", config_id)

    if config['user_id'] != user.id:
        raise AuthorizationError("You can only test your own webhook configurations")

    # Simulate event
    if config['platform'] == 'github':
        test_data = {
            'action': 'opened',
            'repository': {'full_name': config['repository']},
            'pull_request': {
                'number': 1,
                'title': 'Test PR',
                'html_url': f"https://github.com/{config['repository']}/pull/1",
                'head': {'sha': 'abc123', 'ref': 'feature/test'},
                'base': {'ref': 'main'}
            }
        }
        result = _process_github_event(event_type, test_data, config)
    else:
        test_data = {
            'object_attributes': {
                'action': 'open',
                'iid': 1,
                'title': 'Test MR',
                'url': f"https://gitlab.com/{config['repository']}/-/merge_requests/1"
            },
            'project': {'path_with_namespace': config['repository']}
        }
        result = _process_gitlab_event('Merge Request Hook', test_data, config)

    return APIResponse.success(
        data={
            'test_event': event_type,
            'result': result
        },
        message="Webhook test completed successfully"
    )
