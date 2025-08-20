#!/bin/bash

# Quick fix script for common container issues
# Usage: ./scripts/fix.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Container Quick Fix${NC}"
echo

echo -e "${YELLOW}Step 1: Restarting failing PWA containers...${NC}"
docker restart grs-public-pwa grs-admin-pwa grs-business-pwa grs-driver-pwa 2>/dev/null || true

echo "Waiting 10 seconds..."
sleep 10

echo -e "${YELLOW}Step 2: Checking container status...${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep grs

echo
echo -e "${YELLOW}Step 3: Testing Redis connection fix...${NC}"

# Check if Redis is accessible from backend
if docker exec grs-backend ping -c 1 redis >/dev/null 2>&1; then
    echo "✓ Backend can reach Redis container"
else
    echo "✗ Backend cannot reach Redis container"
    echo "  Restarting backend to refresh network..."
    docker restart grs-backend
    sleep 5
fi

echo
echo -e "${YELLOW}Step 4: Checking port accessibility...${NC}"
for port in 3000 3001 3002 3003 3004; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

echo
echo -e "${YELLOW}Step 5: Quick health check...${NC}"
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✓ Backend API is healthy"
else
    echo "✗ Backend API is not responding"
    echo "  Backend logs (last 3 lines):"
    docker logs grs-backend --tail=3
fi

echo
echo -e "${GREEN}=== Summary ===${NC}"
echo "If issues persist:"
echo "1. Run: ./scripts/diagnose.sh"
echo "2. Check logs: docker logs grs-[service-name] -f"
echo "3. Full rebuild: ./scripts/rebuild.sh --dev --clean"