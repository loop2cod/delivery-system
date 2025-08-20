#!/bin/bash

# Setup HTTPS domains for production access
# Usage: ./scripts/setup-https.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Setting Up HTTPS Domain Access${NC}"
echo

echo -e "${YELLOW}Issue: Development setup only exposes individual ports${NC}"
echo -e "${YELLOW}Solution: Start nginx reverse proxy for production domains${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml"
else
    DC="docker-compose -f docker-compose.yml"
fi

echo -e "${YELLOW}Step 1: Check current nginx status...${NC}"
if docker ps | grep -q grs-nginx; then
    echo "✓ Nginx is already running"
    NGINX_RUNNING=true
else
    echo "✗ Nginx is not running"
    NGINX_RUNNING=false
fi

if [ "$NGINX_RUNNING" = false ]; then
    echo -e "\n${YELLOW}Step 2: Starting nginx reverse proxy...${NC}"
    $DC up -d nginx
    
    echo "Waiting 10 seconds for nginx to start..."
    sleep 10
    
    if docker ps | grep -q grs-nginx; then
        echo "✓ Nginx started successfully"
    else
        echo "✗ Nginx failed to start"
        echo "Checking nginx logs:"
        docker logs grs-nginx --tail=5
        exit 1
    fi
fi

echo -e "\n${YELLOW}Step 3: Verify nginx configuration...${NC}"

# Check if nginx config files exist
if [ -f "nginx/nginx.conf" ]; then
    echo "✓ nginx.conf exists"
else
    echo "✗ nginx.conf missing"
fi

if [ -d "nginx/sites-available" ]; then
    echo "✓ sites-available directory exists"
else
    echo "✗ sites-available directory missing"
fi

if [ -d "nginx/ssl" ]; then
    echo "✓ SSL directory exists"
    SSL_FILES=$(ls nginx/ssl/*.crt 2>/dev/null | wc -l)
    echo "  SSL certificates found: $SSL_FILES"
else
    echo "✗ SSL directory missing"
fi

echo -e "\n${YELLOW}Step 4: Check port bindings...${NC}"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep nginx

echo -e "\n${YELLOW}Step 5: Test domain accessibility...${NC}"

# Test each domain
domains=("grsdeliver.com" "admin.grsdeliver.com" "business.grsdeliver.com" "driver.grsdeliver.com" "api.grsdeliver.com")

for domain in "${domains[@]}"; do
    echo -n "Testing $domain... "
    
    # Test HTTP first (should redirect to HTTPS)
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://$domain" | grep -q "200\|301\|302"; then
        echo "✓ HTTP responding"
    else
        echo "✗ HTTP not responding"
    fi
    
    # Test HTTPS
    echo -n "  HTTPS $domain... "
    if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -k "https://$domain" | grep -q "200\|301\|302"; then
        echo "✓ HTTPS responding"
    else
        echo "✗ HTTPS not responding"
    fi
done

echo -e "\n${YELLOW}Step 6: Check nginx logs...${NC}"
echo -e "${BLUE}Recent nginx logs:${NC}"
docker logs grs-nginx --tail=10

echo -e "\n${GREEN}=== Troubleshooting Guide ===${NC}"
echo "If domains are still not accessible:"
echo
echo "1. Check nginx configuration:"
echo "   docker exec grs-nginx nginx -t"
echo
echo "2. Verify domain DNS points to this server:"
echo "   nslookup grsdeliver.com"
echo
echo "3. Check nginx logs:"
echo "   docker logs grs-nginx -f"
echo
echo "4. Verify SSL certificates:"
echo "   ls -la nginx/ssl/"
echo
echo "5. Check firewall settings:"
echo "   sudo ufw status"
echo "   sudo netstat -tlnp | grep :80"
echo "   sudo netstat -tlnp | grep :443"