#!/bin/bash

# Fix Docker network mismatch issues
# Usage: ./scripts/fix-network-mismatch.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Fixing Docker Network Mismatch${NC}"
echo

echo -e "${YELLOW}Issues detected:${NC}"
echo "1. Containers are on 'delivery-system_grs-network' but nginx expects 'grs-network'"
echo "2. All application containers are restarting continuously"
echo "3. Network configuration mismatch between dev and prod setups"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml"
else
    DC="docker-compose -f docker-compose.yml"
fi

echo -e "${YELLOW}Step 1: Clean shutdown of all containers...${NC}"
# Stop all delivery-related containers
docker stop $(docker ps -q --filter "name=grs-") 2>/dev/null || true
docker rm $(docker ps -aq --filter "name=grs-") 2>/dev/null || true

echo -e "\n${YELLOW}Step 2: Clean up networks...${NC}"
# Remove old networks
docker network rm delivery-system_grs-network 2>/dev/null || true
docker network rm grs-network 2>/dev/null || true

echo -e "\n${YELLOW}Step 3: Clean up volumes (keeping data)...${NC}"
# Don't remove data volumes, just unused ones
docker volume prune -f

echo -e "\n${YELLOW}Step 4: Restart with fresh production setup...${NC}"
# Start with production configuration which creates proper networks
echo "Creating services in order..."

echo "  Starting databases..."
$DC up -d mongodb redis
echo "  Waiting 10 seconds for databases..."
sleep 10

echo "  Starting backend..."
$DC up -d backend
echo "  Waiting 15 seconds for backend..."
sleep 15

# Check if backend is actually working before proceeding
echo "  Checking backend health..."
if docker logs grs-backend --tail=5 | grep -q "error\|Error\|ERROR"; then
    echo -e "${RED}Backend has errors. Checking logs:${NC}"
    docker logs grs-backend --tail=10
    
    echo -e "\n${YELLOW}Attempting backend restart...${NC}"
    docker restart grs-backend
    sleep 10
fi

echo "  Starting PWA applications..."
$DC up -d public-pwa admin-pwa business-pwa driver-pwa
echo "  Waiting 15 seconds for PWAs..."
sleep 15

echo -e "\n${YELLOW}Step 5: Check application container health...${NC}"
echo -e "${BLUE}Container status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check if any containers are still restarting
restarting_containers=$(docker ps --format "{{.Names}}\t{{.Status}}" | grep -c "Restarting" || echo "0")
if [ "$restarting_containers" -gt "0" ]; then
    echo -e "\n${RED}Warning: $restarting_containers containers are still restarting${NC}"
    echo "Waiting additional 20 seconds..."
    sleep 20
    
    echo "Final container status:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

echo -e "\n${YELLOW}Step 6: Check networks...${NC}"
echo -e "${BLUE}Available networks:${NC}"
docker network ls

echo -e "\n${BLUE}Network inspection:${NC}"
# Check which network was created
if docker network ls | grep -q "grs-network"; then
    network_name="grs-network"
elif docker network ls | grep -q "delivery-system_grs-network"; then
    network_name="delivery-system_grs-network"
else
    echo "No grs network found"
    network_name=""
fi

if [ -n "$network_name" ]; then
    echo "Using network: $network_name"
    echo "Containers on this network:"
    docker network inspect "$network_name" | grep -A 20 "Containers" | grep "Name"
fi

echo -e "\n${YELLOW}Step 7: Start nginx...${NC}"
if [ "$restarting_containers" -eq "0" ]; then
    echo "All containers are stable. Starting nginx..."
    $DC up -d nginx
    
    sleep 10
    
    if docker ps | grep -q grs-nginx; then
        echo -e "${GREEN}✓ Nginx started successfully!${NC}"
        
        echo -e "\n${BLUE}Testing ports:${NC}"
        for port in 80 443; do
            if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
                echo "✓ Port $port is accessible"
            else
                echo "✗ Port $port is not accessible"
            fi
        done
        
        echo -e "\n${BLUE}Testing HTTP response:${NC}"
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "http://localhost" | grep -q "200\|301\|302\|404"; then
            echo "✓ HTTP is responding"
        else
            echo "✗ HTTP not responding"
        fi
        
    else
        echo -e "${RED}✗ Nginx failed to start${NC}"
        echo "Nginx logs:"
        docker logs grs-nginx --tail=10
    fi
else
    echo -e "${RED}Skipping nginx start - some containers are still unstable${NC}"
    echo "Wait for all containers to be stable, then run:"
    echo "  docker compose -f docker-compose.yml up -d nginx"
fi

echo -e "\n${GREEN}=== Final Status ===${NC}"
all_containers=$(docker ps --format "{{.Names}}" | grep -c grs)
healthy_containers=$(docker ps --format "{{.Names}}\t{{.Status}}" | grep grs | grep -c "Up")

echo "Total containers: $all_containers"
echo "Healthy containers: $healthy_containers"

if [ "$healthy_containers" -ge "7" ] && docker ps | grep -q grs-nginx; then
    echo -e "\n${GREEN}🎉 All systems operational!${NC}"
    echo "Your domains should now be accessible:"
    echo "  • https://grsdeliver.com"
    echo "  • https://admin.grsdeliver.com"  
    echo "  • https://business.grsdeliver.com"
    echo "  • https://driver.grsdeliver.com"
    echo "  • https://api.grsdeliver.com"
else
    echo -e "\n${YELLOW}⚠ System partially operational${NC}"
    echo "Some containers may still be starting up."
    echo "Monitor with: docker ps"
    echo "Check logs with: docker logs grs-[container-name]"
fi