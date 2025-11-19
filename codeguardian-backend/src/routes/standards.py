"""
Team Code Standards for CodeGuardian

Define, enforce, and track compliance with team coding standards.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc

from src.database import db
from src.responses import APIResponse
from src.services import EventService, AuthorizationService


standards_bp = Blueprint('standards', __name__)


# Standard Models

class CodeStandard(db.Model):
    """Team code standard definition"""
    __tablename__ = 'code_standards'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False, index=True)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Standard info
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50), default='style')  # style, security, performance, testing
    severity = db.Column(db.String(20), default='warning')  # info, warning, error

    # Rule definition
    rule_type = db.Column(db.String(50), nullable=False)  # pattern, ast, metric, custom
    rule_config = db.Column(db.JSON, nullable=False)  # Rule-specific configuration

    # Applicability
    languages = db.Column(db.JSON, default=list)  # Empty = all languages
    file_patterns = db.Column(db.JSON, default=list)  # Glob patterns

    # State
    is_active = db.Column(db.Boolean, default=True)
    auto_fix = db.Column(db.Boolean, default=False)
    fix_template = db.Column(db.Text)  # Code template for auto-fix

    # Exceptions
    exceptions = db.Column(db.JSON, default=list)  # File patterns to exclude

    # Metadata
    tags = db.Column(db.JSON, default=list)
    documentation_url = db.Column(db.String(500))

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = db.relationship('User', backref='created_standards')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'team_id': self.team_id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'severity': self.severity,
            'rule': {
                'type': self.rule_type,
                'config': self.rule_config
            },
            'applicability': {
                'languages': self.languages or [],
                'file_patterns': self.file_patterns or []
            },
            'is_active': self.is_active,
            'auto_fix': self.auto_fix,
            'exceptions': self.exceptions or [],
            'tags': self.tags or [],
            'documentation_url': self.documentation_url,
            'created_by': self.creator.username if self.creator else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class StandardViolation(db.Model):
    """Record of standard violations"""
    __tablename__ = 'standard_violations'

    id = db.Column(db.Integer, primary_key=True)
    standard_id = db.Column(db.Integer, db.ForeignKey('code_standards.id'), nullable=False, index=True)
    review_id = db.Column(db.Integer, db.ForeignKey('reviews.id'), index=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), index=True)

    # Violation details
    file_path = db.Column(db.String(500), nullable=False)
    line_number = db.Column(db.Integer)
    column = db.Column(db.Integer)
    code_snippet = db.Column(db.Text)
    message = db.Column(db.Text)

    # Resolution
    status = db.Column(db.String(20), default='open')  # open, fixed, ignored, exception
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    resolved_at = db.Column(db.DateTime)
    resolution_note = db.Column(db.Text)

    # Timestamp
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    standard = db.relationship('CodeStandard', backref='violations')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'standard_id': self.standard_id,
            'standard_name': self.standard.name if self.standard else None,
            'file_path': self.file_path,
            'line_number': self.line_number,
            'code_snippet': self.code_snippet,
            'message': self.message,
            'status': self.status,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None
        }


class ComplianceReport(db.Model):
    """Periodic compliance reports"""
    __tablename__ = 'compliance_reports'

    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False, index=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), index=True)

    # Report period
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)

    # Metrics
    total_files = db.Column(db.Integer, default=0)
    files_checked = db.Column(db.Integer, default=0)
    total_violations = db.Column(db.Integer, default=0)
    violations_fixed = db.Column(db.Integer, default=0)
    compliance_score = db.Column(db.Float, default=100.0)

    # Breakdown
    violations_by_category = db.Column(db.JSON, default=dict)
    violations_by_severity = db.Column(db.JSON, default=dict)
    top_violations = db.Column(db.JSON, default=list)

    # Trends
    score_change = db.Column(db.Float, default=0)  # vs previous period

    # Generated
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'team_id': self.team_id,
            'repository_id': self.repository_id,
            'period': {
                'start': self.period_start.isoformat() if self.period_start else None,
                'end': self.period_end.isoformat() if self.period_end else None
            },
            'metrics': {
                'total_files': self.total_files,
                'files_checked': self.files_checked,
                'total_violations': self.total_violations,
                'violations_fixed': self.violations_fixed,
                'compliance_score': round(self.compliance_score, 1)
            },
            'breakdown': {
                'by_category': self.violations_by_category or {},
                'by_severity': self.violations_by_severity or {},
                'top_violations': self.top_violations or []
            },
            'trend': {
                'score_change': round(self.score_change, 1),
                'direction': 'up' if self.score_change > 0 else 'down' if self.score_change < 0 else 'stable'
            },
            'generated_at': self.generated_at.isoformat() if self.generated_at else None
        }


# API Routes

@standards_bp.route('/standards', methods=['POST'])
@jwt_required()
def create_standard():
    """Create a new code standard"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No data provided")

    team_id = data.get('team_id')
    if not team_id:
        return APIResponse.validation_error("team_id is required")

    # Check team admin access
    if not AuthorizationService.is_team_admin(user_id, team_id):
        return APIResponse.forbidden("Only team admins can create standards")

    # Validate required fields
    if not data.get('name'):
        return APIResponse.validation_error("name is required")
    if not data.get('rule_type'):
        return APIResponse.validation_error("rule_type is required")
    if not data.get('rule_config'):
        return APIResponse.validation_error("rule_config is required")

    standard = CodeStandard(
        team_id=team_id,
        created_by=user_id,
        name=data['name'],
        description=data.get('description'),
        category=data.get('category', 'style'),
        severity=data.get('severity', 'warning'),
        rule_type=data['rule_type'],
        rule_config=data['rule_config'],
        languages=data.get('languages', []),
        file_patterns=data.get('file_patterns', []),
        auto_fix=data.get('auto_fix', False),
        fix_template=data.get('fix_template'),
        exceptions=data.get('exceptions', []),
        tags=data.get('tags', []),
        documentation_url=data.get('documentation_url')
    )

    db.session.add(standard)
    db.session.commit()

    EventService.log(user_id, 'standard_created', {
        'standard_id': standard.id,
        'team_id': team_id,
        'name': standard.name
    })

    return APIResponse.created(standard.to_dict())


