#!/bin/bash

# GRS Delivery System SSL Certificate Update Script
# Usage: ./scripts/update-ssl.sh

set -e

# Configuration
DOMAINS=("grsdeliver.com" "admin.grsdeliver.com" "business.grsdeliver.com" "driver.grsdeliver.com" "api.grsdeliver.com")
SSL_DIR="nginx/ssl"

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
        error "This script must be run as root or with sudo"
    fi
}

# Update SSL certificates
update_certificates() {
    log "Updating SSL certificates..."
    
    # Create SSL directory if it doesn't exist
    mkdir -p "$SSL_DIR"
    
    for domain in "${DOMAINS[@]}"; do
        log "Updating certificate for $domain..."
        
        # Check if Let's Encrypt certificate exists
        if [[ -f "/etc/letsencrypt/live/$domain/fullchain.pem" ]] && [[ -f "/etc/letsencrypt/live/$domain/privkey.pem" ]]; then
            # Copy certificate files
            cp "/etc/letsencrypt/live/$domain/fullchain.pem" "$SSL_DIR/$domain.crt"
            cp "/etc/letsencrypt/live/$domain/privkey.pem" "$SSL_DIR/$domain.key"
            
            # Set proper permissions
            chmod 644 "$SSL_DIR/$domain.crt"
            chmod 600 "$SSL_DIR/$domain.key"
            
            log "✓ Certificate for $domain updated successfully"
        else
            warning "Certificate for $domain not found in Let's Encrypt directory"
            info "Run: certbot certonly --standalone -d $domain"
        fi
    done
}

# Verify certificates
verify_certificates() {
    log "Verifying SSL certificates..."
    
    for domain in "${DOMAINS[@]}"; do
        if [[ -f "$SSL_DIR/$domain.crt" ]]; then
            # Check certificate validity
            EXPIRY=$(openssl x509 -in "$SSL_DIR/$domain.crt" -noout -enddate | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
            CURRENT_EPOCH=$(date +%s)
            DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
            
            if [[ $DAYS_LEFT -gt 30 ]]; then
                log "✓ Certificate for $domain is valid (expires in $DAYS_LEFT days)"
            elif [[ $DAYS_LEFT -gt 0 ]]; then
                warning "Certificate for $domain expires in $DAYS_LEFT days - consider renewal"
            else
                error "Certificate for $domain has expired!"
            fi
        else
            warning "Certificate file for $domain not found"
        fi
    done
}

# Reload nginx
reload_nginx() {
    log "Reloading Nginx configuration..."
    
    # Test nginx configuration first
    if docker exec grs-nginx nginx -t; then
        # Reload nginx
        docker exec grs-nginx nginx -s reload
        log "✓ Nginx reloaded successfully"
    else
        error "Nginx configuration test failed. Please check your configuration."
    fi
}

# Setup automatic certificate renewal
setup_auto_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /usr/local/bin/grs-ssl-renew << 'EOF'
#!/bin/bash
# GRS Delivery SSL Certificate Auto-Renewal

# Renew certificates
certbot renew --quiet

# Update nginx certificates
/opt/grs-delivery/scripts/update-ssl.sh

# Log renewal
echo "$(date): SSL certificates renewed" >> /var/log/grs-ssl-renewal.log
EOF
    
    chmod +x /usr/local/bin/grs-ssl-renew
    
    # Add to crontab (run twice daily)
    (crontab -l 2>/dev/null; echo "0 2,14 * * * /usr/local/bin/grs-ssl-renew") | crontab -
    
    log "✓ Automatic SSL renewal configured"
}

# Main function
main() {
    log "Starting SSL certificate update..."
    
    check_root
    update_certificates
    verify_certificates
    reload_nginx
    setup_auto_renewal
    
    log "SSL certificate update completed successfully!"
    info "Certificates will be automatically renewed twice daily"
}

# Run main function
main "$@"