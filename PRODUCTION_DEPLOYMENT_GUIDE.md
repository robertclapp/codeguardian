# CodeGuardian Production Deployment Guide

**Updated**: 2025-10-28
**Version**: 2.0
**Status**: Production Ready ✅

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Security Configuration](#security-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment Validation](#post-deployment-validation)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended) or similar
- **Python**: 3.11 or higher
- **Database**: PostgreSQL 13+ (required for production)
- **Redis**: 6.0+ (required for rate limiting and caching)
- **Memory**: Minimum 2GB RAM
- **CPU**: Minimum 2 cores

### Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Python and development tools
sudo apt install -y python3.11 python3.11-venv python3.11-dev
sudo apt install -y build-essential libpq-dev

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx (optional, for reverse proxy)
sudo apt install -y nginx
```

---

## Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/codeguardian.git
cd codeguardian/codeguardian-backend
```

### Step 2: Generate Environment Configuration

```bash
# Generate production .env file
python3 scripts/generate_env.py --environment production --output .env

# Review and edit the generated .env file
nano .env
```

### Step 3: Set Required Environment Variables

**CRITICAL**: Update these values in your `.env` file:

```bash
# Generate secure random keys
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET=' + secrets.token_hex(32))"
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))"
```

**Required Variables**:

```env
# Application
FLASK_ENV=production
FLASK_DEBUG=false

# Security (replace with generated values)
SECRET_KEY=<your-generated-secret-key>
JWT_SECRET=<your-generated-jwt-secret>
JWT_SECRET_KEY=<your-generated-jwt-secret-key>

# API Keys
OPENAI_API_KEY=<your-openai-api-key>

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/codeguardian

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS (your frontend domain)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 4: Set Proper Permissions

```bash
# Secure .env file
chmod 600 .env

# Verify permissions
ls -la .env
# Should show: -rw------- (600)
```

---

## Security Configuration

### Enable CSRF Protection

Ensure these settings in `.env`:

```env
WTF_CSRF_ENABLED=true
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true
```

### Configure Rate Limiting

```env
RATE_LIMIT=100 per hour
REDIS_URL=redis://localhost:6379/0
```

### CORS Configuration

**Important**: Replace `*` with specific domains:

```env
# ❌ BAD (don't use in production)
CORS_ORIGINS=*

# ✅ GOOD (specific domains)
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

### SSL/TLS Configuration

For HTTPS (required in production):

```bash
# Get SSL certificates (Let's Encrypt recommended)
sudo apt install -y certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Database Setup

### Step 1: Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE codeguardian;
CREATE USER codeguardian_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE codeguardian TO codeguardian_user;

# Exit psql
\q
```

### Step 2: Update DATABASE_URL

```env
DATABASE_URL=postgresql://codeguardian_user:secure_password_here@localhost:5432/codeguardian
```

### Step 3: Run Migrations

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python3 -c "from src.main import app; from src.database import db; \
    with app.app_context(): db.create_all()"
```

---

## Deployment Process

### Automated Deployment

Use the provided deployment script:

```bash
# Run deployment script
./scripts/deploy.sh production
```

The script will:
- ✅ Validate environment configuration
- ✅ Check for security issues
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Execute tests
- ✅ Prepare application for production

### Manual Deployment

If you prefer manual deployment:

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run database migrations
python3 -c "from src.main import app; from src.database import db; \
    with app.app_context(): db.create_all()"

# 4. Run tests
pytest tests/

# 5. Start with Gunicorn
gunicorn -c gunicorn.conf.py src.main:app
```

### Using the Start Script

```bash
# Start the application
./scripts/start.sh
```

---

## Post-Deployment Validation

### Step 1: Health Check

```bash
# Check if application is running
curl http://localhost:5000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-28T12:00:00",
#   "system": { ... }
# }
```

### Step 2: Validate Security Features

```bash
# Test CSRF token endpoint
curl http://localhost:5000/api/csrf-token

# Test rate limiting (should see rate limit headers)
curl -I http://localhost:5000/api/auth/me

# Check for security headers
curl -I http://localhost:5000/
```

### Step 3: Test Authentication

```bash
# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123"}'
```

### Step 4: Verify Environment Configuration

```bash
# Check logs for security warnings
tail -f logs/codeguardian.log | grep -i "warning\|error"

# Should NOT see:
# - "Using default JWT secret"
# - "Using development SECRET_KEY"
# - "SQLite database detected"
```

---

## Monitoring & Maintenance

### Application Logs

```bash
# View application logs
tail -f logs/codeguardian.log

# View Gunicorn access logs
tail -f logs/gunicorn-access.log

# View Gunicorn error logs
tail -f logs/gunicorn-error.log
```

### System Monitoring

```bash
# Check application status
./scripts/status.sh

# View resource usage
htop  # or top

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Database Maintenance

```bash
# Backup database
pg_dump codeguardian > backup_$(date +%Y%m%d).sql

# Vacuum database (periodic maintenance)
sudo -u postgres psql -d codeguardian -c "VACUUM ANALYZE;"
```

### Redis Monitoring

```bash
# Check Redis status
redis-cli ping

# Monitor Redis
redis-cli monitor

# Check memory usage
redis-cli info memory
```

---

## Troubleshooting

### Application Won't Start

**Issue**: Import errors or module not found

```bash
# Solution: Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Issue**: Database connection errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U codeguardian_user -d codeguardian

# Verify DATABASE_URL in .env
```

### Rate Limiting Not Working

**Issue**: Redis connection errors

```bash
# Check Redis is running
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Verify REDIS_URL in .env
```

### CSRF Errors

**Issue**: CSRF validation failing

```bash
# Ensure CSRF is properly configured
# Check .env:
WTF_CSRF_ENABLED=true

# For API-only mode (JWT authentication), you can disable CSRF:
WTF_CSRF_ENABLED=false
CSRF_SKIP_JWT=true
```

### Performance Issues

**Issue**: Slow response times

```bash
# Check worker processes
ps aux | grep gunicorn

# Increase workers in .env:
WORKER_PROCESSES=8

# Restart application
./scripts/stop.sh && ./scripts/start.sh
```

**Issue**: High memory usage

```bash
# Check for memory leaks
ps aux | grep gunicorn | awk '{print $6}'

# Reduce max_requests to restart workers more frequently:
MAX_REQUESTS=500
```

### Database Issues

**Issue**: Too many database connections

```bash
# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='codeguardian';"

# Adjust pool size in config.py:
SQLALCHEMY_ENGINE_OPTIONS = {
    'pool_size': 10,
    'max_overflow': 20
}
```

---

## Security Checklist

Before going live, verify:

- ✅ **Environment Variables**
  - [ ] SECRET_KEY is randomly generated (not default)
  - [ ] JWT_SECRET is randomly generated (not default)
  - [ ] OPENAI_API_KEY is set correctly
  - [ ] DATABASE_URL points to PostgreSQL (not SQLite)
  - [ ] REDIS_URL is configured

- ✅ **CORS Configuration**
  - [ ] CORS_ORIGINS contains only your domains (not `*`)
  - [ ] No wildcard origins in production

- ✅ **SSL/TLS**
  - [ ] SSL certificates installed
  - [ ] SESSION_COOKIE_SECURE=true
  - [ ] Application accessible via HTTPS

- ✅ **Security Features**
  - [ ] WTF_CSRF_ENABLED=true
  - [ ] RATE_LIMIT configured
  - [ ] Redis is running for rate limiting

- ✅ **Database**
  - [ ] PostgreSQL is used (not SQLite)
  - [ ] Database user has limited privileges
  - [ ] Regular backups configured

- ✅ **Monitoring**
  - [ ] Sentry DSN configured (optional)
  - [ ] Log rotation configured
  - [ ] Health check endpoint accessible

- ✅ **File Permissions**
  - [ ] .env file is chmod 600
  - [ ] Application files owned by correct user
  - [ ] No sensitive files in git repository

---

## Performance Optimization

### Recommended Settings for Production

```env
# Worker Configuration
WORKER_PROCESSES=8
WORKER_CONNECTIONS=1000
MAX_REQUESTS=1000

# Database Pooling
SQLALCHEMY_POOL_SIZE=10
SQLALCHEMY_MAX_OVERFLOW=20
SQLALCHEMY_POOL_PRE_PING=true

# Caching
REDIS_URL=redis://localhost:6379/0
ENABLE_METRICS=true
```

### Nginx Reverse Proxy (Recommended)

```nginx
# /etc/nginx/sites-available/codeguardian
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Contact & Support

For issues or questions:
- GitHub Issues: https://github.com/yourusername/codeguardian/issues
- Documentation: See CODE_QUALITY_REVIEW.md
- Architecture: See architecture.md

---

**Last Updated**: 2025-10-28
**Version**: 2.0
**Status**: ✅ Production Ready
