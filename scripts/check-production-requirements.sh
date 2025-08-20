#!/bin/bash

# Check what's needed for production HTTPS domains
# Usage: ./scripts/check-production-requirements.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Production HTTPS Requirements Check${NC}"
echo

echo -e "${YELLOW}=== 1. Nginx Container Status ===${NC}"
if docker ps | grep -q grs-nginx; then
    echo "✓ Nginx container is running"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx
else
    echo "✗ Nginx container is NOT running"
    echo "  → Need to start nginx for HTTPS domains"
fi

echo -e "\n${YELLOW}=== 2. Port Accessibility ===${NC}"
for port in 80 443; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is accessible"
    else
        echo "✗ Port $port is not accessible"
    fi
done

echo -e "\n${YELLOW}=== 3. Nginx Configuration Files ===${NC}"
configs=("nginx/nginx.conf" "nginx/sites-available" "nginx/ssl")
for config in "${configs[@]}"; do
    if [ -e "$config" ]; then
        echo "✓ $config exists"
        if [ -d "$config" ]; then
            count=$(find "$config" -type f 2>/dev/null | wc -l)
            echo "  → Contains $count files"
        fi
    else
        echo "✗ $config missing"
    fi
done

echo -e "\n${YELLOW}=== 4. SSL Certificates ===${NC}"
if [ -d "nginx/ssl" ]; then
    cert_count=$(ls nginx/ssl/*.crt 2>/dev/null | wc -l)
    key_count=$(ls nginx/ssl/*.key 2>/dev/null | wc -l)
    echo "Certificates found: $cert_count"
    echo "Private keys found: $key_count"
    
    if [ $cert_count -gt 0 ]; then
        echo -e "\n${BLUE}Certificate details:${NC}"
        for cert in nginx/ssl/*.crt; do
            if [ -f "$cert" ]; then
                domain=$(basename "$cert" .crt)
                echo "  • $domain"
                # Check certificate expiry
                if command -v openssl >/dev/null 2>&1; then
                    expiry=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | cut -d= -f2)
                    if [ -n "$expiry" ]; then
                        echo "    Expires: $expiry"
                    fi
                fi
            fi
        done
    fi
else
    echo "✗ No SSL directory found"
fi

echo -e "\n${YELLOW}=== 5. Domain DNS Resolution ===${NC}"
domains=("grsdeliver.com" "admin.grsdeliver.com" "business.grsdeliver.com" "driver.grsdeliver.com" "api.grsdeliver.com")

for domain in "${domains[@]}"; do
    echo -n "Checking $domain... "
    if nslookup "$domain" >/dev/null 2>&1; then
        ip=$(nslookup "$domain" 2>/dev/null | grep -A1 "Name:" | grep "Address:" | head -1 | awk '{print $2}')
        echo "✓ Resolves to $ip"
    else
        echo "✗ DNS resolution failed"
    fi
done

echo -e "\n${YELLOW}=== 6. Server Public IP ===${NC}"
public_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
if [ -n "$public_ip" ]; then
    echo "Server public IP: $public_ip"
else
    echo "Unable to determine public IP"
fi

echo -e "\n${YELLOW}=== 7. Firewall Status ===${NC}"
if command -v ufw >/dev/null 2>&1; then
    ufw_status=$(sudo ufw status 2>/dev/null | head -1)
    echo "UFW: $ufw_status"
    
    if echo "$ufw_status" | grep -q "active"; then
        echo "Checking HTTP/HTTPS rules:"
        sudo ufw status | grep -E "(80|443|Nginx)"
    fi
else
    echo "UFW not available"
fi

echo -e "\n${GREEN}=== Action Items ===${NC}"
echo "To enable HTTPS domain access:"
echo
echo "1. Start nginx (if not running):"
echo "   ./scripts/setup-https.sh"
echo
echo "2. If nginx configs are missing:"
echo "   Check nginx/nginx.conf and nginx/sites-available/"
echo
echo "3. If SSL certificates are missing:"
echo "   Generate SSL certificates for your domains"
echo
echo "4. Verify DNS points to this server:"
echo "   Make sure domains resolve to: $public_ip"
echo
echo "5. Check firewall allows ports 80 and 443:"
echo "   sudo ufw allow 'Nginx Full'"