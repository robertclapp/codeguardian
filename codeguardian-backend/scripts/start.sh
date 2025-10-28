#!/bin/bash

################################################################################
# CodeGuardian Production Start Script
#
# This script starts the CodeGuardian backend with Gunicorn in production mode
################################################################################

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Starting CodeGuardian Backend...${NC}"

cd "$PROJECT_ROOT"

# Load environment variables
if [ -f ".env" ]; then
    source .env
    echo -e "${GREEN}✓ Environment variables loaded${NC}"
else
    echo "WARNING: .env file not found"
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo -e "${GREEN}✓ Virtual environment activated${NC}"
fi

# Start with Gunicorn
if command -v gunicorn &> /dev/null; then
    echo -e "${GREEN}✓ Starting with Gunicorn${NC}"

    # Check if gunicorn.conf.py exists
    if [ -f "gunicorn.conf.py" ]; then
        exec gunicorn -c gunicorn.conf.py src.main:app
    else
        # Use default configuration
        exec gunicorn \
            --bind 0.0.0.0:${PORT:-5000} \
            --workers ${WORKER_PROCESSES:-4} \
            --worker-class sync \
            --threads 2 \
            --timeout 60 \
            --graceful-timeout 30 \
            --keep-alive 5 \
            --max-requests ${MAX_REQUESTS:-1000} \
            --max-requests-jitter 50 \
            --access-logfile - \
            --error-logfile - \
            --log-level ${LOG_LEVEL:-info} \
            src.main:app
    fi
else
    echo "WARNING: Gunicorn not installed, falling back to Flask development server"
    echo "Install Gunicorn with: pip install gunicorn"
    echo
    exec python src/main.py
fi
