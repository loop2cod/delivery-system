#!/bin/bash

# Diagnose nginx startup issues
# Usage: ./scripts/diagnose-nginx.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Diagnosing Nginx Startup Issues${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml"
else
    DC="docker-compose -f docker-compose.yml"
fi

echo -e "${YELLOW}Step 1: Check all container status...${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${YELLOW}Step 2: Check nginx container specifically...${NC}"
nginx_status=$(docker ps -a --format "{{.Names}}\t{{.Status}}" | grep nginx || echo "nginx container not found")
echo "Nginx status: $nginx_status"

echo -e "\n${YELLOW}Step 3: Check nginx logs...${NC}"
if docker ps -a --format "{{.Names}}" | grep -q grs-nginx; then
    echo -e "${BLUE}All nginx logs:${NC}"
    docker logs grs-nginx 2>&1 | tail -20
    
    echo -e "\n${BLUE}Error messages only:${NC}"
    docker logs grs-nginx 2>&1 | grep -E "(error|Error|ERROR|emerg|alert|crit)" | tail -10
else
    echo "No nginx container found"
fi

echo -e "\n${YELLOW}Step 4: Check nginx configuration files...${NC}"
if [ -f "nginx/nginx.conf" ]; then
    echo "✓ nginx.conf exists"
    echo "Checking for syntax issues:"
    # Test nginx config syntax by running nginx -t in a temporary container
    docker run --rm -v "$PWD/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>&1 | head -5
else
    echo "✗ nginx.conf missing"
fi

echo -e "\n${YELLOW}Step 5: Check nginx upstream dependencies...${NC}"
echo "Checking if required containers are running:"

required_containers=("grs-backend" "grs-public-pwa" "grs-admin-pwa" "grs-business-pwa" "grs-driver-pwa")
all_running=true

for container in "${required_containers[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "$container"; then
        echo "✓ $container is running"
    else
        echo "✗ $container is not running"
        all_running=false
    fi
done

echo -e "\n${YELLOW}Step 6: Check Docker networks...${NC}"
echo -e "${BLUE}Available networks:${NC}"
docker network ls

echo -e "\n${BLUE}grs-network details:${NC}"
if docker network ls | grep -q grs-network; then
    docker network inspect grs-network | grep -A 5 "Containers"
else
    echo "grs-network not found"
fi

echo -e "\n${YELLOW}Step 7: Try starting nginx manually...${NC}"
if [ "$all_running" = true ]; then
    echo "All dependencies are running. Trying to start nginx..."
    $DC up -d nginx
    
    sleep 5
    
    if docker ps | grep -q grs-nginx; then
        echo "✓ Nginx started successfully"
        docker logs grs-nginx --tail=5
    else
        echo "✗ Nginx failed to start"
        echo -e "\n${BLUE}Recent nginx logs:${NC}"
        docker logs grs-nginx --tail=10
    fi
else
    echo "Some dependencies are missing. Starting them first..."
    echo "Starting backend and PWA containers:"
    $DC up -d mongodb redis backend public-pwa admin-pwa business-pwa driver-pwa
    
    echo "Waiting 20 seconds for dependencies..."
    sleep 20
    
    echo "Now trying to start nginx:"
    $DC up -d nginx
    
    sleep 5
    
    if docker ps | grep -q grs-nginx; then
        echo "✓ Nginx started successfully"
    else
        echo "✗ Nginx still failed to start"
        echo -e "\n${BLUE}Final nginx logs:${NC}"
        docker logs grs-nginx 2>&1 | tail -10
    fi
fi

echo -e "\n${GREEN}=== Diagnosis Summary ===${NC}"
if docker ps | grep -q grs-nginx; then
    echo "✅ Nginx is now running"
    echo "Testing ports:"
    for port in 80 443; do
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            echo "✓ Port $port is accessible"
        else
            echo "✗ Port $port is not accessible"
        fi
    done
else
    echo "❌ Nginx is still not running"
    echo "Common fixes:"
    echo "1. Check nginx.conf syntax"
    echo "2. Ensure all upstream containers are running"
    echo "3. Check Docker network connectivity"
    echo "4. Review nginx container logs for specific errors"
fi