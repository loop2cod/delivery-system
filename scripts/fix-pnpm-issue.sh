#!/bin/bash

# Fix the pnpm not found issue
# Usage: ./scripts/fix-pnpm-issue.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Fixing PNPM Issue in Development Containers${NC}"
echo

echo -e "${YELLOW}The issue: Development containers were using production Docker targets without pnpm${NC}"
echo -e "${YELLOW}The fix: Updated dev compose to use 'base' target and npm commands${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
else
    DC="docker-compose -f docker-compose.yml -f docker-compose.dev.yml"
fi

echo -e "${YELLOW}Step 1: Stop all containers...${NC}"
$DC down

echo -e "\n${YELLOW}Step 2: Rebuild containers with base target (includes pnpm)...${NC}"
$DC build --no-cache

echo -e "\n${YELLOW}Step 3: Start databases first...${NC}"
$DC up -d mongodb redis
echo "Waiting 10 seconds for databases..."
sleep 10

echo -e "\n${YELLOW}Step 4: Start backend...${NC}"
$DC up -d backend
echo "Waiting 15 seconds for backend..."
sleep 15

# Check backend logs
echo -e "\n${BLUE}Backend startup logs:${NC}"
docker logs grs-backend --tail=5

echo -e "\n${YELLOW}Step 5: Start one PWA to test...${NC}"
$DC up -d public-pwa
echo "Waiting 10 seconds for PWA..."
sleep 10

# Check PWA logs
echo -e "\n${BLUE}Public PWA startup logs:${NC}"
docker logs grs-public-pwa --tail=5

echo -e "\n${YELLOW}Step 6: Health check...${NC}"

# Check container status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep grs

# Check API health
echo -e "\n${BLUE}API Health Check:${NC}"
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✓ Backend API is healthy"
    BACKEND_HEALTHY=true
else
    echo "✗ Backend API not responding"
    BACKEND_HEALTHY=false
fi

# Check ports
echo -e "\n${BLUE}Port Check:${NC}"
for port in 3000 3001; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

if [ "$BACKEND_HEALTHY" = true ]; then
    echo -e "\n${GREEN}✅ PNPM issue appears to be fixed!${NC}"
    echo -e "${BLUE}Starting remaining PWA containers...${NC}"
    $DC up -d admin-pwa business-pwa driver-pwa
else
    echo -e "\n${RED}❌ Backend still has issues${NC}"
    echo -e "${YELLOW}Check detailed logs:${NC}"
    docker logs grs-backend --tail=10
fi

echo
echo -e "${GREEN}=== Summary ===${NC}"
echo "Fixed development container commands to use npm instead of pnpm"
echo "All containers now use the 'base' Docker target which includes pnpm in build but uses npm for runtime"