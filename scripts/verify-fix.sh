#!/bin/bash

# Verify that all systems are working correctly
# Usage: ./scripts/verify-fix.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}System Verification${NC}"
echo

echo -e "${YELLOW}=== Container Status ===${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep grs

echo -e "\n${YELLOW}=== Port Accessibility ===${NC}"
for port in 3000 3001 3002 3003 3004; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

echo -e "\n${YELLOW}=== API Health Checks ===${NC}"

# Backend API
if curl -f -s http://localhost:3000/health >/dev/null 2>&1; then
    echo "✓ Backend API (port 3000) is healthy"
else
    echo "✗ Backend API (port 3000) not responding"
fi

# PWA Health checks
for port in 3001 3002 3003 3004; do
    if curl -f -s http://localhost:$port >/dev/null 2>&1; then
        echo "✓ PWA on port $port is responding"
    else
        echo "✗ PWA on port $port not responding"
    fi
done

echo -e "\n${YELLOW}=== Database Connectivity ===${NC}"

# Test Redis
if docker exec grs-redis redis-cli -a redis123 ping >/dev/null 2>&1; then
    echo "✓ Redis is accessible and responding"
else
    echo "✗ Redis connection failed"
fi

# Test MongoDB
if docker exec grs-mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "✓ MongoDB is accessible and responding"
else
    echo "✗ MongoDB connection failed"
fi

echo -e "\n${YELLOW}=== Recent Logs Check ===${NC}"
echo -e "${BLUE}Backend logs (last 3 lines):${NC}"
docker logs grs-backend --tail=3 2>/dev/null | tail -3

echo -e "\n${BLUE}Public PWA logs (last 2 lines):${NC}"
docker logs grs-public-pwa --tail=2 2>/dev/null | tail -2

echo -e "\n${GREEN}=== System Status Summary ===${NC}"
TOTAL_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -c grs)
RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}\t{{.Status}}" | grep grs | grep -c "Up")

echo "Total GRS containers: $TOTAL_CONTAINERS"
echo "Running containers: $RUNNING_CONTAINERS"

if [ "$RUNNING_CONTAINERS" -eq "$TOTAL_CONTAINERS" ] && [ "$TOTAL_CONTAINERS" -ge "4" ]; then
    echo -e "\n${GREEN}🎉 All systems are operational!${NC}"
    echo -e "${BLUE}Your delivery management system is ready to use:${NC}"
    echo "  • Backend API: http://localhost:3000"
    echo "  • Public PWA: http://localhost:3001"
    echo "  • Admin PWA: http://localhost:3002"  
    echo "  • Business PWA: http://localhost:3003"
    echo "  • Driver PWA: http://localhost:3004"
else
    echo -e "\n${YELLOW}⚠ Some containers may still be starting up${NC}"
    echo "Run this script again in 30 seconds if containers are still starting"
fi