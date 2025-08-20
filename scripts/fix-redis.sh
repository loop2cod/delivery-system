#!/bin/bash

# Fix Redis connection issue
# Usage: ./scripts/fix-redis.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Redis Connection Fix${NC}"
echo

echo -e "${YELLOW}Issue: Backend is connecting to IPv6 localhost instead of Redis container${NC}"
echo

# Check current backend environment
echo -e "${BLUE}Current backend Redis config:${NC}"
docker exec grs-backend env | grep REDIS

echo -e "\n${YELLOW}Step 1: Restart backend to refresh Redis connection...${NC}"
docker restart grs-backend

echo "Waiting 15 seconds for backend to restart..."
sleep 15

echo -e "\n${YELLOW}Step 2: Check if Redis connection is fixed...${NC}"
docker logs grs-backend --tail=10 | grep -i redis | tail -3

echo -e "\n${YELLOW}Step 3: Test Redis connection manually...${NC}"
docker exec grs-backend sh -c 'redis-cli -h redis -p 6379 -a redis123 ping' 2>/dev/null || echo "Redis connection test failed"

echo -e "\n${YELLOW}Step 4: Check backend API health...${NC}"
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✓ Backend API is healthy"
else
    echo "✗ Backend API still not responding"
    echo -e "\n${BLUE}Recent backend logs:${NC}"
    docker logs grs-backend --tail=5
fi

echo
echo -e "${GREEN}=== Next Steps ===${NC}"
echo "If Redis connection is still failing:"
echo "1. Check backend Redis configuration code"
echo "2. Restart all services: docker restart grs-backend grs-redis"
echo "3. Full rebuild: ./scripts/rebuild.sh --dev --clean"