@standards_bp.route('/standards', methods=['GET'])
@jwt_required()
def get_standards():
    """Get team standards"""
    user_id = get_jwt_identity()

    team_id = request.args.get('team_id', type=int)
    category = request.args.get('category')
    active_only = request.args.get('active', 'true').lower() == 'true'

    if not team_id:
        return APIResponse.validation_error("team_id is required")

    # Check team access
    if not AuthorizationService.is_team_member(user_id, team_id):
        return APIResponse.forbidden("Not a team member")

    query = CodeStandard.query.filter_by(team_id=team_id)

    if active_only:
        query = query.filter_by(is_active=True)
    if category:
        query = query.filter_by(category=category)

    standards = query.order_by(CodeStandard.category, CodeStandard.name).all()

    return APIResponse.success([s.to_dict() for s in standards])


@standards_bp.route('/standards/<int:standard_id>', methods=['GET'])
@jwt_required()
def get_standard(standard_id: int):
    """Get standard details"""
    user_id = get_jwt_identity()

    standard = CodeStandard.query.get(standard_id)
    if not standard:
        return APIResponse.not_found('Standard', standard_id)

    # Check team access
    if not AuthorizationService.is_team_member(user_id, standard.team_id):
        return APIResponse.forbidden("Not a team member")

    return APIResponse.success(standard.to_dict())


@standards_bp.route('/standards/<int:standard_id>', methods=['PUT'])
@jwt_required()
def update_standard(standard_id: int):
    """Update a standard"""
    user_id = get_jwt_identity()
    data = request.get_json()

    standard = CodeStandard.query.get(standard_id)
    if not standard:
        return APIResponse.not_found('Standard', standard_id)

    # Check admin access
    if not AuthorizationService.is_team_admin(user_id, standard.team_id):
        return APIResponse.forbidden("Only team admins can update standards")

    # Update fields
    updatable = ['name', 'description', 'category', 'severity', 'rule_config',
                 'languages', 'file_patterns', 'is_active', 'auto_fix',
                 'fix_template', 'exceptions', 'tags', 'documentation_url']

    for field in updatable:
        if field in data:
            setattr(standard, field, data[field])

    db.session.commit()

    EventService.log(user_id, 'standard_updated', {
        'standard_id': standard_id
    })

    return APIResponse.success(standard.to_dict())


