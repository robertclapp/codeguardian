"""
Gunicorn configuration for CodeGuardian Backend

Production-ready configuration with optimal settings for
serving Flask applications.
"""

import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
workers = int(os.getenv('WORKER_PROCESSES', multiprocessing.cpu_count() * 2 + 1))
worker_class = 'sync'
worker_connections = int(os.getenv('WORKER_CONNECTIONS', 1000))
threads = 2
max_requests = int(os.getenv('MAX_REQUESTS', 1000))
max_requests_jitter = 50
timeout = 60
graceful_timeout = 30
keepalive = 5

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Logging
accesslog = '-'  # Log to stdout
errorlog = '-'   # Log to stderr
loglevel = os.getenv('LOG_LEVEL', 'info').lower()
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'codeguardian'

# Server hooks
def on_starting(server):
    """Called just before the master process is initialized"""
    server.log.info("Starting CodeGuardian Backend")


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP"""
    server.log.info("Reloading CodeGuardian Backend")


def when_ready(server):
    """Called just after the server is started"""
    server.log.info(f"Server is ready. Listening on: {server.address}")
    server.log.info(f"Worker processes: {workers}")


def on_exit(server):
    """Called just before exiting Gunicorn"""
    server.log.info("Shutting down CodeGuardian Backend")


def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT"""
    worker.log.info(f"Worker {worker.pid} received SIGINT/SIGQUIT")


def worker_abort(worker):
    """Called when a worker received the SIGABRT signal"""
    worker.log.info(f"Worker {worker.pid} received SIGABRT")


# SSL (if certificates are provided)
keyfile = os.getenv('SSL_KEYFILE')
certfile = os.getenv('SSL_CERTFILE')

if keyfile and certfile:
    # Enable SSL
    bind = f"0.0.0.0:{os.getenv('PORT', '443')}"
