#!/usr/bin/env python3
"""
Environment Configuration Generator for CodeGuardian

This script helps generate secure environment variables and create
a properly configured .env file for your deployment.

Usage:
    python scripts/generate_env.py [--environment production|development|testing]
"""

import secrets
import os
import sys
import argparse
from pathlib import Path


def generate_secret_key(length=32):
    """Generate a secure random secret key"""
    return secrets.token_hex(length)


def generate_jwt_secret(length=32):
    """Generate a secure random JWT secret"""
    return secrets.token_hex(length)


def get_template_content(environment='development'):
    """Get the appropriate .env template based on environment"""

    # Generate secure keys
    secret_key = generate_secret_key()
    jwt_secret = generate_jwt_secret()
    jwt_secret_key = generate_jwt_secret()

    if environment == 'production':
        return f"""# CodeGuardian Backend - Production Configuration
# Generated: {os.popen('date').read().strip()}

# ============================================
# REQUIRED SETTINGS
# ============================================

FLASK_ENV=production
FLASK_DEBUG=false

# Secure secret keys (auto-generated)
SECRET_KEY={secret_key}
JWT_SECRET={jwt_secret}
JWT_SECRET_KEY={jwt_secret_key}

# OpenAI API Configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-4
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_TIMEOUT=60

# Database Configuration (PostgreSQL required for production)
DATABASE_URL=postgresql://user:password@localhost:5432/codeguardian

# Redis Configuration (required for production)
REDIS_URL=redis://localhost:6379/0

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# ============================================
# SECURITY SETTINGS (PRODUCTION)
# ============================================

SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax

WTF_CSRF_ENABLED=true
WTF_CSRF_TIME_LIMIT=3600

RATE_LIMIT=100 per hour

# ============================================
# OPTIONAL SETTINGS
# ============================================

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=/api/auth/github/callback

# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-email-password
SMTP_USE_TLS=true

# Monitoring
SENTRY_DSN=your-sentry-dsn-here

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_GITHUB_OAUTH=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_METRICS=true

# Performance
WORKER_PROCESSES=4
WORKER_CONNECTIONS=1000
MAX_REQUESTS=1000

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# ============================================
# TODO: Replace the following with your actual values
# ============================================
# - OPENAI_API_KEY
# - DATABASE_URL
# - CORS_ORIGINS
# - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET (if using OAuth)
# - SMTP settings (if using email)
# - SENTRY_DSN (if using monitoring)
"""

    elif environment == 'development':
        return f"""# CodeGuardian Backend - Development Configuration
# Generated: {os.popen('date').read().strip()}

# ============================================
# REQUIRED SETTINGS
# ============================================

FLASK_ENV=development
FLASK_DEBUG=true

# Secure secret keys (auto-generated)
SECRET_KEY={secret_key}
JWT_SECRET={jwt_secret}
JWT_SECRET_KEY={jwt_secret_key}

# OpenAI API Configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY_HERE
OPENAI_MODEL=gpt-4
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_TIMEOUT=60

# Database Configuration (SQLite for development)
DATABASE_URL=sqlite:///codeguardian_dev.db

# Redis Configuration (optional for development)
REDIS_URL=redis://localhost:6379/0

# CORS Configuration (allow local development)
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080

# ============================================
# SECURITY SETTINGS (DEVELOPMENT)
# ============================================

SESSION_COOKIE_SECURE=false
SESSION_COOKIE_HTTPONLY=true
SESSION_COOKIE_SAMESITE=Lax

WTF_CSRF_ENABLED=false
WTF_CSRF_TIME_LIMIT=3600

RATE_LIMIT=1000 per hour

# ============================================
# OPTIONAL SETTINGS
# ============================================

# Feature Flags
ENABLE_REGISTRATION=true
ENABLE_GITHUB_OAUTH=false
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_METRICS=true

# Logging
LOG_LEVEL=DEBUG
LOG_FORMAT=json

# Database Query Logging
SQLALCHEMY_ECHO=false

# ============================================
# TODO: Set your OpenAI API key
# ============================================
# Get your API key from: https://platform.openai.com/api-keys
"""

    else:  # testing
        return f"""# CodeGuardian Backend - Testing Configuration
# Generated: {os.popen('date').read().strip()}

# ============================================
# REQUIRED SETTINGS
# ============================================

FLASK_ENV=testing
FLASK_DEBUG=true

# Secure secret keys (auto-generated)
SECRET_KEY={secret_key}
JWT_SECRET={jwt_secret}
JWT_SECRET_KEY={jwt_secret_key}

# OpenAI API Configuration (use test key or mock)
OPENAI_API_KEY=test-key-for-testing
OPENAI_MODEL=gpt-4
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_TIMEOUT=60

# Database Configuration (in-memory SQLite for testing)
DATABASE_URL=sqlite:///:memory:

# CORS Configuration (allow all for testing)
CORS_ORIGINS=*

# ============================================
# SECURITY SETTINGS (TESTING)
# ============================================

SESSION_COOKIE_SECURE=false
WTF_CSRF_ENABLED=false
RATE_LIMIT=

# ============================================
# TESTING SETTINGS
# ============================================

TESTING=true
ENABLE_REGISTRATION=true
ENABLE_GITHUB_OAUTH=false
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_METRICS=false

LOG_LEVEL=DEBUG
"""


def main():
    parser = argparse.ArgumentParser(
        description='Generate secure environment configuration for CodeGuardian'
    )
    parser.add_argument(
        '--environment',
        choices=['development', 'production', 'testing'],
        default='development',
        help='Target environment (default: development)'
    )
    parser.add_argument(
        '--output',
        default='.env',
        help='Output file path (default: .env)'
    )
    parser.add_argument(
        '--force',
        action='store_true',
        help='Overwrite existing .env file without prompting'
    )
    parser.add_argument(
        '--show-keys',
        action='store_true',
        help='Display generated keys (for manual entry)'
    )

    args = parser.parse_args()

    # Check if .env already exists
    output_path = Path(args.output)
    if output_path.exists() and not args.force:
        response = input(f'{args.output} already exists. Overwrite? (y/N): ')
        if response.lower() != 'y':
            print('Aborted.')
            sys.exit(0)

    # Generate content
    content = get_template_content(args.environment)

    # Write to file
    output_path.write_text(content)

    print(f'✓ Generated {args.environment} configuration: {args.output}')
    print()
    print('Next steps:')
    print(f'1. Edit {args.output} and set your actual values')

    if args.environment == 'production':
        print('2. Set OPENAI_API_KEY to your actual API key')
        print('3. Set DATABASE_URL to your PostgreSQL connection string')
        print('4. Set CORS_ORIGINS to your actual domain(s)')
        print('5. Configure SMTP settings if using email notifications')
        print('6. Set SENTRY_DSN if using error monitoring')
    else:
        print('2. Set OPENAI_API_KEY to your actual API key')
        print('3. (Optional) Configure other services as needed')

    print()
    print('Security reminders:')
    print('- Never commit .env files to version control')
    print('- Use different keys for each environment')
    print('- Rotate secrets regularly in production')

    # Show keys if requested
    if args.show_keys:
        print()
        print('Generated Secret Keys:')
        print('=' * 60)
        # Extract keys from content
        for line in content.split('\n'):
            if '=' in line and any(key in line for key in ['SECRET_KEY', 'JWT_SECRET']):
                if not line.startswith('#'):
                    print(line)
        print('=' * 60)


if __name__ == '__main__':
    main()
