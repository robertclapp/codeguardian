"""
Git Hooks Integration routes for CodeGuardian

Provides configuration and execution endpoints for git hook
integrations including pre-commit and pre-push reviews.
"""

from datetime import datetime
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import uuid

from src.database import db
from src.models.repository import Repository
from src.responses import APIResponse
from src.services import EventService
from src.exceptions import NotFoundError, ValidationError


hooks_bp = Blueprint('hooks', __name__)


# Hook Configuration Models

class HookConfiguration(db.Model):
    """Git hook configuration for a repository"""
    __tablename__ = 'hook_configurations'

    id = db.Column(db.Integer, primary_key=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False)

    # Hook type and status
    hook_type = db.Column(db.String(50), nullable=False)  # pre-commit, pre-push
    is_enabled = db.Column(db.Boolean, default=True)

    # Configuration
    config = db.Column(db.JSON, default=dict)

    # API key for hook authentication
    api_key = db.Column(db.String(100), unique=True, nullable=False)

    # Thresholds
    fail_on_errors = db.Column(db.Boolean, default=True)
    fail_on_warnings = db.Column(db.Boolean, default=False)
    max_issues = db.Column(db.Integer, default=10)

    # Skip patterns
    skip_patterns = db.Column(db.JSON, default=list)  # Files to skip

    # Auto-fix
    auto_fix_enabled = db.Column(db.Boolean, default=False)
    auto_fix_types = db.Column(db.JSON, default=list)  # Issue types to auto-fix

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    repository = db.relationship('Repository', backref='hook_configurations')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'repository_id': self.repository_id,
            'hook_type': self.hook_type,
            'is_enabled': self.is_enabled,
            'config': self.config or {},
            'api_key': self.api_key,
            'thresholds': {
                'fail_on_errors': self.fail_on_errors,
                'fail_on_warnings': self.fail_on_warnings,
                'max_issues': self.max_issues
            },
            'skip_patterns': self.skip_patterns or [],
            'auto_fix': {
                'enabled': self.auto_fix_enabled,
                'types': self.auto_fix_types or []
            },
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class HookExecution(db.Model):
    """Record of hook executions"""
    __tablename__ = 'hook_executions'

    id = db.Column(db.Integer, primary_key=True)
    configuration_id = db.Column(db.Integer, db.ForeignKey('hook_configurations.id'), nullable=False)

    # Execution details
    commit_sha = db.Column(db.String(40))
    branch = db.Column(db.String(255))
    author = db.Column(db.String(255))

    # Results
    status = db.Column(db.String(20), nullable=False)  # passed, failed, error
    issues_found = db.Column(db.Integer, default=0)
    issues_fixed = db.Column(db.Integer, default=0)
    execution_time_ms = db.Column(db.Integer)

    # Details
    files_checked = db.Column(db.JSON, default=list)
    results = db.Column(db.JSON, default=dict)
    error_message = db.Column(db.Text)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    configuration = db.relationship('HookConfiguration', backref='executions')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'configuration_id': self.configuration_id,
            'commit_sha': self.commit_sha,
            'branch': self.branch,
            'author': self.author,
            'status': self.status,
            'issues_found': self.issues_found,
            'issues_fixed': self.issues_fixed,
            'execution_time_ms': self.execution_time_ms,
            'files_checked': self.files_checked or [],
            'results': self.results or {},
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# API Routes

