#!/bin/bash

# CodeGuardian Manus Enhanced - Environment Setup Script
# Automates the setup of environment variables for deployment

set -e  # Exit on any error

echo "🚀 CodeGuardian Manus Enhanced - Environment Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to prompt for input
prompt_input() {
    local var_name=$1
    local description=$2
    local required=${3:-true}
    local default_value=$4
    
    echo -e "${BLUE}$description${NC}"
    if [ "$required" = true ]; then
        echo -e "${RED}(Required)${NC}"
    else
        echo -e "${YELLOW}(Optional)${NC}"
    fi
    
    if [ -n "$default_value" ]; then
        echo -e "Default: ${YELLOW}$default_value${NC}"
        read -p "Enter value (or press Enter for default): " input_value
        if [ -z "$input_value" ]; then
            input_value=$default_value
        fi
    else
        read -p "Enter value: " input_value
    fi
    
    if [ "$required" = true ] && [ -z "$input_value" ]; then
        echo -e "${RED}Error: This field is required!${NC}"
        exit 1
    fi
    
    echo ""
    eval "$var_name='$input_value'"
}

# Function to generate random string
generate_secret() {
    openssl rand -hex 32 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "$(date +%s)_$(whoami)_$(hostname)" | sha256sum | cut -d' ' -f1
}

echo "This script will help you set up environment variables for CodeGuardian deployment."
echo "You can run this multiple times - it will create/update your .env file."
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Found existing .env file.${NC}"
    read -p "Do you want to update it? (y/N): " update_env
    if [[ ! $update_env =~ ^[Yy]$ ]]; then
        echo "Exiting without changes."
        exit 0
    fi
    echo ""
fi

echo "📋 Let's gather the required information..."
echo ""

# Core Configuration
echo -e "${GREEN}=== CORE CONFIGURATION ===${NC}"

prompt_input "OPENAI_API_KEY" "OpenAI API Key (get from platform.openai.com)
Example: sk-proj-abc123..." true

prompt_input "GITHUB_CLIENT_ID" "GitHub OAuth App Client ID
(Create at: GitHub Settings → Developer settings → OAuth Apps)" true

prompt_input "GITHUB_CLIENT_SECRET" "GitHub OAuth App Client Secret" true

# Generate secrets if not provided
SECRET_KEY=$(generate_secret)
JWT_SECRET_KEY=$(generate_secret)

echo -e "${GREEN}Generated secure random keys for SECRET_KEY and JWT_SECRET_KEY${NC}"
echo ""

# Manus Features
echo -e "${GREEN}=== MANUS FEATURES ===${NC}"

prompt_input "ENABLE_MULTI_MODEL" "Enable Multi-Model AI Analysis? (true/false)" false "true"

prompt_input "ENABLE_MCP" "Enable MCP (Model Context Protocol) Integration? (true/false)" false "true"

prompt_input "ENABLE_REAL_TIME" "Enable Real-Time Analysis? (true/false)" false "true"

prompt_input "ENABLE_TEAM_MODE" "Enable Team Collaboration Features? (true/false)" false "true"

prompt_input "ENABLE_DEEP_SECURITY" "Enable Advanced Security Scanning? (true/false)" false "true"

prompt_input "ENABLE_PERFORMANCE_PROFILING" "Enable Performance Profiling? (true/false)" false "true"

# Optional Integrations
echo -e "${GREEN}=== OPTIONAL INTEGRATIONS ===${NC}"

prompt_input "SENTRY_DSN" "Sentry DSN for Error Tracking (optional)
Get from: sentry.io → Create Project" false

prompt_input "NOTION_API_KEY" "Notion Integration Key (optional)
Get from: notion.so/my-integrations" false

prompt_input "VERCEL_TOKEN" "Vercel API Token (optional)
Get from: vercel.com/account/tokens" false

prompt_input "SUPABASE_URL" "Supabase Project URL (optional)
Example: https://abc123.supabase.co" false

prompt_input "SUPABASE_ANON_KEY" "Supabase Anonymous Key (optional)" false

# Deployment Configuration
echo -e "${GREEN}=== DEPLOYMENT CONFIGURATION ===${NC}"

prompt_input "APP_NAME" "Application Name" false "CodeGuardian"

