"""
Dependency Health Monitor for CodeGuardian

Track dependencies, vulnerabilities, updates, and license compliance.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc

from src.database import db
from src.responses import APIResponse
from src.services import EventService, AuthorizationService


dependencies_bp = Blueprint('dependencies', __name__)


# Dependency Models

class Dependency(db.Model):
    """Repository dependency"""
    __tablename__ = 'dependencies'

    id = db.Column(db.Integer, primary_key=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False, index=True)

    # Dependency info
    name = db.Column(db.String(200), nullable=False)
    version = db.Column(db.String(50))
    latest_version = db.Column(db.String(50))
    package_manager = db.Column(db.String(50))  # npm, pip, maven, etc.

    # Dependency type
    dependency_type = db.Column(db.String(20), default='runtime')  # runtime, dev, peer, optional
    is_direct = db.Column(db.Boolean, default=True)  # Direct vs transitive

    # Source file
    source_file = db.Column(db.String(500))  # package.json, requirements.txt, etc.

    # License info
    license = db.Column(db.String(100))
    license_type = db.Column(db.String(20))  # permissive, copyleft, proprietary, unknown

    # Health metrics
    health_score = db.Column(db.Float, default=100)  # 0-100
    last_updated = db.Column(db.DateTime)  # Package's last publish date
    weekly_downloads = db.Column(db.Integer)
    maintainers_count = db.Column(db.Integer)

    # Timestamps
    first_seen = db.Column(db.DateTime, default=datetime.utcnow)
    last_scanned = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'latest_version': self.latest_version,
            'package_manager': self.package_manager,
            'type': self.dependency_type,
            'is_direct': self.is_direct,
            'source_file': self.source_file,
            'license': {
                'name': self.license,
                'type': self.license_type
            },
            'health': {
                'score': round(self.health_score, 1) if self.health_score else None,
                'last_updated': self.last_updated.isoformat() if self.last_updated else None,
                'weekly_downloads': self.weekly_downloads,
                'maintainers': self.maintainers_count
            },
            'update_available': self.version != self.latest_version if self.version and self.latest_version else False,
            'last_scanned': self.last_scanned.isoformat() if self.last_scanned else None
        }


class Vulnerability(db.Model):
    """Known vulnerability in a dependency"""
    __tablename__ = 'vulnerabilities'

    id = db.Column(db.Integer, primary_key=True)
    dependency_id = db.Column(db.Integer, db.ForeignKey('dependencies.id'), nullable=False, index=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False, index=True)

    # Vulnerability info
    cve_id = db.Column(db.String(50))
    title = db.Column(db.String(500), nullable=False)
    description = db.Column(db.Text)
    severity = db.Column(db.String(20), nullable=False)  # critical, high, medium, low
    cvss_score = db.Column(db.Float)

    # Affected versions
    affected_versions = db.Column(db.String(200))
    patched_version = db.Column(db.String(50))

    # Status
    status = db.Column(db.String(20), default='open')  # open, fixed, ignored, in_progress
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # References
    references = db.Column(db.JSON, default=list)  # URLs to advisories

    # Timestamps
    published_at = db.Column(db.DateTime)
    detected_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    dependency = db.relationship('Dependency', backref='vulnerabilities')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'cve_id': self.cve_id,
            'dependency': self.dependency.name if self.dependency else None,
            'dependency_version': self.dependency.version if self.dependency else None,
            'title': self.title,
            'description': self.description,
            'severity': self.severity,
            'cvss_score': self.cvss_score,
            'affected_versions': self.affected_versions,
            'patched_version': self.patched_version,
            'status': self.status,
            'references': self.references or [],
            'published_at': self.published_at.isoformat() if self.published_at else None,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None
        }


class DependencyScan(db.Model):
    """Dependency scan history"""
    __tablename__ = 'dependency_scans'

    id = db.Column(db.Integer, primary_key=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False, index=True)
    triggered_by = db.Column(db.Integer, db.ForeignKey('users.id'))

    # Scan results
    status = db.Column(db.String(20), default='running')  # running, completed, failed
    total_dependencies = db.Column(db.Integer, default=0)
    direct_dependencies = db.Column(db.Integer, default=0)
    vulnerabilities_found = db.Column(db.Integer, default=0)
    updates_available = db.Column(db.Integer, default=0)
    license_issues = db.Column(db.Integer, default=0)

    # Breakdown
    by_severity = db.Column(db.JSON, default=dict)
    by_package_manager = db.Column(db.JSON, default=dict)

    # Timestamps
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'repository_id': self.repository_id,
            'status': self.status,
            'results': {
                'total_dependencies': self.total_dependencies,
                'direct_dependencies': self.direct_dependencies,
                'vulnerabilities_found': self.vulnerabilities_found,
                'updates_available': self.updates_available,
                'license_issues': self.license_issues
            },
            'breakdown': {
                'by_severity': self.by_severity or {},
                'by_package_manager': self.by_package_manager or {}
            },
            'timing': {
                'started_at': self.started_at.isoformat() if self.started_at else None,
                'completed_at': self.completed_at.isoformat() if self.completed_at else None,
                'duration_seconds': (self.completed_at - self.started_at).total_seconds() if self.completed_at and self.started_at else None
            }
        }


# API Routes

@dependencies_bp.route('/dependencies/<int:repo_id>', methods=['GET'])
@jwt_required()
def get_dependencies(repo_id: int):
    """Get repository dependencies"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id and not repo.is_public:
        # Check team access
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    # Get dependencies
    dep_type = request.args.get('type')  # runtime, dev
    direct_only = request.args.get('direct', 'false').lower() == 'true'
    package_manager = request.args.get('package_manager')

    query = Dependency.query.filter_by(repository_id=repo_id)

    if dep_type:
        query = query.filter_by(dependency_type=dep_type)
    if direct_only:
        query = query.filter_by(is_direct=True)
    if package_manager:
        query = query.filter_by(package_manager=package_manager)

    dependencies = query.order_by(Dependency.name).all()

    # Group by package manager
    grouped = {}
    for dep in dependencies:
        pm = dep.package_manager or 'unknown'
        if pm not in grouped:
            grouped[pm] = []
        grouped[pm].append(dep.to_dict())

    return APIResponse.success({
        'total': len(dependencies),
        'by_package_manager': grouped,
        'last_scan': dependencies[0].last_scanned.isoformat() if dependencies else None
    })


