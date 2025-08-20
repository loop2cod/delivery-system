#!/bin/bash

# Apply Redis configuration fix
# Usage: ./scripts/apply-redis-fix.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Applying Redis Configuration Fix${NC}"
echo

echo -e "${YELLOW}The issue: Backend expects REDIS_HOST/REDIS_PORT but only REDIS_URL was provided${NC}"
echo -e "${YELLOW}The fix: Added REDIS_HOST, REDIS_PORT, REDIS_PASSWORD to docker-compose${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
else
    DC="docker-compose -f docker-compose.yml -f docker-compose.dev.yml"
fi

echo -e "${YELLOW}Step 1: Restart backend container with new environment...${NC}"
$DC up -d --force-recreate backend

echo "Waiting 20 seconds for backend to start..."
sleep 20

echo -e "\n${YELLOW}Step 2: Check if Redis connection is fixed...${NC}"
docker logs grs-backend --tail=10 | grep -E "(Redis|redis)" | tail -3

echo -e "\n${YELLOW}Step 3: Test backend API health...${NC}"
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✓ Backend API is healthy"
    BACKEND_HEALTHY=true
else
    echo "✗ Backend API still not responding"
    BACKEND_HEALTHY=false
fi

echo -e "\n${YELLOW}Step 4: Verify Redis connection from within container...${NC}"
docker exec grs-backend sh -c 'echo "Testing Redis connection..." && redis-cli -h redis -p 6379 -a redis123 ping' 2>/dev/null && echo "✓ Manual Redis test successful" || echo "✗ Manual Redis test failed"

if [ "$BACKEND_HEALTHY" = true ]; then
    echo -e "\n${GREEN}✅ Redis fix applied successfully!${NC}"
    echo -e "${BLUE}Backend should now connect to Redis container properly${NC}"
else
    echo -e "\n${RED}❌ Redis fix may not have resolved the issue${NC}"
    echo -e "${YELLOW}Check backend logs:${NC}"
    docker logs grs-backend --tail=5
fi

echo
echo -e "${GREEN}=== Next Steps ===${NC}"
echo "1. Monitor logs: docker logs grs-backend -f"
echo "2. Fix PWAs: ./scripts/fix-pwa.sh" 
echo "3. Check overall health: ./scripts/monitor.sh"