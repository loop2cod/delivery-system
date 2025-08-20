#!/bin/bash

# Fix nginx network connectivity issue
# Usage: ./scripts/fix-nginx-network.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Fixing Nginx Network Connectivity${NC}"
echo

echo -e "${YELLOW}Issue: Nginx can't find backend/PWA containers by hostname${NC}"
echo -e "${YELLOW}Solution: Ensure all containers are on the same Docker network${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC_PROD="docker compose -f docker-compose.yml"
    DC_DEV="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
else
    DC_PROD="docker-compose -f docker-compose.yml"
    DC_DEV="docker-compose -f docker-compose.yml -f docker-compose.dev.yml"
fi

echo -e "${YELLOW}Step 1: Check current container network setup...${NC}"
echo -e "${BLUE}Current containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Networks}}\t{{.Status}}"

echo -e "\n${YELLOW}Step 2: Stop current development setup...${NC}"
$DC_DEV down

echo -e "\n${YELLOW}Step 3: Start production setup (which includes proper networking)...${NC}"
$DC_PROD up -d

echo "Waiting 30 seconds for all services to start..."
sleep 30

echo -e "\n${YELLOW}Step 4: Check container status...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n${YELLOW}Step 5: Check nginx logs...${NC}"
if docker ps | grep -q grs-nginx; then
    echo -e "${BLUE}Nginx logs (last 10 lines):${NC}"
    docker logs grs-nginx --tail=10
    
    if docker logs grs-nginx --tail=10 2>&1 | grep -q "host not found"; then
        echo -e "\n${RED}Nginx still has network issues${NC}"
        
        echo -e "\n${YELLOW}Step 5a: Debugging network connectivity...${NC}"
        echo "Checking if backend container is reachable from nginx:"
        if docker exec grs-nginx nslookup backend 2>/dev/null; then
            echo "✓ Backend is resolvable from nginx"
        else
            echo "✗ Backend is not resolvable from nginx"
        fi
        
        echo -e "\nChecking nginx network:"
        docker inspect grs-nginx | grep -A 10 "Networks"
        
        echo -e "\nChecking backend network:"
        docker inspect grs-backend | grep -A 10 "Networks"
        
    else
        echo -e "\n${GREEN}✓ Nginx appears to be working${NC}"
    fi
else
    echo -e "${RED}✗ Nginx container is not running${NC}"
fi

echo -e "\n${YELLOW}Step 6: Test domain connectivity...${NC}"
for port in 80 443; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is accessible"
    else
        echo "✗ Port $port is not accessible"
    fi
done

echo -e "\n${YELLOW}Step 7: Quick domain test...${NC}"
echo "Testing HTTP access:"
if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost" | grep -q "200\|301\|302"; then
    echo "✓ HTTP localhost responding"
else
    echo "✗ HTTP localhost not responding"
fi

echo -e "\n${GREEN}=== Summary ===${NC}"
echo "Switched from development to production Docker setup"
echo "Production setup ensures all containers are on the same network"
echo
echo "If nginx is still failing:"
echo "1. Check nginx config: docker exec grs-nginx nginx -t"
echo "2. Verify all containers are on grs-network: docker network ls"
echo "3. Manual network test: docker exec grs-nginx ping backend"