#!/bin/bash

# Fix port 80/443 conflicts for GRS Delivery deployment
# Usage: sudo ./scripts/fix-port-conflict.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Check what's using the ports
check_port_usage() {
    log "Checking what's using ports 80 and 443..."
    
    echo "=== Port 80 Usage ==="
    lsof -i :80 2>/dev/null || echo "No processes found using port 80"
    
    echo ""
    echo "=== Port 443 Usage ==="
    lsof -i :443 2>/dev/null || echo "No processes found using port 443"
    
    echo ""
    echo "=== Active Web Servers ==="
    
    # Check Apache
    if systemctl is-active --quiet apache2 2>/dev/null; then
        warning "Apache2 is running and may be using port 80/443"
        APACHE_RUNNING=true
    elif systemctl is-active --quiet httpd 2>/dev/null; then
        warning "Apache (httpd) is running and may be using port 80/443"
        APACHE_RUNNING=true
    else
        info "Apache is not running"
        APACHE_RUNNING=false
    fi
    
    # Check Nginx
    if systemctl is-active --quiet nginx 2>/dev/null; then
        warning "Nginx is running and may be using port 80/443"
        NGINX_RUNNING=true
    else
        info "Nginx is not running"
        NGINX_RUNNING=false
    fi
}

# Stop conflicting services
stop_conflicting_services() {
    log "Stopping conflicting web servers..."
    
    # Stop Apache if running
    if [[ "$APACHE_RUNNING" == "true" ]]; then
        log "Stopping Apache..."
        systemctl stop apache2 2>/dev/null || systemctl stop httpd 2>/dev/null || true
        systemctl disable apache2 2>/dev/null || systemctl disable httpd 2>/dev/null || true
        log "✓ Apache stopped and disabled"
    fi
    
    # Stop system Nginx if running (we'll use Docker Nginx)
    if [[ "$NGINX_RUNNING" == "true" ]]; then
        log "Stopping system Nginx (we'll use Docker Nginx instead)..."
        systemctl stop nginx
        systemctl disable nginx
        log "✓ System Nginx stopped and disabled"
    fi
    
    # Kill any other processes using port 80/443
    PROCESSES_80=$(lsof -t -i :80 2>/dev/null || true)
    if [[ -n "$PROCESSES_80" ]]; then
        log "Killing processes using port 80..."
        kill -9 $PROCESSES_80 2>/dev/null || true
    fi
    
    PROCESSES_443=$(lsof -t -i :443 2>/dev/null || true)
    if [[ -n "$PROCESSES_443" ]]; then
        log "Killing processes using port 443..."
        kill -9 $PROCESSES_443 2>/dev/null || true
    fi
}

# Verify ports are free
verify_ports_free() {
    log "Verifying ports 80 and 443 are free..."
    
    sleep 2
    
    if lsof -i :80 >/dev/null 2>&1; then
        error "Port 80 is still in use. Please check manually."
    else
        log "✓ Port 80 is free"
    fi
    
    if lsof -i :443 >/dev/null 2>&1; then
        error "Port 443 is still in use. Please check manually."
    else
        log "✓ Port 443 is free"
    fi
}

# Backup existing configurations
backup_configs() {
    log "Backing up existing web server configurations..."
    
    BACKUP_DIR="/opt/backups/web-configs-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Backup Apache config if exists
    if [[ -d "/etc/apache2" ]]; then
        cp -r /etc/apache2 "$BACKUP_DIR/" 2>/dev/null || true
        log "✓ Apache configuration backed up to $BACKUP_DIR"
    fi
    
    # Backup Nginx config if exists
    if [[ -d "/etc/nginx" ]]; then
        cp -r /etc/nginx "$BACKUP_DIR/" 2>/dev/null || true
        log "✓ Nginx configuration backed up to $BACKUP_DIR"
    fi
    
    info "Configurations backed up to: $BACKUP_DIR"
}

# Alternative: Use different ports for Docker
setup_alternative_ports() {
    log "Setting up alternative port configuration..."
    
    # Create alternative docker-compose file
    cat > docker-compose.alt-ports.yml << 'EOF'
version: '3.8'

# Alternative ports configuration to avoid conflicts
# Usage: docker-compose -f docker-compose.yml -f docker-compose.alt-ports.yml up

services:
  nginx:
    ports:
      - "8080:80"   # Use port 8080 instead of 80
      - "8443:443"  # Use port 8443 instead of 443
EOF
    
    info "Created docker-compose.alt-ports.yml for alternative ports"
    info "You can access your application at:"
    info "  - http://your-server-ip:8080 (instead of port 80)"
    info "  - https://your-server-ip:8443 (instead of port 443)"
}

# Main function
main() {
    log "Starting port conflict resolution..."
    
    check_root
    
    echo "This script will help resolve port 80/443 conflicts for GRS Delivery deployment."
    echo ""
    echo "Options:"
    echo "1) Stop conflicting services and use standard ports (80/443) - RECOMMENDED"
    echo "2) Use alternative ports (8080/8443) to avoid conflicts"
    echo "3) Just check what's using the ports (no changes)"
    echo ""
    read -p "Choose an option (1-3): " choice
    
    case $choice in
        1)
            check_port_usage
            backup_configs
            stop_conflicting_services
            verify_ports_free
            log "✓ Ports 80 and 443 are now free for Docker deployment"
            info "You can now run: ./scripts/deploy.sh production"
            ;;
        2)
            setup_alternative_ports
            log "✓ Alternative port configuration created"
            info "Deploy with: docker-compose -f docker-compose.yml -f docker-compose.alt-ports.yml up -d"
            ;;
        3)
            check_port_usage
            ;;
        *)
            error "Invalid choice. Exiting."
            ;;
    esac
    
    log "Port conflict resolution completed!"
}

# Run main function
main "$@"