#!/bin/bash

# Rebuild containers with proper build artifacts
# Usage: ./scripts/rebuild-containers.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Rebuilding Containers with Proper Build Artifacts${NC}"
echo

echo -e "${YELLOW}Issue: Backend dist files are missing from Docker images${NC}"
echo -e "${YELLOW}Solution: Rebuild with proper TypeScript compilation${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml"
else
    DC="docker-compose -f docker-compose.yml"
fi

echo -e "${YELLOW}Step 1: Stop all containers...${NC}"
$DC down

echo -e "\n${YELLOW}Step 2: Clean up old images and build cache...${NC}"
# Remove old images to force complete rebuild
docker rmi delivery-system-backend delivery-system-public-pwa delivery-system-admin-pwa delivery-system-business-pwa delivery-system-driver-pwa 2>/dev/null || true

# Clean build cache
docker builder prune -f

echo -e "\n${YELLOW}Step 3: Rebuild images with verbose output...${NC}"
echo "This may take several minutes as it rebuilds everything from scratch..."
$DC build --no-cache --progress=plain

echo -e "\n${YELLOW}Step 4: Verify build artifacts exist...${NC}"
echo "Checking if backend dist files were created:"
if docker run --rm delivery-system-backend ls -la backend/dist 2>/dev/null; then
    echo "✓ Backend dist files now exist"
    BACKEND_OK=true
else
    echo "✗ Backend dist files still missing"
    BACKEND_OK=false
fi

echo -e "\nChecking PWA build files:"
if docker run --rm delivery-system-public-pwa ls -la .next 2>/dev/null | head -3; then
    echo "✓ PWA build files exist"
    PWA_OK=true
else
    echo "✗ PWA build files missing"
    PWA_OK=false
fi

if [ "$BACKEND_OK" = true ] && [ "$PWA_OK" = true ]; then
    echo -e "\n${GREEN}✓ All build artifacts verified!${NC}"
    
    echo -e "\n${YELLOW}Step 5: Start services in order...${NC}"
    
    echo "Starting databases..."
    $DC up -d mongodb redis
    sleep 10
    
    echo "Starting backend..."
    $DC up -d backend
    sleep 15
    
    # Check if backend is actually running this time
    if docker ps | grep -q grs-backend && ! docker ps | grep -q "Restarting"; then
        echo "✓ Backend is running stable"
        
        echo -e "\nChecking backend logs:"
        docker logs grs-backend --tail=5
        
        echo -e "\nStarting PWA applications..."
        $DC up -d public-pwa admin-pwa business-pwa driver-pwa
        sleep 15
        
        echo -e "\nStarting nginx..."
        $DC up -d nginx
        sleep 10
        
        echo -e "\n${YELLOW}Step 6: Final system check...${NC}"
        echo -e "${BLUE}Container status:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        
        echo -e "\n${BLUE}Port check:${NC}"
        for port in 80 443 3000; do
            if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
                echo "✓ Port $port is accessible"
            else
                echo "✗ Port $port is not accessible"
            fi
        done
        
        echo -e "\n${BLUE}HTTP test:${NC}"
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost" | grep -q "200\|301\|302\|404"; then
            echo "✓ HTTP is responding"
        else
            echo "✗ HTTP not responding"
        fi
        
        echo -e "\n${GREEN}🎉 System should now be fully operational!${NC}"
        echo "Your domains should be accessible:"
        echo "  • https://grsdeliver.com"
        echo "  • https://admin.grsdeliver.com"
        echo "  • https://business.grsdeliver.com"
        echo "  • https://driver.grsdeliver.com"
        echo "  • https://api.grsdeliver.com"
        
    else
        echo -e "\n${RED}✗ Backend is still failing${NC}"
        echo "Backend logs:"
        docker logs grs-backend --tail=10
    fi
    
else
    echo -e "\n${RED}✗ Build artifacts are still missing${NC}"
    echo "The Docker build process is not creating the required files."
    echo "This could be due to:"
    echo "1. TypeScript compilation errors"
    echo "2. Missing dependencies in package.json"
    echo "3. Build script issues"
    echo "4. Dockerfile configuration problems"
    
    echo -e "\nTo debug further:"
    echo "1. Check build logs: docker-compose -f docker-compose.yml build backend 2>&1 | grep -i error"
    echo "2. Examine Dockerfile build stages"
    echo "3. Verify package.json build scripts"
fi

echo -e "\n${GREEN}=== Build Complete ===${NC}"