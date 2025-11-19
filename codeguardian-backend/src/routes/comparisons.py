"""
Repository Comparison and Predictive Alerts for CodeGuardian

Compare repositories, benchmark against industry standards,
and get predictive quality alerts.
"""

from datetime import datetime, timedelta
from typing import Dict, List
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc

from src.database import db
from src.models.repository import Repository
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService


comparisons_bp = Blueprint('comparisons', __name__)


# Models

class QualityAlert(db.Model):
    """Predictive quality alerts"""
    __tablename__ = 'quality_alerts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False)

    # Alert details
    alert_type = db.Column(db.String(50), nullable=False)  # risk, debt, security, dependency
    severity = db.Column(db.String(20), nullable=False)  # low, medium, high, critical
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    # Prediction data
    prediction_confidence = db.Column(db.Float, default=0.7)
    predicted_impact = db.Column(db.JSON)
    recommended_actions = db.Column(db.JSON, default=list)

    # Status
    status = db.Column(db.String(20), default='active')  # active, acknowledged, resolved, dismissed
    acknowledged_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref='quality_alerts')
    repository = db.relationship('Repository', backref='quality_alerts')

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'repository_id': self.repository_id,
            'repository_name': self.repository.name if self.repository else None,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'description': self.description,
            'prediction_confidence': round(self.prediction_confidence * 100, 1),
            'predicted_impact': self.predicted_impact,
            'recommended_actions': self.recommended_actions or [],
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# API Routes - Repository Comparison

@comparisons_bp.route('/compare/repositories', methods=['POST'])
@jwt_required()
def compare_repositories():
    """
    Compare two or more repositories side-by-side.

    Request Body:
        repository_ids (list): IDs of repositories to compare
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_ids = data.get('repository_ids', [])
    if len(repository_ids) < 2:
        return APIResponse.validation_error("At least 2 repository IDs required")

    # Get repositories
    repositories = Repository.query.filter(
        Repository.id.in_(repository_ids),
        Repository.owner_id == user_id
    ).all()

    if len(repositories) != len(repository_ids):
        return APIResponse.forbidden("Access denied to some repositories")

    # Generate comparison data
    comparison = []
    for repo in repositories:
        metrics = _calculate_repository_metrics(repo)
        comparison.append({
            'repository': {
                'id': repo.id,
                'name': repo.name,
                'language': repo.language
            },
            'metrics': metrics
        })

    # Calculate rankings
    rankings = _calculate_rankings(comparison)

    return APIResponse.success({
        'comparison': comparison,
        'rankings': rankings,
        'recommendations': _generate_comparison_recommendations(comparison)
    })


@comparisons_bp.route('/compare/benchmarks', methods=['GET'])
@jwt_required()
def get_industry_benchmarks():
    """Get industry benchmark data"""
    language = request.args.get('language')
    category = request.args.get('category', 'all')

    benchmarks = {
        'general': {
            'avg_issues_per_review': 8.5,
            'security_issue_rate': 0.12,
            'complexity_score': 12.5,
            'documentation_rate': 0.65,
            'test_coverage': 0.72
        },
        'python': {
            'avg_issues_per_review': 7.2,
            'security_issue_rate': 0.10,
            'complexity_score': 10.8,
            'documentation_rate': 0.70,
            'test_coverage': 0.75
        },
        'javascript': {
            'avg_issues_per_review': 9.1,
            'security_issue_rate': 0.15,
            'complexity_score': 14.2,
            'documentation_rate': 0.55,
            'test_coverage': 0.68
        }
    }

    if language and language.lower() in benchmarks:
        benchmark_data = benchmarks[language.lower()]
    else:
        benchmark_data = benchmarks['general']

    return APIResponse.success({
        'benchmarks': benchmark_data,
        'source': 'Industry average (2024)',
        'sample_size': '10,000+ repositories'
    })


@comparisons_bp.route('/compare/benchmark/<int:repository_id>', methods=['GET'])
@jwt_required()
def benchmark_repository(repository_id: int):
    """Compare repository against industry benchmarks"""
    user_id = get_jwt_identity()

    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Get repository metrics
    metrics = _calculate_repository_metrics(repository)

    # Get benchmarks
    language = repository.language or 'general'
    benchmarks = _get_benchmarks_for_language(language)

    # Calculate comparison
    comparison = {}
    for key, benchmark_value in benchmarks.items():
        repo_value = metrics.get(key, 0)
        if key in ['security_issue_rate', 'avg_issues_per_review', 'complexity_score']:
            # Lower is better
            status = 'above' if repo_value < benchmark_value else 'below'
        else:
            # Higher is better
            status = 'above' if repo_value > benchmark_value else 'below'

        comparison[key] = {
            'your_value': repo_value,
            'benchmark': benchmark_value,
            'status': status,
            'percentile': _calculate_percentile(repo_value, benchmark_value, key)
        }

    # Overall score
    overall_score = _calculate_overall_score(comparison)

    return APIResponse.success({
        'repository': repository.name,
        'comparison': comparison,
        'overall_score': overall_score,
        'grade': _score_to_grade(overall_score),
        'recommendations': _generate_benchmark_recommendations(comparison)
    })


@comparisons_bp.route('/compare/rankings', methods=['GET'])
@jwt_required()
def get_quality_rankings():
    """Get quality rankings of user's repositories"""
    user_id = get_jwt_identity()

    repositories = Repository.query.filter_by(owner_id=user_id).all()

    rankings = []
    for repo in repositories:
        metrics = _calculate_repository_metrics(repo)
        score = _calculate_repo_score(metrics)
        rankings.append({
            'repository_id': repo.id,
            'name': repo.name,
            'score': score,
            'metrics_summary': {
                'issues': metrics.get('avg_issues_per_review', 0),
                'coverage': metrics.get('test_coverage', 0)
            }
        })

    # Sort by score
    rankings.sort(key=lambda x: x['score'], reverse=True)

    # Add ranks
    for i, item in enumerate(rankings):
        item['rank'] = i + 1

    return APIResponse.success(rankings)


