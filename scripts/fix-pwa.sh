#!/bin/bash

# Fix PWA containers that are restarting
# Usage: ./scripts/fix-pwa.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}PWA Container Fix${NC}"
echo

echo -e "${YELLOW}Issue: All PWA containers are continuously restarting${NC}"
echo

# Check current PWA status
echo -e "${BLUE}Current PWA container status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep pwa

echo -e "\n${YELLOW}Step 1: Get detailed logs from failing PWAs...${NC}"
for pwa in public admin business driver; do
    echo -e "\n${BLUE}${pwa^} PWA detailed logs:${NC}"
    docker logs "grs-${pwa}-pwa" --tail=10 2>/dev/null || echo "No logs available"
done

echo -e "\n${YELLOW}Step 2: Stop all PWA containers...${NC}"
docker stop grs-public-pwa grs-admin-pwa grs-business-pwa grs-driver-pwa 2>/dev/null

echo -e "\n${YELLOW}Step 3: Remove failed PWA containers...${NC}"
docker rm grs-public-pwa grs-admin-pwa grs-business-pwa grs-driver-pwa 2>/dev/null

echo -e "\n${YELLOW}Step 4: Restart PWA containers one by one...${NC}"

# Use correct docker-compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
else
    DC="docker-compose -f docker-compose.yml -f docker-compose.dev.yml"
fi

for pwa in public-pwa admin-pwa business-pwa driver-pwa; do
    echo -e "\nStarting ${pwa}..."
    $DC up -d $pwa
    sleep 5
    
    # Check if it's running
    if docker ps | grep -q "grs-${pwa}"; then
        echo "✓ ${pwa} is running"
    else
        echo "✗ ${pwa} failed to start"
        echo "Recent logs:"
        docker logs "grs-${pwa}" --tail=3 2>/dev/null
    fi
done

echo -e "\n${YELLOW}Step 5: Final status check...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep pwa

echo -e "\n${YELLOW}Step 6: Check ports...${NC}"
for port in 3001 3002 3003 3004; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

echo
echo -e "${GREEN}=== Next Steps ===${NC}"
echo "If PWAs are still failing:"
echo "1. Check specific logs: docker logs grs-[pwa-name] -f"
echo "2. Rebuild PWA images: ./scripts/rebuild.sh --dev --clean"
echo "3. Check Dockerfile and package.json in PWA packages"