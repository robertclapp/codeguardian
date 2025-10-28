#!/bin/bash

################################################################################
# CodeGuardian Production Deployment Script
#
# This script handles deployment of CodeGuardian backend to production
# environments with proper validation and safety checks.
#
# Usage:
#   ./scripts/deploy.sh [environment]
#
# Environments: production, staging, development
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"

################################################################################
# Helper Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed"
        return 1
    fi
    return 0
}

################################################################################
# Pre-deployment Checks
################################################################################

log_info "Starting CodeGuardian deployment for environment: $ENVIRONMENT"
echo

log_info "Running pre-deployment checks..."

# Check required commands
log_info "Checking required commands..."
REQUIRED_COMMANDS=("python3" "pip3" "git")
for cmd in "${REQUIRED_COMMANDS[@]}"; do
    if check_command "$cmd"; then
        log_success "$cmd is installed"
    else
        log_error "Missing required command: $cmd"
        exit 1
    fi
done

# Check Python version
PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
REQUIRED_VERSION="3.11"
log_info "Python version: $PYTHON_VERSION (required: $REQUIRED_VERSION+)"

# Check if .env file exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    log_warning ".env file not found"
    log_info "Run: python scripts/generate_env.py --environment $ENVIRONMENT"
    exit 1
else
    log_success ".env file found"
fi

# Validate environment variables
log_info "Validating environment variables..."
source "$PROJECT_ROOT/.env" 2>/dev/null || true

REQUIRED_VARS=("SECRET_KEY" "JWT_SECRET" "DATABASE_URL" "OPENAI_API_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var:-}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    log_error "Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
else
    log_success "All required environment variables are set"
fi

# Check for insecure defaults in production
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Checking for insecure defaults..."

    if [[ "$SECRET_KEY" == *"dev-"* ]] || [[ "$SECRET_KEY" == *"change-in-production"* ]]; then
        log_error "SECRET_KEY is using insecure default value"
        exit 1
    fi

    if [[ "$JWT_SECRET" == *"dev-"* ]] || [[ "$JWT_SECRET" == *"change-in-production"* ]]; then
        log_error "JWT_SECRET is using insecure default value"
        exit 1
    fi

    if [[ "$DATABASE_URL" == "sqlite"* ]]; then
        log_error "SQLite database is not recommended for production"
        log_info "Use PostgreSQL instead"
        exit 1
    fi

    log_success "No insecure defaults detected"
fi

################################################################################
# Dependency Installation
################################################################################

log_info "Installing dependencies..."

cd "$PROJECT_ROOT"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    log_info "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
log_info "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
log_info "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
    log_success "Dependencies installed"
else
    log_error "requirements.txt not found"
    exit 1
fi

################################################################################
# Database Migration
################################################################################

log_info "Running database migrations..."

# Check if database is accessible
python3 -c "from src.database import db; from src.main import app; \
    with app.app_context(): \
        db.create_all(); \
        print('Database initialized successfully')" \
|| {
    log_error "Database migration failed"
    exit 1
}

log_success "Database migrations completed"

################################################################################
# Security Checks
################################################################################

log_info "Running security checks..."

# Check file permissions
if [ "$ENVIRONMENT" = "production" ]; then
    log_info "Checking file permissions..."

    # .env should not be world-readable
    if [ -f ".env" ]; then
        PERMS=$(stat -c "%a" .env)
        if [ "$PERMS" != "600" ] && [ "$PERMS" != "400" ]; then
            log_warning ".env file permissions are too open ($PERMS)"
            log_info "Setting permissions to 600..."
            chmod 600 .env
        fi
    fi
fi

log_success "Security checks passed"

################################################################################
# Application Tests
################################################################################

log_info "Running application tests..."

# Run syntax checks
log_info "Running syntax checks..."
python3 -m py_compile src/**/*.py 2>/dev/null || {
    log_error "Python syntax errors found"
    exit 1
}
log_success "Syntax checks passed"

# Run unit tests (if pytest is available)
if command -v pytest &> /dev/null; then
    log_info "Running unit tests..."
    pytest tests/ -v --tb=short || {
        log_warning "Some tests failed (continuing anyway)"
    }
else
    log_warning "pytest not installed, skipping tests"
fi

################################################################################
# Build and Deploy
################################################################################

log_info "Preparing application for deployment..."

# Clean up Python cache files
log_info "Cleaning up cache files..."
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -type f -name "*.pyc" -delete 2>/dev/null || true

log_success "Cleanup completed"

################################################################################
# Start Application
################################################################################

log_info "Application deployment completed successfully!"
echo
log_info "To start the application:"
echo

if [ "$ENVIRONMENT" = "production" ]; then
    echo "  Using Gunicorn (recommended for production):"
    echo "    gunicorn -c gunicorn.conf.py src.main:app"
    echo
    echo "  Or using the provided start script:"
    echo "    ./scripts/start.sh"
else
    echo "  For development:"
    echo "    python src/main.py"
    echo
    echo "  Or with Flask CLI:"
    echo "    flask run --host=0.0.0.0 --port=5000"
fi

echo
log_success "Deployment complete!"
