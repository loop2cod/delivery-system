#!/bin/bash

# Diagnose why containers keep restarting
# Usage: ./scripts/diagnose-restarts.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Diagnosing Container Restart Issues${NC}"
echo

echo -e "${YELLOW}Step 1: Check all container exit codes...${NC}"
containers=("grs-backend" "grs-public-pwa" "grs-admin-pwa" "grs-business-pwa" "grs-driver-pwa")

for container in "${containers[@]}"; do
    echo -e "\n${BLUE}$container:${NC}"
    
    # Get exit code
    exit_code=$(docker inspect "$container" --format='{{.State.ExitCode}}' 2>/dev/null || echo "N/A")
    echo "Exit code: $exit_code"
    
    # Get recent logs
    echo "Recent logs:"
    docker logs "$container" --tail=5 2>&1 | sed 's/^/  /'
done

echo -e "\n${YELLOW}Step 2: Check Docker image build issues...${NC}"
echo "Checking if images were built correctly:"
docker images | grep delivery-system

echo -e "\n${YELLOW}Step 3: Test backend container manually...${NC}"
echo "Stopping current backend..."
docker stop grs-backend 2>/dev/null || true
docker rm grs-backend 2>/dev/null || true

echo "Starting backend manually with detailed output..."
docker run -d \
  --name grs-backend-test \
  --network delivery-system_grs-network \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e REDIS_HOST=redis \
  -e REDIS_PORT=6379 \
  -e REDIS_PASSWORD=redis123 \
  -e MONGODB_URI=mongodb://admin:password123@mongodb:27017/grs_delivery?authSource=admin \
  delivery-system-backend

sleep 5

echo "Manual backend test status:"
if docker ps | grep -q grs-backend-test; then
    echo "✓ Backend test container is running"
    echo "Test logs:"
    docker logs grs-backend-test --tail=10
else
    echo "✗ Backend test container failed"
    echo "Failure logs:"
    docker logs grs-backend-test 2>&1 | tail -10
fi

echo -e "\n${YELLOW}Step 4: Check PWA container manually...${NC}"
echo "Testing public PWA manually..."
docker run -d \
  --name grs-public-pwa-test \
  --network delivery-system_grs-network \
  -p 3001:3001 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_API_URL=https://api.grsdeliver.com \
  delivery-system-public-pwa

sleep 5

echo "Manual PWA test status:"
if docker ps | grep -q grs-public-pwa-test; then
    echo "✓ PWA test container is running"
    echo "Test logs:"
    docker logs grs-public-pwa-test --tail=10
else
    echo "✗ PWA test container failed"
    echo "Failure logs:"
    docker logs grs-public-pwa-test 2>&1 | tail -10
fi

echo -e "\n${YELLOW}Step 5: Check base requirements...${NC}"

echo "Checking if containers have required files:"
echo "Backend dist files:"
if docker run --rm delivery-system-backend ls -la backend/dist 2>/dev/null; then
    echo "✓ Backend dist files exist"
else
    echo "✗ Backend dist files missing"
fi

echo -e "\nPWA build files:"
if docker run --rm delivery-system-public-pwa ls -la .next 2>/dev/null | head -5; then
    echo "✓ PWA build files exist"
else
    echo "✗ PWA build files missing"
fi

echo -e "\n${YELLOW}Step 6: Check if build completed properly...${NC}"
echo "Checking Docker build logs..."
# This would show if there were build issues, but build logs aren't persistent
echo "Rebuild containers to check for build issues:"
echo "  docker-compose -f docker-compose.yml build --no-cache"

echo -e "\n${YELLOW}Step 7: Clean up test containers...${NC}"
docker stop grs-backend-test grs-public-pwa-test 2>/dev/null || true
docker rm grs-backend-test grs-public-pwa-test 2>/dev/null || true

echo -e "\n${GREEN}=== Diagnosis Summary ===${NC}"
echo "Common causes of container restarts:"
echo "1. Missing or corrupt build artifacts (dist/, .next/)"
echo "2. Node.js application errors on startup"
echo "3. Port conflicts or networking issues"
echo "4. Missing dependencies or environment variables"
echo "5. Insufficient resources (memory/CPU)"
echo
echo "Recommended fixes:"
echo "1. Rebuild images: docker-compose -f docker-compose.yml build --no-cache"
echo "2. Check individual container logs: docker logs [container-name] -f"
echo "3. Try starting containers individually to isolate issues"
echo "4. Verify that build artifacts exist in images"