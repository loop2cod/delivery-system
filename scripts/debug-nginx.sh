#!/bin/bash

# Debug nginx HTTP/HTTPS issues
# Usage: ./scripts/debug-nginx.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Debugging Nginx HTTP/HTTPS Issues${NC}"
echo

echo -e "${YELLOW}Step 1: Check nginx container status...${NC}"
if docker ps | grep -q grs-nginx; then
    echo "✓ Nginx container is running"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep nginx
else
    echo "✗ Nginx container is not running"
    exit 1
fi

echo -e "\n${YELLOW}Step 2: Check nginx logs for errors...${NC}"
echo -e "${BLUE}Recent nginx logs:${NC}"
docker logs grs-nginx --tail=20

echo -e "\n${BLUE}Nginx errors only:${NC}"
docker logs grs-nginx 2>&1 | grep -i error | tail -10

echo -e "\n${YELLOW}Step 3: Test nginx configuration...${NC}"
echo "Testing nginx config syntax:"
if docker exec grs-nginx nginx -t 2>/dev/null; then
    echo "✓ Nginx configuration is valid"
else
    echo "✗ Nginx configuration has errors:"
    docker exec grs-nginx nginx -t
fi

echo -e "\n${YELLOW}Step 4: Check port bindings...${NC}"
echo "Checking if nginx is binding to ports correctly:"
docker exec grs-nginx netstat -tlnp 2>/dev/null | grep nginx || echo "netstat not available, checking process list:"
docker exec grs-nginx ps aux | grep nginx

echo -e "\n${YELLOW}Step 5: Test internal nginx connectivity...${NC}"
echo "Testing if nginx can reach internal services:"

# Test if nginx can reach backend
echo -n "Backend connectivity: "
if docker exec grs-nginx nslookup backend 2>/dev/null >/dev/null; then
    echo "✓ Can resolve backend"
    echo -n "Backend HTTP test: "
    if docker exec grs-nginx wget -q -O- --timeout=5 http://backend:3000/health 2>/dev/null; then
        echo "✓ Backend responds"
    else
        echo "✗ Backend not responding"
    fi
else
    echo "✗ Cannot resolve backend"
fi

echo -e "\n${YELLOW}Step 6: Test external port accessibility...${NC}"
echo "Testing from host system:"

# Check if ports are actually listening
echo "Port binding check:"
for port in 80 443; do
    if ss -tlnp 2>/dev/null | grep ":$port "; then
        echo "✓ Port $port is bound"
    else
        echo "✗ Port $port is not bound"
    fi
done

# Test localhost HTTP
echo -e "\nTesting localhost HTTP:"
if timeout 5 curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null; then
    http_code=$(timeout 5 curl -s -o /dev/null -w "%{http_code}" http://localhost)
    echo "✓ HTTP responds with code: $http_code"
else
    echo "✗ HTTP localhost not responding"
fi

# Test with different approaches
echo -e "\nTesting with wget:"
if timeout 5 wget -q -O- http://localhost 2>/dev/null >/dev/null; then
    echo "✓ wget localhost works"
else
    echo "✗ wget localhost fails"
fi

echo -e "\n${YELLOW}Step 7: Check Docker port mapping...${NC}"
echo "Docker port mappings:"
docker port grs-nginx

echo -e "\n${YELLOW}Step 8: Network connectivity test...${NC}"
echo "Testing container network:"
docker exec grs-nginx ping -c 2 backend 2>/dev/null || echo "Cannot ping backend"

echo -e "\n${YELLOW}Step 9: Manual nginx restart...${NC}"
echo "Restarting nginx to refresh configuration:"
docker restart grs-nginx
sleep 5

echo "Status after restart:"
if docker ps | grep -q grs-nginx; then
    echo "✓ Nginx restarted successfully"
    
    # Test again after restart
    echo -e "\nTesting HTTP after restart:"
    sleep 5
    if timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null; then
        http_code=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost)
        echo "✓ HTTP now responds with code: $http_code"
    else
        echo "✗ HTTP still not responding"
    fi
else
    echo "✗ Nginx failed to restart"
    docker logs grs-nginx --tail=10
fi

echo -e "\n${GREEN}=== Debug Summary ===${NC}"
echo "If nginx is still not responding:"
echo "1. Check if nginx config has correct upstream servers"
echo "2. Verify all backend containers are accessible from nginx"
echo "3. Check for port conflicts on the host"
echo "4. Examine detailed nginx error logs"
echo "5. Verify Docker network connectivity"

echo -e "\nUseful debugging commands:"
echo "• View nginx config: docker exec grs-nginx cat /etc/nginx/nginx.conf"
echo "• Test backend directly: curl http://localhost:3000/health"
echo "• Check port conflicts: sudo netstat -tlnp | grep :80"
echo "• Monitor nginx logs: docker logs grs-nginx -f"