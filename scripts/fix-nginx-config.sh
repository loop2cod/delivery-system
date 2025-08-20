#!/bin/bash

# Fix nginx configuration to use correct service names
# Usage: ./scripts/fix-nginx-config.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Fixing Nginx Configuration${NC}"
echo

echo -e "${YELLOW}Issue: Nginx can't find upstream services (public-pwa:3001, backend:3000, etc.)${NC}"
echo -e "${YELLOW}Solution: Update nginx config to use correct container names${NC}"
echo

echo -e "${YELLOW}Step 1: Check current nginx configuration...${NC}"
if [ -f "nginx/nginx.conf" ]; then
    echo "Current upstream configurations:"
    grep -n "upstream\|server.*:" nginx/nginx.conf | head -10
else
    echo "nginx.conf not found"
    exit 1
fi

echo -e "\n${YELLOW}Step 2: Check actual container names and network...${NC}"
echo -e "${BLUE}Running containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Networks}}"

echo -e "\n${BLUE}Docker network inspection:${NC}"
network_name=$(docker network ls | grep grs-network | awk '{print $2}')
if [ -z "$network_name" ]; then
    network_name="delivery-system_grs-network"
fi
echo "Using network: $network_name"

echo "Containers on network:"
docker network inspect "$network_name" | grep -A 1 "Name.*grs-" | grep Name || echo "Network inspection failed"

echo -e "\n${YELLOW}Step 3: Test container connectivity...${NC}"
echo "Testing if containers can reach each other:"

# Test DNS resolution from within the nginx container (same network)
services=("backend:3000" "public-pwa:3001" "admin-pwa:3002" "business-pwa:3003" "driver-pwa:3004")
if docker ps --format '{{.Names}}' | grep -q '^grs-nginx$'; then
    for svc in "${services[@]}"; do
        name="${svc%%:*}"; port="${svc##*:}"
        echo -n "Testing $name:$port from grs-nginx: "
        if docker exec grs-nginx sh -c "ping -c1 -W2 $name >/dev/null 2>&1"; then
            echo "✓ resolves"
        else
            echo "✗ cannot resolve"
        fi
    done
else
    echo "grs-nginx not running; skipping reachability tests"
fi

echo -e "\n${YELLOW}Step 4: Create temporary nginx config fix...${NC}"
echo "Backing up original nginx config..."
cp nginx/nginx.conf nginx/nginx.conf.backup

echo "Creating corrected nginx configuration..."
cat > nginx/nginx.conf.tmp << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Upstream servers - use Docker Compose service names (stable DNS on the network)
    upstream backend {
        server backend:3000;
    }
    
    upstream public_pwa {
        server public-pwa:3001;
    }
    
    upstream admin_pwa {
        server admin-pwa:3002;
    }
    
    upstream business_pwa {
        server business-pwa:3003;
    }
    
    upstream driver_pwa {
        server driver-pwa:3004;
    }

    # Main domain - grsdeliver.com
    server {
        listen 80;
        listen 443 ssl;
        server_name grsdeliver.com www.grsdeliver.com;
        
        ssl_certificate /etc/nginx/ssl/grsdeliver.com.crt;
        ssl_certificate_key /etc/nginx/ssl/grsdeliver.com.key;
        
        location / {
            proxy_pass http://public_pwa;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # API domain - api.grsdeliver.com
    server {
        listen 80;
        listen 443 ssl;
        server_name api.grsdeliver.com;
        
        ssl_certificate /etc/nginx/ssl/api.grsdeliver.com.crt;
        ssl_certificate_key /etc/nginx/ssl/api.grsdeliver.com.key;
        
        location / {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Admin domain - admin.grsdeliver.com
    server {
        listen 80;
        listen 443 ssl;
        server_name admin.grsdeliver.com;
        
        ssl_certificate /etc/nginx/ssl/admin.grsdeliver.com.crt;
        ssl_certificate_key /etc/nginx/ssl/admin.grsdeliver.com.key;
        
        location / {
            proxy_pass http://admin_pwa;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Business domain - business.grsdeliver.com
    server {
        listen 80;
        listen 443 ssl;
        server_name business.grsdeliver.com;
        
        ssl_certificate /etc/nginx/ssl/business.grsdeliver.com.crt;
        ssl_certificate_key /etc/nginx/ssl/business.grsdeliver.com.key;
        
        location / {
            proxy_pass http://business_pwa;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Driver domain - driver.grsdeliver.com
    server {
        listen 80;
        listen 443 ssl;
        server_name driver.grsdeliver.com;
        
        ssl_certificate /etc/nginx/ssl/driver.grsdeliver.com.crt;
        ssl_certificate_key /etc/nginx/ssl/driver.grsdeliver.com.key;
        
        location / {
            proxy_pass http://driver_pwa;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Default server for unmatched requests
    server {
        listen 80 default_server;
        listen 443 ssl default_server;
        server_name _;
        return 444;
    }
}
EOF

echo -e "\n${YELLOW}Step 5: Test new configuration...${NC}"
echo "Testing new nginx config syntax:"
# Prefer testing inside the running nginx container to ensure proper DNS/network
if docker ps --format '{{.Names}}' | grep -q '^grs-nginx$'; then
    if docker exec grs-nginx nginx -t; then
        test_ok=1
    else
        test_ok=0
    fi
else
    # Fall back to a temp container attached to the compose network so upstream names resolve
    if docker run --rm --network "$network_name" -v "$PWD/nginx/nginx.conf.tmp:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t; then
        test_ok=1
    else
        test_ok=0
    fi
fi

if [ "${test_ok:-0}" -eq 1 ]; then
    echo "✓ New nginx configuration is valid"
    
    echo -e "\n${YELLOW}Step 6: Apply new configuration...${NC}"
    mv nginx/nginx.conf.tmp nginx/nginx.conf
    
    echo "Restarting nginx with new configuration..."
    docker restart grs-nginx
    
    echo "Waiting for nginx to start..."
    sleep 10
    
    if docker ps | grep -q grs-nginx && ! docker logs grs-nginx --tail=5 | grep -q "emerg"; then
        echo -e "${GREEN}✓ Nginx started successfully with new config!${NC}"
        
        echo -e "\n${YELLOW}Step 7: Test HTTP connectivity...${NC}"
        sleep 5
        
        if timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null; then
            http_code=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost)
            echo "✓ HTTP responds with code: $http_code"
        else
            echo "✗ HTTP still not responding"
        fi
        
        echo -e "\n${GREEN}🎉 Nginx should now be working!${NC}"
        echo "Test your domains:"
        echo "  • https://grsdeliver.com"
        echo "  • https://admin.grsdeliver.com"
        echo "  • https://business.grsdeliver.com"
        echo "  • https://driver.grsdeliver.com"
        echo "  • https://api.grsdeliver.com"
        
    else
        echo -e "${RED}✗ Nginx failed to start with new config${NC}"
        echo "Nginx logs:"
        docker logs grs-nginx --tail=10
        
        echo "Restoring original config..."
        mv nginx/nginx.conf.backup nginx/nginx.conf
    fi
    
else
    echo "✗ New nginx configuration has syntax errors"
    rm nginx/nginx.conf.tmp
fi

echo -e "\n${GREEN}=== Configuration Fix Complete ===${NC}"