@dependencies_bp.route('/dependencies/<int:repo_id>/vulnerabilities', methods=['GET'])
@jwt_required()
def get_vulnerabilities(repo_id: int):
    """Get vulnerability report for repository"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id and not repo.is_public:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    # Get vulnerabilities
    severity = request.args.get('severity')
    status = request.args.get('status', 'open')

    query = Vulnerability.query.filter_by(repository_id=repo_id)

    if severity:
        query = query.filter_by(severity=severity)
    if status != 'all':
        query = query.filter_by(status=status)

    vulnerabilities = query.order_by(
        desc(Vulnerability.cvss_score),
        Vulnerability.detected_at
    ).all()

    # Summary by severity
    by_severity = {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
    for v in vulnerabilities:
        if v.severity in by_severity:
            by_severity[v.severity] += 1

    return APIResponse.success({
        'total': len(vulnerabilities),
        'by_severity': by_severity,
        'vulnerabilities': [v.to_dict() for v in vulnerabilities]
    })


@dependencies_bp.route('/dependencies/<int:repo_id>/scan', methods=['POST'])
@jwt_required()
def trigger_scan(repo_id: int):
    """Trigger a dependency scan"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    # Check for running scan
    running = DependencyScan.query.filter_by(
        repository_id=repo_id,
        status='running'
    ).first()

    if running:
        return APIResponse.error("Scan already in progress", 409)

    # Create scan
    scan = DependencyScan(
        repository_id=repo_id,
        triggered_by=user_id
    )

    db.session.add(scan)
    db.session.commit()

    # Simulate scan (in production would be async job)
    _perform_dependency_scan(scan.id, repo_id)

    EventService.log(user_id, 'dependency_scan_triggered', {
        'repository_id': repo_id,
        'scan_id': scan.id
    })

    # Reload scan with results
    db.session.refresh(scan)

    return APIResponse.created(scan.to_dict())