prompt_input "COMPANY_NAME" "Your Company/Organization Name" false "Your Company"

prompt_input "SUPPORT_EMAIL" "Support Email Address" false "support@yourcompany.com"

prompt_input "NOTIFICATION_EMAIL" "Notification Email (for alerts)" false "$SUPPORT_EMAIL"

# Create .env file
echo "📝 Creating .env file..."

cat > .env << EOF
# CodeGuardian Manus Enhanced - Environment Configuration
# Generated on: $(date)

# ===== CORE CONFIGURATION =====
FLASK_ENV=production
FLASK_APP=src.main_render:app

# AI Models Configuration
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_API_BASE=https://api.openai.com/v1

# Authentication
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
JWT_EXPIRATION_HOURS=24

# ===== MANUS FEATURES =====
MANUS_VERSION=2.0
ENABLE_MULTI_MODEL=$ENABLE_MULTI_MODEL
ENABLE_MCP=$ENABLE_MCP
ENABLE_REAL_TIME=$ENABLE_REAL_TIME
ENABLE_TEAM_MODE=$ENABLE_TEAM_MODE
ENABLE_DEEP_SECURITY=$ENABLE_DEEP_SECURITY
ENABLE_PERFORMANCE_PROFILING=$ENABLE_PERFORMANCE_PROFILING

# Multi-Model Configuration
SUPPORTED_MODELS=gpt-4.1-mini,gpt-4.1-nano,gemini-2.5-flash
DEFAULT_MODEL=gpt-4.1-mini
ENABLE_MULTI_MODEL_ANALYSIS=true
MAX_CODE_LENGTH=50000
ANALYSIS_TIMEOUT=120

# MCP Configuration
MCP_SERVERS=prisma-postgres,supabase,notion,vercel
MCP_TIMEOUT=30
ENABLE_MCP_CACHING=true

# Real-time Configuration
WEBSOCKET_PORT=8080
REAL_TIME_DEBOUNCE=500
ENABLE_WEBSOCKET_COMPRESSION=true

# ===== SECURITY CONFIGURATION =====
ENABLE_RATE_LIMITING=true
RATE_LIMIT_PER_MINUTE=100
ENABLE_CORS=true
CORS_ORIGINS=*
ENABLE_HTTPS_ONLY=true

# ===== OPTIONAL INTEGRATIONS =====
EOF

# Add optional integrations if provided
if [ -n "$SENTRY_DSN" ]; then
    echo "SENTRY_DSN=$SENTRY_DSN" >> .env
fi

if [ -n "$NOTION_API_KEY" ]; then
    echo "NOTION_API_KEY=$NOTION_API_KEY" >> .env
fi

if [ -n "$VERCEL_TOKEN" ]; then
    echo "VERCEL_TOKEN=$VERCEL_TOKEN" >> .env
fi

if [ -n "$SUPABASE_URL" ]; then
    echo "SUPABASE_URL=$SUPABASE_URL" >> .env
fi

if [ -n "$SUPABASE_ANON_KEY" ]; then
    echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> .env
fi

# Add deployment configuration
cat >> .env << EOF

# ===== APPLICATION CONFIGURATION =====
APP_NAME=$APP_NAME
COMPANY_NAME=$COMPANY_NAME
SUPPORT_EMAIL=$SUPPORT_EMAIL
NOTIFICATION_EMAIL=$NOTIFICATION_EMAIL

# ===== DATABASE CONFIGURATION =====
# These will be auto-configured by Render or set manually for other deployments
# DATABASE_URL=postgresql://user:pass@host:port/dbname
# REDIS_URL=redis://host:port/0

# ===== PERFORMANCE CONFIGURATION =====
ENABLE_REDIS_CACHING=true
CACHE_TIMEOUT_SECONDS=300
MAX_WORKERS=4
WORKER_TIMEOUT=120

# ===== MONITORING CONFIGURATION =====
ENABLE_HEALTH_CHECKS=true
HEALTH_CHECK_INTERVAL=30
ENABLE_METRICS=true
METRICS_PORT=9090
EOF

echo -e "${GREEN}✅ .env file created successfully!${NC}"
echo ""

# Create Render environment variables format
echo "📋 Creating Render environment variables..."

