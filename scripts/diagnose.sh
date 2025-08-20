#!/bin/bash

# Diagnostic script for container issues
# Usage: ./scripts/diagnose.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Container Diagnostics${NC}"
echo

# Check container status
echo -e "${YELLOW}=== Container Status ===${NC}"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo -e "${YELLOW}=== Recent Container Logs ===${NC}"

# Check backend logs
echo -e "\n${BLUE}Backend logs:${NC}"
docker logs grs-backend --tail=5 2>/dev/null || echo "Backend container not found"

# Check Redis logs  
echo -e "\n${BLUE}Redis logs:${NC}"
docker logs grs-redis --tail=5 2>/dev/null || echo "Redis container not found"

# Check MongoDB logs
echo -e "\n${BLUE}MongoDB logs:${NC}"
docker logs grs-mongodb --tail=5 2>/dev/null || echo "MongoDB container not found"

# Check PWA logs
for pwa in public admin business driver; do
    echo -e "\n${BLUE}${pwa^} PWA logs:${NC}"
    docker logs "grs-${pwa}-pwa" --tail=3 2>/dev/null || echo "${pwa^} PWA container not found"
done

echo
echo -e "${YELLOW}=== Network Connectivity ===${NC}"

# Check if containers can reach each other
echo -e "\nTesting backend -> redis connection:"
docker exec grs-backend ping -c 1 redis 2>/dev/null && echo "✓ Can reach redis" || echo "✗ Cannot reach redis"

echo -e "\nTesting backend -> mongodb connection:"
docker exec grs-backend ping -c 1 mongodb 2>/dev/null && echo "✓ Can reach mongodb" || echo "✗ Cannot reach mongodb"

echo
echo -e "${YELLOW}=== Environment Variables ===${NC}"
echo -e "\nBackend environment:"
docker exec grs-backend env | grep -E "(REDIS|MONGO|NODE_ENV)" | head -5

echo
echo -e "${YELLOW}=== Quick Fixes ===${NC}"
echo "1. Restart failing containers:"
echo "   docker restart grs-public-pwa grs-admin-pwa grs-business-pwa"
echo
echo "2. Check detailed logs:"
echo "   docker logs grs-backend -f"
echo "   docker logs grs-public-pwa -f"
echo
echo "3. Rebuild with clean cache:"
echo "   ./scripts/rebuild.sh --dev --clean"