@hooks_bp.route('/hooks/config', methods=['POST'])
@jwt_required()
def create_hook_config():
    """
    Create a new git hook configuration

    Sets up pre-commit or pre-push hooks for a repository.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    repository_id = data.get('repository_id')
    hook_type = data.get('hook_type', 'pre-commit')

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    if hook_type not in ['pre-commit', 'pre-push']:
        return APIResponse.validation_error("Invalid hook_type. Use 'pre-commit' or 'pre-push'")

    # Verify repository access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Check if config already exists
    existing = HookConfiguration.query.filter_by(
        repository_id=repository_id,
        hook_type=hook_type
    ).first()

    if existing:
        return APIResponse.conflict(f"{hook_type} hook already configured for this repository")

    # Create configuration
    config = HookConfiguration(
        repository_id=repository_id,
        hook_type=hook_type,
        is_enabled=data.get('is_enabled', True),
        config=data.get('config', {}),
        api_key=f"hook_{uuid.uuid4().hex}",
        fail_on_errors=data.get('fail_on_errors', True),
        fail_on_warnings=data.get('fail_on_warnings', False),
        max_issues=data.get('max_issues', 10),
        skip_patterns=data.get('skip_patterns', []),
        auto_fix_enabled=data.get('auto_fix_enabled', False),
        auto_fix_types=data.get('auto_fix_types', [])
    )

    db.session.add(config)
    db.session.commit()

    # Log audit
    EventService.log_audit(
        action='create_hook_config',
        resource_type='hook_configuration',
        resource_id=str(config.id),
        user_id=user_id,
        new_values={'hook_type': hook_type, 'repository_id': repository_id}
    )

    # Generate installation instructions
    install_instructions = _generate_install_instructions(config, repository)

    return APIResponse.created({
        'configuration': config.to_dict(),
        'installation': install_instructions
    })


@hooks_bp.route('/hooks/config/<int:config_id>', methods=['GET'])
@jwt_required()
def get_hook_config(config_id: int):
    """Get hook configuration details"""
    user_id = get_jwt_identity()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied to this configuration")

    return APIResponse.success(config.to_dict())


@hooks_bp.route('/hooks/config/<int:config_id>', methods=['PUT'])
@jwt_required()
def update_hook_config(config_id: int):
    """Update hook configuration"""
    user_id = get_jwt_identity()
    data = request.get_json()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied to this configuration")

    # Store old values for audit
    old_values = {
        'is_enabled': config.is_enabled,
        'fail_on_errors': config.fail_on_errors,
        'max_issues': config.max_issues
    }

    # Update fields
    if 'is_enabled' in data:
        config.is_enabled = data['is_enabled']
    if 'config' in data:
        config.config = data['config']
    if 'fail_on_errors' in data:
        config.fail_on_errors = data['fail_on_errors']
    if 'fail_on_warnings' in data:
        config.fail_on_warnings = data['fail_on_warnings']
    if 'max_issues' in data:
        config.max_issues = data['max_issues']
    if 'skip_patterns' in data:
        config.skip_patterns = data['skip_patterns']
    if 'auto_fix_enabled' in data:
        config.auto_fix_enabled = data['auto_fix_enabled']
    if 'auto_fix_types' in data:
        config.auto_fix_types = data['auto_fix_types']

    db.session.commit()

    # Log audit
    EventService.log_audit(
        action='update_hook_config',
        resource_type='hook_configuration',
        resource_id=str(config_id),
        user_id=user_id,
        old_values=old_values,
        new_values={
            'is_enabled': config.is_enabled,
            'fail_on_errors': config.fail_on_errors,
            'max_issues': config.max_issues
        }
    )

    return APIResponse.success(config.to_dict())


@hooks_bp.route('/hooks/config/<int:config_id>', methods=['DELETE'])
@jwt_required()
def delete_hook_config(config_id: int):
    """Delete hook configuration"""
    user_id = get_jwt_identity()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied to this configuration")

    db.session.delete(config)
    db.session.commit()

    EventService.log_audit(
        action='delete_hook_config',
        resource_type='hook_configuration',
        resource_id=str(config_id),
        user_id=user_id
    )

    return APIResponse.no_content()


@hooks_bp.route('/hooks/repository/<int:repository_id>', methods=['GET'])
@jwt_required()
def get_repository_hooks(repository_id: int):
    """Get all hook configurations for a repository"""
    user_id = get_jwt_identity()

    # Verify access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    configs = HookConfiguration.query.filter_by(
        repository_id=repository_id
    ).all()

    return APIResponse.success([c.to_dict() for c in configs])


@hooks_bp.route('/hooks/execute', methods=['POST'])
def execute_hook():
    """
    Execute a git hook

    Called by the git hook script to run code review.
    Authenticated via API key.
    """
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    api_key = data.get('api_key')
    if not api_key:
        return APIResponse.unauthorized("API key is required")

    # Find configuration
    config = HookConfiguration.query.filter_by(api_key=api_key).first()
    if not config:
        return APIResponse.unauthorized("Invalid API key")

    if not config.is_enabled:
        return APIResponse.success({
            'status': 'skipped',
            'message': 'Hook is disabled'
        })

    # Get execution details
    files = data.get('files', [])
    commit_sha = data.get('commit_sha')
    branch = data.get('branch')
    author = data.get('author')

    import time
    start_time = time.time()

    # Filter files based on skip patterns
    files_to_check = _filter_files(files, config.skip_patterns or [])

    # Perform review
    results = _perform_hook_review(files_to_check, config)

    execution_time = int((time.time() - start_time) * 1000)

    # Determine status
    status = 'passed'
    if results['errors'] > 0 and config.fail_on_errors:
        status = 'failed'
    elif results['warnings'] > 0 and config.fail_on_warnings:
        status = 'failed'
    elif results['total_issues'] > config.max_issues:
        status = 'failed'

    # Record execution
    execution = HookExecution(
        configuration_id=config.id,
        commit_sha=commit_sha,
        branch=branch,
        author=author,
        status=status,
        issues_found=results['total_issues'],
        issues_fixed=results.get('issues_fixed', 0),
        execution_time_ms=execution_time,
        files_checked=files_to_check,
        results=results
    )

    db.session.add(execution)
    db.session.commit()

    return APIResponse.success({
        'execution_id': execution.id,
        'status': status,
        'issues_found': results['total_issues'],
        'issues_fixed': results.get('issues_fixed', 0),
        'errors': results['errors'],
        'warnings': results['warnings'],
        'execution_time_ms': execution_time,
        'details': results.get('details', []),
        'auto_fixes': results.get('auto_fixes', [])
    })


@hooks_bp.route('/hooks/executions/<int:config_id>', methods=['GET'])
@jwt_required()
def get_executions(config_id: int):
    """Get execution history for a hook configuration"""
    user_id = get_jwt_identity()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied")

    limit = min(int(request.args.get('limit', 20)), 100)

    executions = HookExecution.query.filter_by(
        configuration_id=config_id
    ).order_by(HookExecution.created_at.desc()).limit(limit).all()

    return APIResponse.success([e.to_dict() for e in executions])


@hooks_bp.route('/hooks/regenerate-key/<int:config_id>', methods=['POST'])
@jwt_required()
def regenerate_api_key(config_id: int):
    """Regenerate API key for hook configuration"""
    user_id = get_jwt_identity()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied")

    # Generate new key
    old_key = config.api_key
    config.api_key = f"hook_{uuid.uuid4().hex}"

    db.session.commit()

    EventService.log_audit(
        action='regenerate_hook_key',
        resource_type='hook_configuration',
        resource_id=str(config_id),
        user_id=user_id
    )

    return APIResponse.success({
        'api_key': config.api_key,
        'message': 'API key regenerated. Update your git hooks with the new key.'
    })


@hooks_bp.route('/hooks/install/<int:config_id>', methods=['GET'])
@jwt_required()
def get_install_script(config_id: int):
    """Get installation script for hook"""
    user_id = get_jwt_identity()

    config = HookConfiguration.query.get(config_id)
    if not config:
        return APIResponse.not_found('Hook configuration', config_id)

    # Verify access
    repository = Repository.query.filter_by(
        id=config.repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.forbidden("Access denied")

    # Generate script
    script = _generate_hook_script(config)

    return APIResponse.success({
        'script': script,
        'hook_type': config.hook_type,
        'installation_path': f'.git/hooks/{config.hook_type}'
    })


# Helper Functions

def _generate_install_instructions(config: HookConfiguration, repository: Repository) -> Dict:
    """Generate installation instructions for hook"""
    return {
        'steps': [
            {
                'step': 1,
                'title': 'Install CodeGuardian CLI',
                'command': 'npm install -g @codeguardian/cli'
            },
            {
                'step': 2,
                'title': 'Initialize hook',
                'command': f'codeguardian hooks init --type {config.hook_type} --key {config.api_key}'
            },
            {
                'step': 3,
                'title': 'Or manual installation',
                'description': f'Copy the hook script to .git/hooks/{config.hook_type}'
            }
        ],
        'hook_path': f'.git/hooks/{config.hook_type}',
        'api_key': config.api_key,
        'manual_script_url': f'/api/hooks/install/{config.id}'
    }


def _generate_hook_script(config: HookConfiguration) -> str:
    """Generate the actual hook script"""
    script = f'''#!/bin/sh
# CodeGuardian {config.hook_type} hook
# Auto-generated script

API_KEY="{config.api_key}"
API_URL="${{CODEGUARDIAN_API_URL:-https://api.codeguardian.io}}"

# Get staged files (for pre-commit)
if [ "{config.hook_type}" = "pre-commit" ]; then
    FILES=$(git diff --cached --name-only --diff-filter=ACM)
else
    # Get files to be pushed (for pre-push)
    FILES=$(git diff --name-only @{{upstream}}..HEAD 2>/dev/null || git diff --name-only HEAD~1)
fi

if [ -z "$FILES" ]; then
    echo "CodeGuardian: No files to check"
    exit 0
fi

# Prepare request
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
AUTHOR=$(git config user.email 2>/dev/null || echo "")

# Convert files to JSON array
FILES_JSON=$(echo "$FILES" | awk '{{printf "\\"%s\\",", $0}}' | sed 's/,$//')

# Make API request
RESPONSE=$(curl -s -X POST "$API_URL/api/hooks/execute" \\
    -H "Content-Type: application/json" \\
    -d "{{
        \\"api_key\\": \\"$API_KEY\\",
        \\"files\\": [$FILES_JSON],
        \\"commit_sha\\": \\"$COMMIT_SHA\\",
        \\"branch\\": \\"$BRANCH\\",
        \\"author\\": \\"$AUTHOR\\"
    }}")

# Parse response
STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
ISSUES=$(echo "$RESPONSE" | grep -o '"issues_found":[0-9]*' | cut -d':' -f2)

if [ "$STATUS" = "failed" ]; then
    echo "CodeGuardian: Review failed with $ISSUES issues"
    echo "$RESPONSE" | grep -o '"details":\\[[^]]*\\]' | sed 's/.*\\[//;s/\\].*//' | tr ',' '\\n'
    exit 1
elif [ "$STATUS" = "passed" ]; then
    echo "CodeGuardian: Review passed"
    if [ "$ISSUES" -gt 0 ]; then
        echo "  $ISSUES issues found (below threshold)"
    fi
    exit 0
else
    echo "CodeGuardian: $RESPONSE"
    exit 0
fi
'''
    return script


def _filter_files(files: List[str], skip_patterns: List[str]) -> List[str]:
    """Filter files based on skip patterns"""
    import fnmatch

    filtered = []
    for file_path in files:
        skip = False
        for pattern in skip_patterns:
            if fnmatch.fnmatch(file_path, pattern):
                skip = True
                break
        if not skip:
            filtered.append(file_path)

    return filtered


def _perform_hook_review(files: List[str], config: HookConfiguration) -> Dict:
    """Perform code review for hook execution"""

    # Simulate review (in production, would call AI service)
    issues = []
    errors = 0
    warnings = 0
    auto_fixes = []

    for file_path in files:
        # Simulate finding issues
        file_issues = _analyze_file_for_hook(file_path)

        for issue in file_issues:
            issues.append({
                'file': file_path,
                'line': issue.get('line', 1),
                'severity': issue['severity'],
                'message': issue['message'],
                'category': issue.get('category', 'general')
            })

            if issue['severity'] == 'error':
                errors += 1
            else:
                warnings += 1

            # Check for auto-fix
            if config.auto_fix_enabled:
                if issue.get('category') in (config.auto_fix_types or []):
                    if issue.get('fix'):
                        auto_fixes.append({
                            'file': file_path,
                            'issue': issue['message'],
                            'fix': issue['fix']
                        })

    return {
        'total_issues': len(issues),
        'errors': errors,
        'warnings': warnings,
        'details': issues[:20],  # Limit details
        'auto_fixes': auto_fixes,
        'issues_fixed': len(auto_fixes)
    }


def _analyze_file_for_hook(file_path: str) -> List[Dict]:
    """Analyze a single file for issues (simplified)"""
    issues = []

    # Extension-based basic checks
    if file_path.endswith('.py'):
        # Python-specific checks
        issues.append({
            'severity': 'warning',
            'message': 'Consider adding type hints',
            'category': 'style',
            'line': 1
        })
    elif file_path.endswith('.js') or file_path.endswith('.ts'):
        # JavaScript/TypeScript checks
        issues.append({
            'severity': 'warning',
            'message': 'Consider using const instead of let',
            'category': 'style',
            'line': 1,
            'fix': 'Replace let with const where appropriate'
        })

    return issues