@standards_bp.route('/standards/<int:standard_id>', methods=['DELETE'])
@jwt_required()
def delete_standard(standard_id: int):
    """Delete a standard"""
    user_id = get_jwt_identity()

    standard = CodeStandard.query.get(standard_id)
    if not standard:
        return APIResponse.not_found('Standard', standard_id)

    # Check admin access
    if not AuthorizationService.is_team_admin(user_id, standard.team_id):
        return APIResponse.forbidden("Only team admins can delete standards")

    db.session.delete(standard)
    db.session.commit()

    EventService.log(user_id, 'standard_deleted', {
        'standard_id': standard_id
    })

    return APIResponse.no_content()


@standards_bp.route('/standards/validate', methods=['POST'])
@jwt_required()
def validate_code():
    """Validate code against team standards"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No data provided")

    team_id = data.get('team_id')
    code = data.get('code')
    file_path = data.get('file_path', 'unknown')
    language = data.get('language')

    if not team_id:
        return APIResponse.validation_error("team_id is required")
    if not code:
        return APIResponse.validation_error("code is required")

    # Get active standards
    query = CodeStandard.query.filter_by(team_id=team_id, is_active=True)

    if language:
        query = query.filter(
            db.or_(
                CodeStandard.languages == [],
                CodeStandard.languages.contains([language])
            )
        )

    standards = query.all()

    violations = []
    passed = []

    for standard in standards:
        # Check if file matches patterns
        if standard.file_patterns and not _matches_patterns(file_path, standard.file_patterns):
            continue

        # Check if file is excepted
        if standard.exceptions and _matches_patterns(file_path, standard.exceptions):
            continue

        # Validate against standard
        result = _validate_standard(code, standard)

        if result['violations']:
            for v in result['violations']:
                violations.append({
                    'standard_id': standard.id,
                    'standard_name': standard.name,
                    'category': standard.category,
                    'severity': standard.severity,
                    'line': v.get('line'),
                    'column': v.get('column'),
                    'message': v.get('message'),
                    'fix_available': standard.auto_fix
                })
        else:
            passed.append({
                'standard_id': standard.id,
                'standard_name': standard.name
            })

    return APIResponse.success({
        'file_path': file_path,
        'standards_checked': len(standards),
        'violations': violations,
        'passed': passed,
        'is_compliant': len(violations) == 0
    })


@standards_bp.route('/standards/compliance', methods=['GET'])
@jwt_required()
def get_compliance_report():
    """Get compliance report for team/repository"""
    user_id = get_jwt_identity()

    team_id = request.args.get('team_id', type=int)
    repository_id = request.args.get('repository_id', type=int)
    period = request.args.get('period', 'week')  # week, month, quarter

    if not team_id:
        return APIResponse.validation_error("team_id is required")

    # Check team access
    if not AuthorizationService.is_team_member(user_id, team_id):
        return APIResponse.forbidden("Not a team member")

    # Calculate period
    now = datetime.utcnow()
    if period == 'week':
        period_start = now - timedelta(days=7)
    elif period == 'month':
        period_start = now - timedelta(days=30)
    else:
        period_start = now - timedelta(days=90)

    # Get or generate report
    query = ComplianceReport.query.filter(
        ComplianceReport.team_id == team_id,
        ComplianceReport.period_end >= period_start
    )

    if repository_id:
        query = query.filter_by(repository_id=repository_id)

    report = query.order_by(desc(ComplianceReport.generated_at)).first()

    if not report:
        # Generate new report
        report = _generate_compliance_report(team_id, repository_id, period_start, now)

    return APIResponse.success(report.to_dict())


@standards_bp.route('/standards/violations', methods=['GET'])
@jwt_required()
def get_violations():
    """Get standard violations"""
    user_id = get_jwt_identity()

    team_id = request.args.get('team_id', type=int)
    status = request.args.get('status', 'open')
    limit = min(int(request.args.get('limit', 50)), 200)

    if not team_id:
        return APIResponse.validation_error("team_id is required")

    # Check team access
    if not AuthorizationService.is_team_member(user_id, team_id):
        return APIResponse.forbidden("Not a team member")

    # Get standards for team
    standard_ids = db.session.query(CodeStandard.id).filter_by(team_id=team_id).all()
    standard_ids = [s[0] for s in standard_ids]

    query = StandardViolation.query.filter(
        StandardViolation.standard_id.in_(standard_ids)
    )

    if status != 'all':
        query = query.filter_by(status=status)

    violations = query.order_by(desc(StandardViolation.detected_at)).limit(limit).all()

    return APIResponse.success([v.to_dict() for v in violations])


@standards_bp.route('/standards/violations/<int:violation_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_violation(violation_id: int):
    """Resolve a violation"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    violation = StandardViolation.query.get(violation_id)
    if not violation:
        return APIResponse.not_found('Violation', violation_id)

    # Check team access
    standard = violation.standard
    if not AuthorizationService.is_team_member(user_id, standard.team_id):
        return APIResponse.forbidden("Not a team member")

    status = data.get('status', 'fixed')
    if status not in ['fixed', 'ignored', 'exception']:
        return APIResponse.validation_error("Invalid status")

    violation.status = status
    violation.resolved_by = user_id
    violation.resolved_at = datetime.utcnow()
    violation.resolution_note = data.get('note')

    db.session.commit()

    return APIResponse.success(violation.to_dict())