@dependencies_bp.route('/dependencies/<int:repo_id>/updates', methods=['GET'])
@jwt_required()
def get_available_updates(repo_id: int):
    """Get available dependency updates"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id and not repo.is_public:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    # Get dependencies with updates
    dependencies = Dependency.query.filter(
        Dependency.repository_id == repo_id,
        Dependency.version != Dependency.latest_version,
        Dependency.latest_version.isnot(None)
    ).all()

    updates = []
    for dep in dependencies:
        update_type = _classify_update(dep.version, dep.latest_version)
        updates.append({
            'dependency': dep.name,
            'current_version': dep.version,
            'latest_version': dep.latest_version,
            'package_manager': dep.package_manager,
            'update_type': update_type,
            'is_direct': dep.is_direct,
            'source_file': dep.source_file
        })

    # Group by update type
    by_type = {'major': [], 'minor': [], 'patch': []}
    for update in updates:
        update_type = update['update_type']
        if update_type in by_type:
            by_type[update_type].append(update)

    return APIResponse.success({
        'total_updates': len(updates),
        'by_type': {
            'major': len(by_type['major']),
            'minor': len(by_type['minor']),
            'patch': len(by_type['patch'])
        },
        'updates': updates
    })


@dependencies_bp.route('/dependencies/<int:repo_id>/licenses', methods=['GET'])
@jwt_required()
def get_license_report(repo_id: int):
    """Get license compliance report"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id and not repo.is_public:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    dependencies = Dependency.query.filter_by(repository_id=repo_id).all()

    # Group by license type
    by_type = {
        'permissive': [],
        'copyleft': [],
        'proprietary': [],
        'unknown': []
    }

    license_counts = {}

    for dep in dependencies:
        license_type = dep.license_type or 'unknown'
        license_name = dep.license or 'Unknown'

        if license_type in by_type:
            by_type[license_type].append({
                'name': dep.name,
                'license': license_name
            })

        license_counts[license_name] = license_counts.get(license_name, 0) + 1

    # Identify potential issues
    issues = []

    # Copyleft licenses might have restrictions
    if by_type['copyleft']:
        issues.append({
            'type': 'copyleft_detected',
            'severity': 'warning',
            'message': f"{len(by_type['copyleft'])} dependencies use copyleft licenses",
            'dependencies': [d['name'] for d in by_type['copyleft']]
        })

    # Unknown licenses need review
    if by_type['unknown']:
        issues.append({
            'type': 'unknown_license',
            'severity': 'info',
            'message': f"{len(by_type['unknown'])} dependencies have unknown licenses",
            'dependencies': [d['name'] for d in by_type['unknown']]
        })

    return APIResponse.success({
        'total_dependencies': len(dependencies),
        'license_distribution': license_counts,
        'by_type': {
            'permissive': len(by_type['permissive']),
            'copyleft': len(by_type['copyleft']),
            'proprietary': len(by_type['proprietary']),
            'unknown': len(by_type['unknown'])
        },
        'issues': issues,
        'is_compliant': len(by_type['proprietary']) == 0 and len(issues) == 0
    })