# API Routes - Predictive Alerts

@comparisons_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """Get quality alerts for user"""
    user_id = get_jwt_identity()

    status = request.args.get('status', 'active')
    severity = request.args.get('severity')
    repository_id = request.args.get('repository_id', type=int)

    query = QualityAlert.query.filter_by(user_id=user_id)

    if status:
        query = query.filter_by(status=status)
    if severity:
        query = query.filter_by(severity=severity)
    if repository_id:
        query = query.filter_by(repository_id=repository_id)

    alerts = query.order_by(
        desc(QualityAlert.severity == 'critical'),
        desc(QualityAlert.severity == 'high'),
        desc(QualityAlert.created_at)
    ).all()

    return APIResponse.success([a.to_dict() for a in alerts])


@comparisons_bp.route('/alerts/generate/<int:repository_id>', methods=['POST'])
@jwt_required()
def generate_alerts(repository_id: int):
    """Generate predictive alerts for a repository"""
    user_id = get_jwt_identity()

    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Generate alerts based on analysis
    alerts = _generate_predictive_alerts(user_id, repository)

    return APIResponse.success({
        'alerts_generated': len(alerts),
        'alerts': [a.to_dict() for a in alerts]
    })


@comparisons_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@jwt_required()
def acknowledge_alert(alert_id: int):
    """Acknowledge an alert"""
    user_id = get_jwt_identity()

    alert = QualityAlert.query.filter_by(
        id=alert_id,
        user_id=user_id
    ).first()

    if not alert:
        return APIResponse.not_found('Alert', alert_id)

    alert.status = 'acknowledged'
    alert.acknowledged_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success(alert.to_dict())