cat > render_env_vars.txt << EOF
# Copy these environment variables to your Render service:
# Go to: Render Dashboard → Your Service → Environment

OPENAI_API_KEY=$OPENAI_API_KEY
GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=$GITHUB_CLIENT_SECRET
SECRET_KEY=$SECRET_KEY
JWT_SECRET_KEY=$JWT_SECRET_KEY
ENABLE_MULTI_MODEL=$ENABLE_MULTI_MODEL
ENABLE_MCP=$ENABLE_MCP
ENABLE_REAL_TIME=$ENABLE_REAL_TIME
ENABLE_TEAM_MODE=$ENABLE_TEAM_MODE
ENABLE_DEEP_SECURITY=$ENABLE_DEEP_SECURITY
ENABLE_PERFORMANCE_PROFILING=$ENABLE_PERFORMANCE_PROFILING
MANUS_VERSION=2.0
APP_NAME=$APP_NAME
COMPANY_NAME=$COMPANY_NAME
SUPPORT_EMAIL=$SUPPORT_EMAIL
EOF

# Add optional vars to Render config
if [ -n "$SENTRY_DSN" ]; then
    echo "SENTRY_DSN=$SENTRY_DSN" >> render_env_vars.txt
fi

if [ -n "$NOTION_API_KEY" ]; then
    echo "NOTION_API_KEY=$NOTION_API_KEY" >> render_env_vars.txt
fi

if [ -n "$VERCEL_TOKEN" ]; then
    echo "VERCEL_TOKEN=$VERCEL_TOKEN" >> render_env_vars.txt
fi

if [ -n "$SUPABASE_URL" ]; then
    echo "SUPABASE_URL=$SUPABASE_URL" >> render_env_vars.txt
fi

if [ -n "$SUPABASE_ANON_KEY" ]; then
    echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY" >> render_env_vars.txt
fi

echo -e "${GREEN}✅ render_env_vars.txt created for easy Render setup!${NC}"
echo ""

# Validation
echo "🔍 Validating configuration..."

validation_errors=0

# Check OpenAI API key format
if [[ ! $OPENAI_API_KEY =~ ^sk- ]]; then
    echo -e "${RED}⚠️  Warning: OpenAI API key should start with 'sk-'${NC}"
    validation_errors=$((validation_errors + 1))
fi

# Check GitHub OAuth format
if [[ ${#GITHUB_CLIENT_ID} -lt 16 ]]; then
    echo -e "${RED}⚠️  Warning: GitHub Client ID seems too short${NC}"
    validation_errors=$((validation_errors + 1))
fi

if [[ ${#GITHUB_CLIENT_SECRET} -lt 32 ]]; then
    echo -e "${RED}⚠️  Warning: GitHub Client Secret seems too short${NC}"
    validation_errors=$((validation_errors + 1))
fi

if [ $validation_errors -eq 0 ]; then
    echo -e "${GREEN}✅ Configuration looks good!${NC}"
else
    echo -e "${YELLOW}⚠️  $validation_errors potential issues found. Please review.${NC}"
fi

echo ""

# Next steps
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo ""
echo "📁 Files created:"
echo "  • .env (for local development and Docker)"
echo "  • render_env_vars.txt (for Render deployment)"
echo ""
echo "🚀 Next steps:"
echo ""
echo "For Render deployment:"
echo "  1. Go to render.com and create a new Blueprint"
echo "  2. Select your GitHub repository"
echo "  3. Use render_manus.yaml as the blueprint"
echo "  4. Copy environment variables from render_env_vars.txt"
echo "  5. Deploy!"
echo ""
echo "For Docker deployment:"
echo "  1. Run: docker-compose up -d"
echo "  2. Visit: http://localhost:3000"
echo ""
echo "For local development:"
echo "  1. Backend: cd codeguardian-backend && python src/main_render.py"
echo "  2. Frontend: cd codeguardian-frontend && npm run dev"
echo ""
echo -e "${BLUE}📖 See DEPLOYMENT_GUIDE_MANUS.md for detailed instructions${NC}"
echo -e "${BLUE}⚡ See QUICK_START_CHECKLIST.md for 15-minute deployment${NC}"
echo ""
echo -e "${GREEN}Good luck with your CodeGuardian deployment! 🚀${NC}"

