"""
Code Evolution Predictor routes for CodeGuardian

Predicts impact of code changes, technical debt forecasting,
maintenance costs, and breaking change detection.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from src.database import db
from src.models.repository import Repository
from src.models.review import Review
from src.responses import APIResponse
from src.services import EventService
from src.exceptions import NotFoundError, ValidationError


predictor_bp = Blueprint('predictor', __name__)


# Prediction Models

class PredictionRecord(db.Model):
    """Store prediction history for tracking accuracy"""
    __tablename__ = 'prediction_records'

    id = db.Column(db.Integer, primary_key=True)
    repository_id = db.Column(db.Integer, db.ForeignKey('repositories.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Prediction type
    prediction_type = db.Column(db.String(50), nullable=False)

    # Prediction data
    input_data = db.Column(db.JSON, nullable=False)
    prediction_result = db.Column(db.JSON, nullable=False)
    confidence = db.Column(db.Float, default=0)

    # Actual outcome (for accuracy tracking)
    actual_outcome = db.Column(db.JSON)
    accuracy_score = db.Column(db.Float)

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    verified_at = db.Column(db.DateTime)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'repository_id': self.repository_id,
            'prediction_type': self.prediction_type,
            'prediction_result': self.prediction_result,
            'confidence': round(self.confidence * 100, 1),
            'actual_outcome': self.actual_outcome,
            'accuracy_score': round(self.accuracy_score * 100, 1) if self.accuracy_score else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# API Routes

@predictor_bp.route('/predict/impact', methods=['POST'])
@jwt_required()
def predict_impact():
    """
    Predict impact of code changes

    Analyzes proposed changes and predicts:
    - Affected files and functions
    - Risk level
    - Testing requirements
    - Potential issues
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    repository_id = data.get('repository_id')
    code_changes = data.get('changes', [])
    change_type = data.get('change_type', 'modification')

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify repository access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Perform impact prediction
    prediction = _predict_change_impact(repository, code_changes, change_type)

    # Store prediction record
    record = PredictionRecord(
        repository_id=repository_id,
        user_id=user_id,
        prediction_type='impact',
        input_data={'changes': code_changes, 'change_type': change_type},
        prediction_result=prediction,
        confidence=prediction.get('confidence', 0.7)
    )
    db.session.add(record)
    db.session.commit()

    # Log audit
    EventService.log_audit(
        action='predict_impact',
        resource_type='repository',
        resource_id=str(repository_id),
        user_id=user_id
    )

    return APIResponse.success({
        'prediction_id': record.id,
        'prediction': prediction
    })