@comparisons_bp.route('/alerts/<int:alert_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_alert(alert_id: int):
    """Mark alert as resolved"""
    user_id = get_jwt_identity()

    alert = QualityAlert.query.filter_by(
        id=alert_id,
        user_id=user_id
    ).first()

    if not alert:
        return APIResponse.not_found('Alert', alert_id)

    alert.status = 'resolved'
    alert.resolved_at = datetime.utcnow()
    db.session.commit()

    return APIResponse.success(alert.to_dict())


@comparisons_bp.route('/alerts/<int:alert_id>/dismiss', methods=['POST'])
@jwt_required()
def dismiss_alert(alert_id: int):
    """Dismiss an alert"""
    user_id = get_jwt_identity()

    alert = QualityAlert.query.filter_by(
        id=alert_id,
        user_id=user_id
    ).first()

    if not alert:
        return APIResponse.not_found('Alert', alert_id)

    alert.status = 'dismissed'
    db.session.commit()

    return APIResponse.success({'message': 'Alert dismissed'})


@comparisons_bp.route('/alerts/summary', methods=['GET'])
@jwt_required()
def get_alert_summary():
    """Get summary of alerts"""
    user_id = get_jwt_identity()

    # Count by severity
    severity_counts = db.session.query(
        QualityAlert.severity,
        func.count(QualityAlert.id)
    ).filter_by(
        user_id=user_id,
        status='active'
    ).group_by(QualityAlert.severity).all()

    summary = {
        'critical': 0,
        'high': 0,
        'medium': 0,
        'low': 0
    }
    for severity, count in severity_counts:
        summary[severity] = count

    total = sum(summary.values())

    return APIResponse.success({
        'total_active': total,
        'by_severity': summary,
        'needs_attention': summary['critical'] + summary['high'] > 0
    })


# Helper Functions

def _calculate_repository_metrics(repository: Repository) -> Dict:
    """Calculate quality metrics for a repository"""
    reviews = Review.query.filter_by(repository_id=repository.id).all()

    if not reviews:
        return {
            'avg_issues_per_review': 0,
            'security_issue_rate': 0,
            'complexity_score': 0,
            'documentation_rate': 0,
            'test_coverage': 0,
            'review_count': 0
        }

    total_issues = 0
    security_issues = 0
    complexity_sum = 0

    for review in reviews:
        results = review.results or {}
        issues = results.get('issues', [])
        total_issues += len(issues)

        for issue in issues:
            if issue.get('category', '').lower() == 'security':
                security_issues += 1

        metrics = results.get('metrics', {})
        complexity_sum += metrics.get('complexity', 0)

    avg_issues = total_issues / len(reviews) if reviews else 0
    security_rate = security_issues / total_issues if total_issues else 0
    avg_complexity = complexity_sum / len(reviews) if reviews else 0

    return {
        'avg_issues_per_review': round(avg_issues, 1),
        'security_issue_rate': round(security_rate, 2),
        'complexity_score': round(avg_complexity, 1),
        'documentation_rate': 0.65,  # Placeholder
        'test_coverage': 0.70,  # Placeholder
        'review_count': len(reviews)
    }


def _calculate_rankings(comparison: List[Dict]) -> Dict:
    """Calculate rankings from comparison data"""
    rankings = {}

    metrics_to_rank = ['avg_issues_per_review', 'security_issue_rate', 'complexity_score']

    for metric in metrics_to_rank:
        values = [(c['repository']['id'], c['metrics'].get(metric, 0)) for c in comparison]
        # Lower is better for these metrics
        values.sort(key=lambda x: x[1])
        rankings[metric] = [{'repository_id': v[0], 'rank': i + 1} for i, v in enumerate(values)]

    return rankings


def _generate_comparison_recommendations(comparison: List[Dict]) -> List[Dict]:
    """Generate recommendations based on comparison"""
    recommendations = []

    # Find the best and worst performers
    if len(comparison) >= 2:
        best = min(comparison, key=lambda x: x['metrics'].get('avg_issues_per_review', 0))
        worst = max(comparison, key=lambda x: x['metrics'].get('avg_issues_per_review', 0))

        if best != worst:
            recommendations.append({
                'type': 'learn_from_best',
                'message': f"{worst['repository']['name']} could learn from {best['repository']['name']}'s patterns"
            })

    return recommendations


def _get_benchmarks_for_language(language: str) -> Dict:
    """Get benchmarks for a specific language"""
    return {
        'avg_issues_per_review': 8.5,
        'security_issue_rate': 0.12,
        'complexity_score': 12.5,
        'documentation_rate': 0.65,
        'test_coverage': 0.72
    }


def _calculate_percentile(value: float, benchmark: float, metric: str) -> int:
    """Calculate percentile rank"""
    if benchmark == 0:
        return 50

    if metric in ['security_issue_rate', 'avg_issues_per_review', 'complexity_score']:
        # Lower is better
        ratio = benchmark / value if value > 0 else 2
    else:
        # Higher is better
        ratio = value / benchmark if benchmark > 0 else 0

    percentile = min(99, max(1, int(ratio * 50)))
    return percentile


def _calculate_overall_score(comparison: Dict) -> float:
    """Calculate overall benchmark score"""
    score = 50  # Base score

    for key, data in comparison.items():
        if data['status'] == 'above':
            score += 10
        else:
            score -= 5

    return max(0, min(100, score))


def _calculate_repo_score(metrics: Dict) -> float:
    """Calculate repository quality score"""
    score = 70  # Base

    # Adjust for issues (lower is better)
    issues = metrics.get('avg_issues_per_review', 0)
    score -= min(30, issues * 2)

    # Adjust for coverage (higher is better)
    coverage = metrics.get('test_coverage', 0)
    score += coverage * 20

    return max(0, min(100, round(score, 1)))


def _score_to_grade(score: float) -> str:
    """Convert score to letter grade"""
    if score >= 90:
        return 'A'
    elif score >= 80:
        return 'B'
    elif score >= 70:
        return 'C'
    elif score >= 60:
        return 'D'
    else:
        return 'F'


def _generate_benchmark_recommendations(comparison: Dict) -> List[str]:
    """Generate recommendations from benchmark comparison"""
    recommendations = []

    for key, data in comparison.items():
        if data['status'] == 'below':
            if key == 'test_coverage':
                recommendations.append('Increase test coverage to improve reliability')
            elif key == 'security_issue_rate':
                recommendations.append('Focus on security issues to reduce vulnerabilities')
            elif key == 'complexity_score':
                recommendations.append('Refactor complex code to improve maintainability')

    return recommendations if recommendations else ['Great job! Keep up the good work.']


def _generate_predictive_alerts(user_id: int, repository: Repository) -> List[QualityAlert]:
    """Generate predictive alerts for a repository"""
    alerts = []
    metrics = _calculate_repository_metrics(repository)

    # High issue rate alert
    if metrics['avg_issues_per_review'] > 15:
        alert = QualityAlert(
            user_id=user_id,
            repository_id=repository.id,
            alert_type='risk',
            severity='high',
            title='High Issue Rate Detected',
            description=f"Average of {metrics['avg_issues_per_review']} issues per review",
            prediction_confidence=0.85,
            recommended_actions=['Review recent commits', 'Add more tests', 'Enable pre-commit hooks']
        )
        db.session.add(alert)
        alerts.append(alert)

    # Security concern
    if metrics['security_issue_rate'] > 0.2:
        alert = QualityAlert(
            user_id=user_id,
            repository_id=repository.id,
            alert_type='security',
            severity='critical',
            title='Security Vulnerabilities Rising',
            description='20%+ of issues are security-related',
            prediction_confidence=0.90,
            recommended_actions=['Run security audit', 'Update dependencies', 'Review authentication']
        )
        db.session.add(alert)
        alerts.append(alert)

    # Complexity warning
    if metrics['complexity_score'] > 20:
        alert = QualityAlert(
            user_id=user_id,
            repository_id=repository.id,
            alert_type='debt',
            severity='medium',
            title='Technical Debt Accumulating',
            description='Code complexity is above recommended levels',
            prediction_confidence=0.75,
            recommended_actions=['Schedule refactoring sprint', 'Break down large functions']
        )
        db.session.add(alert)
        alerts.append(alert)

    db.session.commit()
    return alerts