@standards_bp.route('/standards/presets', methods=['GET'])
def get_standard_presets():
    """Get pre-defined standard presets"""
    presets = [
        {
            'id': 'security_basic',
            'name': 'Basic Security',
            'description': 'Essential security standards',
            'category': 'security',
            'standards': [
                {
                    'name': 'No hardcoded secrets',
                    'rule_type': 'pattern',
                    'rule_config': {
                        'patterns': [
                            r'password\s*=\s*["\'][^"\']+["\']',
                            r'api_key\s*=\s*["\'][^"\']+["\']',
                            r'secret\s*=\s*["\'][^"\']+["\']'
                        ]
                    },
                    'severity': 'error'
                },
                {
                    'name': 'No eval usage',
                    'rule_type': 'pattern',
                    'rule_config': {
                        'patterns': [r'\beval\s*\(']
                    },
                    'severity': 'error'
                }
            ]
        },
        {
            'id': 'python_style',
            'name': 'Python Style Guide',
            'description': 'PEP 8 style standards',
            'category': 'style',
            'languages': ['python'],
            'standards': [
                {
                    'name': 'Line length limit',
                    'rule_type': 'metric',
                    'rule_config': {
                        'metric': 'line_length',
                        'max': 100
                    },
                    'severity': 'warning'
                },
                {
                    'name': 'Snake case for functions',
                    'rule_type': 'pattern',
                    'rule_config': {
                        'patterns': [r'def\s+[a-z]+[A-Z]']
                    },
                    'severity': 'warning'
                }
            ]
        },
        {
            'id': 'testing',
            'name': 'Testing Standards',
            'description': 'Test coverage and quality',
            'category': 'testing',
            'standards': [
                {
                    'name': 'Test function naming',
                    'rule_type': 'pattern',
                    'rule_config': {
                        'patterns': [r'def\s+test_'],
                        'should_match': True
                    },
                    'severity': 'info',
                    'file_patterns': ['*_test.py', 'test_*.py']
                }
            ]
        }
    ]

    return APIResponse.success(presets)