@predictor_bp.route('/predict/debt', methods=['POST'])
@jwt_required()
def forecast_technical_debt():
    """
    Forecast technical debt

    Predicts technical debt accumulation over time
    based on current code patterns and trends.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    repository_id = data.get('repository_id')
    forecast_days = min(int(data.get('forecast_days', 90)), 365)

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Get historical reviews
    reviews = Review.query.filter_by(
        repository_id=repository_id
    ).order_by(Review.created_at.desc()).limit(50).all()

    # Calculate debt forecast
    forecast = _forecast_debt(repository, reviews, forecast_days)

    # Store prediction
    record = PredictionRecord(
        repository_id=repository_id,
        user_id=user_id,
        prediction_type='debt',
        input_data={'forecast_days': forecast_days},
        prediction_result=forecast,
        confidence=forecast.get('confidence', 0.6)
    )
    db.session.add(record)
    db.session.commit()

    return APIResponse.success({
        'prediction_id': record.id,
        'forecast': forecast
    })


@predictor_bp.route('/predict/maintenance', methods=['GET'])
@jwt_required()
def estimate_maintenance():
    """
    Estimate maintenance costs

    Provides estimates for maintaining the codebase
    based on complexity, size, and historical data.
    """
    user_id = get_jwt_identity()
    repository_id = request.args.get('repository_id', type=int)

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Get reviews for analysis
    reviews = Review.query.filter_by(
        repository_id=repository_id
    ).order_by(Review.created_at.desc()).limit(100).all()

    # Calculate maintenance estimates
    estimates = _estimate_maintenance(repository, reviews)

    return APIResponse.success(estimates)


@predictor_bp.route('/predict/breaking-changes', methods=['POST'])
@jwt_required()
def detect_breaking_changes():
    """
    Detect potential breaking changes

    Analyzes code changes to identify potential breaking
    changes in APIs, interfaces, or dependencies.
    """
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return APIResponse.validation_error("Request data is required")

    repository_id = data.get('repository_id')
    code = data.get('code', '')
    file_path = data.get('file_path', '')
    previous_code = data.get('previous_code', '')

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Detect breaking changes
    analysis = _detect_breaking_changes(code, previous_code, file_path)

    # Store prediction
    record = PredictionRecord(
        repository_id=repository_id,
        user_id=user_id,
        prediction_type='breaking_changes',
        input_data={'file_path': file_path},
        prediction_result=analysis,
        confidence=analysis.get('confidence', 0.8)
    )
    db.session.add(record)
    db.session.commit()

    return APIResponse.success({
        'prediction_id': record.id,
        'analysis': analysis
    })


@predictor_bp.route('/predict/architecture', methods=['GET'])
@jwt_required()
def architecture_recommendations():
    """
    Get architecture evolution recommendations

    Suggests architectural improvements based on
    codebase patterns and best practices.
    """
    user_id = get_jwt_identity()
    repository_id = request.args.get('repository_id', type=int)

    if not repository_id:
        return APIResponse.validation_error("repository_id is required")

    # Verify access
    repository = Repository.query.filter_by(
        id=repository_id,
        owner_id=user_id
    ).first()

    if not repository:
        return APIResponse.not_found('Repository', repository_id)

    # Get reviews for analysis
    reviews = Review.query.filter_by(
        repository_id=repository_id
    ).order_by(Review.created_at.desc()).limit(50).all()

    # Generate recommendations
    recommendations = _generate_architecture_recommendations(repository, reviews)

    return APIResponse.success(recommendations)


@predictor_bp.route('/predict/history', methods=['GET'])
@jwt_required()
def get_prediction_history():
    """Get prediction history for tracking"""
    user_id = get_jwt_identity()
    repository_id = request.args.get('repository_id', type=int)
    prediction_type = request.args.get('type')
    limit = min(int(request.args.get('limit', 20)), 100)

    query = PredictionRecord.query.filter_by(user_id=user_id)

    if repository_id:
        query = query.filter_by(repository_id=repository_id)
    if prediction_type:
        query = query.filter_by(prediction_type=prediction_type)

    predictions = query.order_by(
        PredictionRecord.created_at.desc()
    ).limit(limit).all()

    return APIResponse.success([p.to_dict() for p in predictions])


# Helper Functions

def _predict_change_impact(repository: Repository, changes: List[Dict], change_type: str) -> Dict:
    """Predict impact of code changes"""

    # Analyze change scope
    files_affected = set()
    functions_affected = []
    risk_factors = []

    for change in changes:
        file_path = change.get('file_path', '')
        files_affected.add(file_path)

        # Detect function changes
        if 'function' in change:
            functions_affected.append(change['function'])

        # Detect high-risk patterns
        code = change.get('code', '')

        if 'def __init__' in code or 'constructor' in code:
            risk_factors.append({
                'type': 'constructor_change',
                'severity': 'high',
                'message': 'Constructor changes may break existing instantiations'
            })

        if 'async' in code or 'await' in code:
            risk_factors.append({
                'type': 'async_change',
                'severity': 'medium',
                'message': 'Async changes require careful handling of promises'
            })

        if 'import' in code or 'require' in code:
            risk_factors.append({
                'type': 'dependency_change',
                'severity': 'medium',
                'message': 'Dependency changes may affect bundle size or compatibility'
            })

    # Calculate risk level
    risk_level = 'low'
    risk_score = len(risk_factors) * 10 + len(files_affected) * 5

    if risk_score >= 50:
        risk_level = 'high'
    elif risk_score >= 25:
        risk_level = 'medium'

    # Generate testing recommendations
    testing_recommendations = []

    if risk_level in ['high', 'medium']:
        testing_recommendations.append({
            'type': 'unit_tests',
            'priority': 'high',
            'description': 'Write unit tests for all modified functions'
        })
        testing_recommendations.append({
            'type': 'integration_tests',
            'priority': 'medium',
            'description': 'Test integration points with dependent modules'
        })

    if any(f['type'] == 'constructor_change' for f in risk_factors):
        testing_recommendations.append({
            'type': 'regression_tests',
            'priority': 'high',
            'description': 'Run regression tests for all dependent classes'
        })

    return {
        'summary': {
            'files_affected': len(files_affected),
            'functions_affected': len(functions_affected),
            'risk_level': risk_level,
            'risk_score': risk_score
        },
        'affected_areas': {
            'files': list(files_affected),
            'functions': functions_affected
        },
        'risk_factors': risk_factors,
        'testing_recommendations': testing_recommendations,
        'estimated_review_time': f"{max(5, len(files_affected) * 10)} minutes",
        'confidence': 0.75
    }


def _forecast_debt(repository: Repository, reviews: List[Review], days: int) -> Dict:
    """Forecast technical debt accumulation"""

    # Analyze historical trends
    debt_metrics = []
    issue_trends = {'security': [], 'complexity': [], 'style': [], 'performance': []}

    for review in reviews:
        results = review.results or {}
        issues = results.get('issues', [])

        # Count issues by category
        for issue in issues:
            category = issue.get('category', 'general')
            if category in issue_trends:
                issue_trends[category].append(1)

        # Track overall debt
        debt_metrics.append(len(issues))

    # Calculate current debt
    current_debt = sum(debt_metrics) / len(debt_metrics) if debt_metrics else 0

    # Calculate trend (issues per day)
    if len(debt_metrics) >= 2:
        trend = (debt_metrics[0] - debt_metrics[-1]) / max(len(debt_metrics), 1)
    else:
        trend = 0

    # Project future debt
    projections = []
    for day in range(0, days + 1, 30):
        projected_debt = max(0, current_debt + (trend * day))
        projections.append({
            'day': day,
            'projected_debt': round(projected_debt, 1),
            'date': (datetime.utcnow() + timedelta(days=day)).strftime('%Y-%m-%d')
        })

    # Generate recommendations
    recommendations = []

    if trend > 0:
        recommendations.append({
            'priority': 'high',
            'title': 'Address Growing Technical Debt',
            'description': f'Technical debt is increasing at {round(trend, 2)} issues per day.',
            'action': 'Schedule regular debt reduction sprints'
        })

    # Identify highest debt areas
    highest_category = max(issue_trends.items(), key=lambda x: sum(x[1]))
    if sum(highest_category[1]) > 0:
        recommendations.append({
            'priority': 'medium',
            'title': f'Focus on {highest_category[0].title()} Issues',
            'description': f'Most technical debt comes from {highest_category[0]} issues.',
            'action': f'Create targeted fixes for {highest_category[0]} issues'
        })

    return {
        'current_state': {
            'total_debt_score': round(current_debt * 10, 1),
            'trend': 'increasing' if trend > 0 else 'decreasing' if trend < 0 else 'stable',
            'trend_rate': round(trend, 2)
        },
        'projections': projections,
        'categories': {
            category: sum(issues)
            for category, issues in issue_trends.items()
        },
        'recommendations': recommendations,
        'confidence': 0.65
    }


def _estimate_maintenance(repository: Repository, reviews: List[Review]) -> Dict:
    """Estimate maintenance costs"""

    # Calculate complexity metrics
    avg_issues = 0
    total_files = 0
    complexity_sum = 0

    for review in reviews:
        results = review.results or {}
        issues = results.get('issues', [])
        avg_issues += len(issues)

        metrics = results.get('metrics', {})
        complexity_sum += metrics.get('complexity', 0)
        total_files += 1

    avg_issues = avg_issues / len(reviews) if reviews else 0
    avg_complexity = complexity_sum / total_files if total_files else 5

    # Estimate effort (hours per month)
    base_effort = 10  # Base hours per month
    complexity_factor = avg_complexity / 5  # Normalized complexity
    issue_factor = avg_issues / 10  # Normalized issues

    estimated_effort = base_effort * (1 + complexity_factor + issue_factor)

    # Cost estimates (assuming average developer rate)
    hourly_rate = 75  # USD
    monthly_cost = estimated_effort * hourly_rate

    # Risk areas
    risk_areas = []
    if avg_complexity > 10:
        risk_areas.append({
            'area': 'High Complexity',
            'description': 'Code complexity is above recommended levels',
            'impact': 'Increases debugging and modification time'
        })

    if avg_issues > 20:
        risk_areas.append({
            'area': 'High Issue Rate',
            'description': 'Code has high number of quality issues',
            'impact': 'More time spent on fixes and reviews'
        })

    return {
        'estimates': {
            'monthly_effort_hours': round(estimated_effort, 1),
            'monthly_cost_usd': round(monthly_cost, 0),
            'annual_cost_usd': round(monthly_cost * 12, 0)
        },
        'factors': {
            'base_effort': base_effort,
            'complexity_multiplier': round(1 + complexity_factor, 2),
            'issue_multiplier': round(1 + issue_factor, 2)
        },
        'metrics': {
            'average_issues_per_review': round(avg_issues, 1),
            'average_complexity': round(avg_complexity, 1),
            'reviews_analyzed': len(reviews)
        },
        'risk_areas': risk_areas,
        'optimization_potential': {
            'hours_saved_possible': round(estimated_effort * 0.3, 1),
            'cost_saved_possible': round(monthly_cost * 0.3, 0),
            'recommendations': [
                'Reduce complexity through refactoring',
                'Increase test coverage',
                'Address high-priority issues first'
            ]
        }
    }


def _detect_breaking_changes(code: str, previous_code: str, file_path: str) -> Dict:
    """Detect potential breaking changes"""

    breaking_changes = []
    warnings = []

    # Detect function signature changes
    import re

    # Find function definitions in both versions
    new_functions = set(re.findall(r'def\s+(\w+)\s*\(([^)]*)\)', code))
    old_functions = set(re.findall(r'def\s+(\w+)\s*\(([^)]*)\)', previous_code))

    # Check for removed functions
    old_names = {f[0] for f in old_functions}
    new_names = {f[0] for f in new_functions}

    removed = old_names - new_names
    for func_name in removed:
        breaking_changes.append({
            'type': 'removed_function',
            'severity': 'critical',
            'name': func_name,
            'message': f'Function "{func_name}" has been removed'
        })

    # Check for signature changes
    old_sigs = {f[0]: f[1] for f in old_functions}
    new_sigs = {f[0]: f[1] for f in new_functions}

    for func_name in old_names & new_names:
        if old_sigs[func_name] != new_sigs[func_name]:
            breaking_changes.append({
                'type': 'signature_change',
                'severity': 'high',
                'name': func_name,
                'message': f'Function "{func_name}" signature changed',
                'old_signature': old_sigs[func_name],
                'new_signature': new_sigs[func_name]
            })

    # Check for class changes
    new_classes = set(re.findall(r'class\s+(\w+)', code))
    old_classes = set(re.findall(r'class\s+(\w+)', previous_code))

    removed_classes = old_classes - new_classes
    for class_name in removed_classes:
        breaking_changes.append({
            'type': 'removed_class',
            'severity': 'critical',
            'name': class_name,
            'message': f'Class "{class_name}" has been removed'
        })

    # Check for return type changes (Python type hints)
    new_returns = set(re.findall(r'def\s+\w+[^)]+\)\s*->\s*(\w+)', code))
    old_returns = set(re.findall(r'def\s+\w+[^)]+\)\s*->\s*(\w+)', previous_code))

    if old_returns and new_returns != old_returns:
        warnings.append({
            'type': 'return_type_change',
            'severity': 'medium',
            'message': 'Return types have changed'
        })

    # Determine overall risk
    risk_level = 'safe'
    if breaking_changes:
        critical_count = sum(1 for bc in breaking_changes if bc['severity'] == 'critical')
        if critical_count > 0:
            risk_level = 'critical'
        else:
            risk_level = 'high'
    elif warnings:
        risk_level = 'moderate'

    return {
        'breaking_changes': breaking_changes,
        'warnings': warnings,
        'risk_level': risk_level,
        'summary': {
            'total_breaking': len(breaking_changes),
            'total_warnings': len(warnings),
            'functions_removed': len(removed),
            'classes_removed': len(removed_classes)
        },
        'recommendations': _get_breaking_change_recommendations(breaking_changes, warnings),
        'confidence': 0.8
    }


def _get_breaking_change_recommendations(breaking_changes: List, warnings: List) -> List[Dict]:
    """Generate recommendations for handling breaking changes"""
    recommendations = []

    if any(bc['severity'] == 'critical' for bc in breaking_changes):
        recommendations.append({
            'priority': 'critical',
            'title': 'Major Version Bump Required',
            'description': 'Critical breaking changes detected. Bump major version.'
        })
        recommendations.append({
            'priority': 'high',
            'title': 'Update Documentation',
            'description': 'Document all breaking changes in changelog.'
        })

    if any(bc['type'] == 'signature_change' for bc in breaking_changes):
        recommendations.append({
            'priority': 'high',
            'title': 'Update Call Sites',
            'description': 'Update all code that calls the modified functions.'
        })

    if not breaking_changes and warnings:
        recommendations.append({
            'priority': 'medium',
            'title': 'Review Changes',
            'description': 'Changes detected that may affect dependent code.'
        })

    if not recommendations:
        recommendations.append({
            'priority': 'low',
            'title': 'Safe to Deploy',
            'description': 'No breaking changes detected.'
        })

    return recommendations


def _generate_architecture_recommendations(repository: Repository, reviews: List[Review]) -> Dict:
    """Generate architecture evolution recommendations"""

    recommendations = []
    patterns_detected = []

    # Analyze patterns from reviews
    complexity_issues = 0
    coupling_issues = 0

    for review in reviews:
        results = review.results or {}
        issues = results.get('issues', [])

        for issue in issues:
            category = issue.get('category', '').lower()
            if 'complex' in category:
                complexity_issues += 1
            if 'coupling' in category or 'dependency' in category:
                coupling_issues += 1

    # Generate recommendations based on patterns
    if complexity_issues > len(reviews) * 0.3:
        patterns_detected.append('high_complexity')
        recommendations.append({
            'category': 'Structure',
            'title': 'Break Down Complex Components',
            'description': 'High complexity detected. Consider breaking large modules into smaller, focused ones.',
            'priority': 'high',
            'effort': 'medium',
            'impact': 'high'
        })

    if coupling_issues > len(reviews) * 0.2:
        patterns_detected.append('tight_coupling')
        recommendations.append({
            'category': 'Dependencies',
            'title': 'Reduce Coupling',
            'description': 'High coupling between modules. Introduce abstractions and interfaces.',
            'priority': 'high',
            'effort': 'high',
            'impact': 'high'
        })

    # General best practice recommendations
    recommendations.append({
        'category': 'Testing',
        'title': 'Increase Test Coverage',
        'description': 'Aim for 80%+ coverage on critical paths.',
        'priority': 'medium',
        'effort': 'medium',
        'impact': 'high'
    })

    recommendations.append({
        'category': 'Documentation',
        'title': 'Document Architecture Decisions',
        'description': 'Create Architecture Decision Records (ADRs) for major decisions.',
        'priority': 'low',
        'effort': 'low',
        'impact': 'medium'
    })

    return {
        'patterns_detected': patterns_detected,
        'recommendations': recommendations,
        'metrics': {
            'reviews_analyzed': len(reviews),
            'complexity_issues': complexity_issues,
            'coupling_issues': coupling_issues
        },
        'next_steps': [
            'Review high-priority recommendations',
            'Create improvement tasks in backlog',
            'Schedule architecture review session'
        ]
    }