@dependencies_bp.route('/dependencies/<int:repo_id>/health', methods=['GET'])
@jwt_required()
def get_dependency_health(repo_id: int):
    """Get overall dependency health score"""
    user_id = get_jwt_identity()

    # Check access
    from src.models import Repository
    repo = Repository.query.get(repo_id)
    if not repo:
        return APIResponse.not_found('Repository', repo_id)

    if repo.owner_id != user_id and not repo.is_public:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    # Get dependencies and vulnerabilities
    dependencies = Dependency.query.filter_by(repository_id=repo_id).all()
    vulnerabilities = Vulnerability.query.filter_by(
        repository_id=repo_id,
        status='open'
    ).all()

    if not dependencies:
        return APIResponse.success({
            'health_score': 100,
            'message': 'No dependencies tracked'
        })

    # Calculate health score
    # Start at 100, deduct for issues
    score = 100

    # Vulnerability penalties
    vuln_penalties = {'critical': 20, 'high': 10, 'medium': 3, 'low': 1}
    for vuln in vulnerabilities:
        score -= vuln_penalties.get(vuln.severity, 1)

    # Outdated dependency penalties
    outdated = [d for d in dependencies if d.version != d.latest_version and d.latest_version]
    outdated_penalty = min(len(outdated) * 0.5, 20)  # Max 20 point penalty
    score -= outdated_penalty

    # Unknown license penalty
    unknown_licenses = len([d for d in dependencies if not d.license or d.license_type == 'unknown'])
    license_penalty = min(unknown_licenses * 0.2, 5)
    score -= license_penalty

    # Ensure score is in valid range
    score = max(0, min(100, score))

    # Determine health status
    if score >= 80:
        status = 'healthy'
    elif score >= 60:
        status = 'moderate'
    elif score >= 40:
        status = 'concerning'
    else:
        status = 'critical'

    return APIResponse.success({
        'health_score': round(score, 1),
        'status': status,
        'breakdown': {
            'vulnerability_impact': sum(vuln_penalties.get(v.severity, 1) for v in vulnerabilities),
            'outdated_impact': round(outdated_penalty, 1),
            'license_impact': round(license_penalty, 1)
        },
        'metrics': {
            'total_dependencies': len(dependencies),
            'open_vulnerabilities': len(vulnerabilities),
            'outdated_dependencies': len(outdated),
            'unknown_licenses': unknown_licenses
        },
        'recommendations': _get_health_recommendations(score, vulnerabilities, outdated)
    })


@dependencies_bp.route('/dependencies/scans/<int:scan_id>', methods=['GET'])
@jwt_required()
def get_scan_results(scan_id: int):
    """Get scan results"""
    user_id = get_jwt_identity()

    scan = DependencyScan.query.get(scan_id)
    if not scan:
        return APIResponse.not_found('Scan', scan_id)

    # Check access via repository
    from src.models import Repository
    repo = Repository.query.get(scan.repository_id)
    if repo.owner_id != user_id:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    return APIResponse.success(scan.to_dict())


