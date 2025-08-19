#!/bin/bash

# GRS Delivery System Server Setup Script
# Usage: ./scripts/setup-server.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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
        error "This script must be run as root"
    fi
}

# Update system packages
update_system() {
    log "Updating system packages..."
    apt-get update
    apt-get upgrade -y
    apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
}

# Install Docker
install_docker() {
    log "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    # Add current user to docker group
    usermod -aG docker $SUDO_USER || true
    
    log "Docker installed successfully"
}

# Install Docker Compose
install_docker_compose() {
    log "Installing Docker Compose..."
    
    # Get latest version
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Download and install
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log "Docker Compose installed successfully"
}

# Install Node.js and pnpm
install_nodejs() {
    log "Installing Node.js and pnpm..."
    
    # Install Node.js 18.x
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
    
    # Install pnpm
    npm install -g pnpm
    
    log "Node.js and pnpm installed successfully"
}

# Install Nginx
install_nginx() {
    log "Installing Nginx..."
    
    apt-get install -y nginx
    
    # Start and enable Nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Remove default site
    rm -f /etc/nginx/sites-enabled/default
    
    log "Nginx installed successfully"
}

# Install Certbot for SSL
install_certbot() {
    log "Installing Certbot for SSL certificates..."
    
    apt-get install -y certbot python3-certbot-nginx
    
    log "Certbot installed successfully"
}

# Setup firewall
setup_firewall() {
    log "Setting up firewall..."
    
    # Install ufw
    apt-get install -y ufw
    
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

# Create application directories
create_directories() {
    log "Creating application directories..."
    
    # Create application directory
    mkdir -p /opt/grs-delivery
    mkdir -p /opt/backups/grs-delivery
    mkdir -p /var/log/grs-delivery
    
    # Set permissions
    chown -R $SUDO_USER:$SUDO_USER /opt/grs-delivery
    chown -R $SUDO_USER:$SUDO_USER /opt/backups/grs-delivery
    chown -R $SUDO_USER:$SUDO_USER /var/log/grs-delivery
    
    log "Directories created successfully"
}

# Setup log rotation
setup_log_rotation() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/grs-delivery << EOF
/var/log/grs-delivery/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SUDO_USER $SUDO_USER
    postrotate
        docker-compose -f /opt/grs-delivery/docker-compose.yml restart nginx
    endscript
}
EOF
    
    log "Log rotation configured successfully"
}

# Setup system monitoring
setup_monitoring() {
    log "Setting up system monitoring..."
    
    # Install htop and other monitoring tools
    apt-get install -y htop iotop nethogs
    
    # Create monitoring script
    cat > /usr/local/bin/grs-status << 'EOF'
#!/bin/bash
echo "=== GRS Delivery System Status ==="
echo "Date: $(date)"
echo ""
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== System Resources ==="
echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory Usage: $(free | grep Mem | awk '{printf("%.2f%%", $3/$2 * 100.0)}')"
echo "Disk Usage: $(df -h / | awk 'NR==2{printf "%s", $5}')"
echo ""
echo "=== Network Connections ==="
netstat -tuln | grep -E ':(80|443|3000|3001|3002|3003|3004)'
EOF
    
    chmod +x /usr/local/bin/grs-status
    
    log "System monitoring configured successfully"
}

# Setup automatic updates
setup_auto_updates() {
    log "Setting up automatic security updates..."
    
    apt-get install -y unattended-upgrades
    
    # Configure automatic updates
    cat > /etc/apt/apt.conf.d/50unattended-upgrades << EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF
    
    # Enable automatic updates
    echo 'APT::Periodic::Update-Package-Lists "1";' > /etc/apt/apt.conf.d/20auto-upgrades
    echo 'APT::Periodic::Unattended-Upgrade "1";' >> /etc/apt/apt.conf.d/20auto-upgrades
    
    log "Automatic updates configured successfully"
}

# Main setup function
main() {
    log "Starting GRS Delivery System server setup..."
    
    check_root
    update_system
    install_docker
    install_docker_compose
    install_nodejs
    install_nginx
    install_certbot
    setup_firewall
    create_directories
    setup_log_rotation
    setup_monitoring
    setup_auto_updates
    
    log "Server setup completed successfully!"
    info ""
    info "Next steps:"
    info "1. Clone your repository to /opt/grs-delivery"
    info "2. Configure your .env file"
    info "3. Obtain SSL certificates using: certbot certonly --standalone -d yourdomain.com"
    info "4. Run the deployment script: ./scripts/deploy.sh"
    info ""
    info "Useful commands:"
    info "- Check system status: grs-status"
    info "- View logs: docker-compose logs -f"
    info "- Update application: ./scripts/update.sh"
    info ""
    warning "Please reboot the server to ensure all changes take effect."
}

# Run main function
main "$@"