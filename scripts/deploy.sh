#!/bin/bash

# GRS Delivery System Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Configuration
ENVIRONMENT=${1:-production}
PROJECT_NAME="grs-delivery"
BACKUP_DIR="/opt/backups/grs-delivery"
LOG_FILE="/var/log/grs-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
    fi
    
    # Check if Git is installed
    if ! command -v git &> /dev/null; then
        error "Git is not installed. Please install Git first."
    fi
    
    log "Prerequisites check completed successfully"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Backup timestamp
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    # Stop services for consistent backup
    docker-compose down
    
    # Create backup of volumes
    docker run --rm \
        -v grs-delivery_mongodb_data:/data/mongodb \
        -v grs-delivery_redis_data:/data/redis \
        -v "$BACKUP_DIR":/backup \
        alpine:latest \
        tar czf "/backup/backup_$TIMESTAMP.tar.gz" /data
    
    log "Backup created: $BACKUP_FILE"
}

# Pull latest changes
pull_changes() {
    log "Pulling latest changes from repository..."
    
    # Stash any local changes
    git stash
    
    # Pull latest changes
    git pull origin main
    
    log "Repository updated successfully"
}

# Build and deploy
build_and_deploy() {
    log "Building and deploying application..."
    
    # Copy environment file
    if [[ ! -f .env ]]; then
        if [[ -f .env.production ]]; then
            cp .env.production .env
            warning "Copied .env.production to .env. Please review and update the configuration."
        else
            error ".env file not found. Please create one based on .env.production"
        fi
    fi
    
    # Build images
    log "Building Docker images..."
    docker-compose build --no-cache
    
    # Start services
    log "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    check_services_health
    
    log "Deployment completed successfully"
}

# Check services health
check_services_health() {
    log "Checking services health..."
    
    # Check if containers are running
    CONTAINERS=("grs-mongodb" "grs-redis" "grs-backend" "grs-public-pwa" "grs-admin-pwa" "grs-business-pwa" "grs-driver-pwa" "grs-nginx")
    
    for container in "${CONTAINERS[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            log "✓ $container is running"
        else
            error "✗ $container is not running"
        fi
    done
    
    # Check API health
    sleep 10
    if curl -f -s http://localhost:3000/health > /dev/null; then
        log "✓ Backend API is healthy"
    else
        warning "✗ Backend API health check failed"
    fi
    
    log "Health check completed"
}

# Setup SSL certificates
setup_ssl() {
    log "Setting up SSL certificates..."
    
    # Create SSL directory
    mkdir -p nginx/ssl
    
    # Check if certificates exist
    DOMAINS=("grsdeliver.com" "admin.grsdeliver.com" "business.grsdeliver.com" "driver.grsdeliver.com" "api.grsdeliver.com")
    
    for domain in "${DOMAINS[@]}"; do
        if [[ ! -f "nginx/ssl/$domain.crt" ]] || [[ ! -f "nginx/ssl/$domain.key" ]]; then
            warning "SSL certificate for $domain not found. Please obtain SSL certificates."
            info "You can use Let's Encrypt: certbot certonly --standalone -d $domain"
        fi
    done
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    # Install ufw if not present
    if ! command -v ufw &> /dev/null; then
        apt-get update
        apt-get install -y ufw
    fi
    
    # Configure firewall
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    log "Firewall configured successfully"
}

# Cleanup old images and containers
cleanup() {
    log "Cleaning up old Docker images and containers..."
    
    # Remove unused containers
    docker container prune -f
    
    # Remove unused images
    docker image prune -f
    
    # Remove unused volumes (be careful with this)
    # docker volume prune -f
    
    log "Cleanup completed"
}

# Main deployment function
main() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    check_permissions
    check_prerequisites
    
    # Create backup before deployment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        create_backup
    fi
    
    pull_changes
    setup_ssl
    build_and_deploy
    
    if [[ "$ENVIRONMENT" == "production" ]]; then
        setup_firewall
    fi
    
    cleanup
    
    log "Deployment completed successfully!"
    info "Access your applications at:"
    info "  - Public: https://grsdeliver.com"
    info "  - Admin: https://admin.grsdeliver.com"
    info "  - Business: https://business.grsdeliver.com"
    info "  - Driver: https://driver.grsdeliver.com"
    info "  - API: https://api.grsdeliver.com"
}

# Run main function
main "$@"