@standards_bp.route('/standards/import-preset', methods=['POST'])
@jwt_required()
def import_preset():
    """Import a standard preset for a team"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("No data provided")

    team_id = data.get('team_id')
    preset_id = data.get('preset_id')

    if not team_id:
        return APIResponse.validation_error("team_id is required")
    if not preset_id:
        return APIResponse.validation_error("preset_id is required")

    # Check admin access
    if not AuthorizationService.is_team_admin(user_id, team_id):
        return APIResponse.forbidden("Only team admins can import presets")

    # Get preset (simplified - in production would fetch from database)
    presets = {
        'security_basic': {
            'standards': [
                {
                    'name': 'No hardcoded secrets',
                    'category': 'security',
                    'rule_type': 'pattern',
                    'rule_config': {'patterns': [r'password\s*=', r'api_key\s*=']},
                    'severity': 'error'
                }
            ]
        }
    }

    preset = presets.get(preset_id)
    if not preset:
        return APIResponse.not_found('Preset', preset_id)

    # Create standards
    created = []
    for std_data in preset['standards']:
        standard = CodeStandard(
            team_id=team_id,
            created_by=user_id,
            **std_data
        )
        db.session.add(standard)
        created.append(standard)

    db.session.commit()

    return APIResponse.success({
        'imported': len(created),
        'standards': [s.to_dict() for s in created]
    })


# Helper Functions

def _matches_patterns(file_path: str, patterns: List[str]) -> bool:
    """Check if file matches any glob patterns"""
    import fnmatch
    return any(fnmatch.fnmatch(file_path, p) for p in patterns)


def _validate_standard(code: str, standard: CodeStandard) -> Dict:
    """Validate code against a standard"""
    import re

    violations = []

    if standard.rule_type == 'pattern':
        patterns = standard.rule_config.get('patterns', [])
        should_match = standard.rule_config.get('should_match', False)

        lines = code.split('\n')
        for i, line in enumerate(lines):
            for pattern in patterns:
                match = re.search(pattern, line)
                if match and not should_match:
                    violations.append({
                        'line': i + 1,
                        'column': match.start(),
                        'message': f"Pattern '{pattern}' found: {standard.name}"
                    })
                elif not match and should_match:
                    # This is inverted - pattern should exist but doesn't
                    pass

    elif standard.rule_type == 'metric':
        metric = standard.rule_config.get('metric')

        if metric == 'line_length':
            max_length = standard.rule_config.get('max', 100)
            lines = code.split('\n')
            for i, line in enumerate(lines):
                if len(line) > max_length:
                    violations.append({
                        'line': i + 1,
                        'message': f"Line exceeds {max_length} characters ({len(line)})"
                    })

    return {'violations': violations}


def _generate_compliance_report(team_id: int, repository_id: Optional[int],
                                period_start: datetime, period_end: datetime) -> ComplianceReport:
    """Generate a compliance report"""
    # Get standards
    standards = CodeStandard.query.filter_by(team_id=team_id, is_active=True).all()
    standard_ids = [s.id for s in standards]

    # Get violations in period
    query = StandardViolation.query.filter(
        StandardViolation.standard_id.in_(standard_ids),
        StandardViolation.detected_at >= period_start,
        StandardViolation.detected_at <= period_end
    )

    if repository_id:
        query = query.filter_by(repository_id=repository_id)

    violations = query.all()

    # Calculate metrics
    total_violations = len(violations)
    violations_fixed = len([v for v in violations if v.status == 'fixed'])

    # Breakdown by category
    by_category = {}
    by_severity = {}
    for v in violations:
        cat = v.standard.category if v.standard else 'unknown'
        sev = v.standard.severity if v.standard else 'unknown'
        by_category[cat] = by_category.get(cat, 0) + 1
        by_severity[sev] = by_severity.get(sev, 0) + 1

    # Calculate compliance score
    # Simple formula: 100 - (violations * severity_weight)
    severity_weights = {'error': 5, 'warning': 2, 'info': 0.5}
    penalty = sum(severity_weights.get(v.standard.severity, 1) for v in violations if v.standard)
    compliance_score = max(0, 100 - penalty)

    report = ComplianceReport(
        team_id=team_id,
        repository_id=repository_id,
        period_start=period_start,
        period_end=period_end,
        total_violations=total_violations,
        violations_fixed=violations_fixed,
        compliance_score=compliance_score,
        violations_by_category=by_category,
        violations_by_severity=by_severity
    )

    db.session.add(report)
    db.session.commit()

    return report
