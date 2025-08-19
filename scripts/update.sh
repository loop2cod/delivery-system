#!/bin/bash

# GRS Delivery System Update Script
# Usage: ./scripts/update.sh

set -e

# Configuration
PROJECT_NAME="grs-delivery"
LOG_FILE="/var/log/grs-update.log"

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

# Check if there are updates available
check_updates() {
    log "Checking for updates..."
    
    # Fetch latest changes
    git fetch origin main
    
    # Check if there are new commits
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [[ "$LOCAL" == "$REMOTE" ]]; then
        info "No updates available. Current version is up to date."
        exit 0
    else
        log "Updates available. Proceeding with update..."
        git log --oneline "$LOCAL".."$REMOTE"
    fi
}

# Rolling update function
rolling_update() {
    log "Performing rolling update..."
    
    # Pull latest changes
    git pull origin main
    
    # Build new images
    log "Building updated images..."
    docker-compose build
    
    # Update services one by one to minimize downtime
    SERVICES=("backend" "public-pwa" "admin-pwa" "business-pwa" "driver-pwa")
    
    for service in "${SERVICES[@]}"; do
        log "Updating $service..."
        
        # Scale up new instance
        docker-compose up -d --scale "$service"=2 "$service"
        
        # Wait for new instance to be ready
        sleep 15
        
        # Remove old instance
        OLD_CONTAINER=$(docker ps --filter "name=grs-$service" --format "{{.Names}}" | head -1)
        if [[ -n "$OLD_CONTAINER" ]]; then
            docker stop "$OLD_CONTAINER"
            docker rm "$OLD_CONTAINER"
        fi
        
        # Scale back to 1
        docker-compose up -d --scale "$service"=1 "$service"
        
        log "✓ $service updated successfully"
    done
    
    # Update nginx configuration if changed
    docker-compose up -d nginx
    
    log "Rolling update completed successfully"
}

# Quick update function (with brief downtime)
quick_update() {
    log "Performing quick update..."
    
    # Pull latest changes
    git pull origin main
    
    # Rebuild and restart services
    docker-compose down
    docker-compose build
    docker-compose up -d
    
    # Wait for services to be ready
    sleep 30
    
    log "Quick update completed successfully"
}

# Health check after update
health_check() {
    log "Performing health check..."
    
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
        error "✗ Backend API health check failed"
    fi
    
    # Check web applications
    URLS=("http://localhost:3001" "http://localhost:3002" "http://localhost:3003" "http://localhost:3004")
    for url in "${URLS[@]}"; do
        if curl -f -s "$url" > /dev/null; then
            log "✓ $(echo $url | cut -d':' -f3) is responding"
        else
            warning "✗ $(echo $url | cut -d':' -f3) is not responding"
        fi
    done
    
    log "Health check completed"
}

# Rollback function
rollback() {
    log "Rolling back to previous version..."
    
    # Get previous commit
    PREVIOUS_COMMIT=$(git log --oneline -2 | tail -1 | cut -d' ' -f1)
    
    if [[ -z "$PREVIOUS_COMMIT" ]]; then
        error "No previous commit found for rollback"
    fi
    
    # Checkout previous commit
    git checkout "$PREVIOUS_COMMIT"
    
    # Rebuild and restart
    docker-compose down
    docker-compose build
    docker-compose up -d
    
    log "Rollback completed to commit: $PREVIOUS_COMMIT"
}

# Main function
main() {
    log "Starting update process..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
    
    # Check for updates
    check_updates
    
    # Ask user for update method
    echo "Choose update method:"
    echo "1) Rolling update (zero downtime, slower)"
    echo "2) Quick update (brief downtime, faster)"
    echo "3) Check status only"
    echo "4) Rollback to previous version"
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            rolling_update
            ;;
        2)
            quick_update
            ;;
        3)
            health_check
            exit 0
            ;;
        4)
            rollback
            ;;
        *)
            error "Invalid choice. Exiting."
            ;;
    esac
    
    # Perform health check after update
    health_check
    
    log "Update process completed successfully!"
}

# Run main function
main "$@"