@dependencies_bp.route('/vulnerabilities/<int:vuln_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_vulnerability(vuln_id: int):
    """Mark vulnerability as resolved"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    vuln = Vulnerability.query.get(vuln_id)
    if not vuln:
        return APIResponse.not_found('Vulnerability', vuln_id)

    # Check access
    from src.models import Repository
    repo = Repository.query.get(vuln.repository_id)
    if repo.owner_id != user_id:
        if repo.team_id and not AuthorizationService.is_team_member(user_id, repo.team_id):
            return APIResponse.forbidden("Access denied")

    status = data.get('status', 'fixed')
    if status not in ['fixed', 'ignored']:
        return APIResponse.validation_error("Invalid status")

    vuln.status = status
    vuln.resolved_by = user_id
    vuln.resolved_at = datetime.utcnow()

    db.session.commit()

    EventService.log(user_id, 'vulnerability_resolved', {
        'vulnerability_id': vuln_id,
        'status': status
    })

    return APIResponse.success(vuln.to_dict())


# Helper Functions

def _perform_dependency_scan(scan_id: int, repo_id: int):
    """Perform dependency scan (simplified simulation)"""
    scan = DependencyScan.query.get(scan_id)
    if not scan:
        return

    # Simulate scanning different package managers
    # In production, this would parse actual manifest files

    sample_dependencies = [
        {
            'name': 'flask',
            'version': '2.0.1',
            'latest_version': '3.0.0',
            'package_manager': 'pip',
            'license': 'BSD-3-Clause',
            'license_type': 'permissive'
        },
        {
            'name': 'requests',
            'version': '2.28.0',
            'latest_version': '2.31.0',
            'package_manager': 'pip',
            'license': 'Apache-2.0',
            'license_type': 'permissive'
        },
        {
            'name': 'sqlalchemy',
            'version': '1.4.0',
            'latest_version': '2.0.0',
            'package_manager': 'pip',
            'license': 'MIT',
            'license_type': 'permissive'
        }
    ]

    # Clear old dependencies
    Dependency.query.filter_by(repository_id=repo_id).delete()

    # Add new dependencies
    by_pm = {}
    for dep_data in sample_dependencies:
        dep = Dependency(
            repository_id=repo_id,
            name=dep_data['name'],
            version=dep_data['version'],
            latest_version=dep_data['latest_version'],
            package_manager=dep_data['package_manager'],
            license=dep_data['license'],
            license_type=dep_data['license_type'],
            dependency_type='runtime',
            is_direct=True,
            source_file='requirements.txt'
        )
        db.session.add(dep)

        pm = dep_data['package_manager']
        by_pm[pm] = by_pm.get(pm, 0) + 1

    # Add sample vulnerability
    # Clear old vulnerabilities
    Vulnerability.query.filter_by(repository_id=repo_id).delete()

    vuln = Vulnerability(
        dependency_id=None,  # Would link to actual dependency
        repository_id=repo_id,
        cve_id='CVE-2023-1234',
        title='Example vulnerability in requests',
        description='A sample vulnerability for demonstration',
        severity='medium',
        cvss_score=5.5,
        affected_versions='<2.31.0',
        patched_version='2.31.0',
        published_at=datetime.utcnow() - timedelta(days=30)
    )
    db.session.add(vuln)

    # Update scan results
    scan.status = 'completed'
    scan.completed_at = datetime.utcnow()
    scan.total_dependencies = len(sample_dependencies)
    scan.direct_dependencies = len(sample_dependencies)
    scan.vulnerabilities_found = 1
    scan.updates_available = len([d for d in sample_dependencies if d['version'] != d['latest_version']])
    scan.by_severity = {'medium': 1}
    scan.by_package_manager = by_pm

    db.session.commit()


def _classify_update(current: str, latest: str) -> str:
    """Classify update as major, minor, or patch"""
    try:
        current_parts = [int(p) for p in current.split('.')[:3]]
        latest_parts = [int(p) for p in latest.split('.')[:3]]

        # Pad lists
        while len(current_parts) < 3:
            current_parts.append(0)
        while len(latest_parts) < 3:
            latest_parts.append(0)

        if latest_parts[0] > current_parts[0]:
            return 'major'
        elif latest_parts[1] > current_parts[1]:
            return 'minor'
        else:
            return 'patch'
    except (ValueError, IndexError):
        return 'patch'


def _get_health_recommendations(score: float, vulnerabilities: List, outdated: List) -> List[str]:
    """Get health improvement recommendations"""
    recommendations = []

    # Critical vulnerabilities first
    critical_vulns = [v for v in vulnerabilities if v.severity == 'critical']
    if critical_vulns:
        recommendations.append(f"Fix {len(critical_vulns)} critical vulnerabilities immediately")

    # High vulnerabilities
    high_vulns = [v for v in vulnerabilities if v.severity == 'high']
    if high_vulns:
        recommendations.append(f"Address {len(high_vulns)} high-severity vulnerabilities")

    # Outdated dependencies
    if len(outdated) > 10:
        recommendations.append(f"Update {len(outdated)} outdated dependencies")
    elif len(outdated) > 0:
        recommendations.append("Keep dependencies up to date")

    # General recommendations
    if score < 60:
        recommendations.append("Consider running dependency scans more frequently")

    if not recommendations:
        recommendations.append("Dependencies are in good health")

    return recommendations
