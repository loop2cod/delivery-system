#!/bin/bash

# Fix Docker networking issues preventing container-to-container communication
# Usage: ./scripts/fix-docker-networking.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}Fixing Docker Networking Issues${NC}"
echo

echo -e "${YELLOW}Issue: Containers can't resolve each other by name${NC}"
echo -e "${YELLOW}Solution: Fix Docker networking and use IP-based nginx config${NC}"
echo

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f docker-compose.yml"
else
    DC="docker-compose -f docker-compose.yml"
fi

echo -e "${YELLOW}Step 1: Check current networking setup...${NC}"
echo "Docker networks:"
docker network ls

echo -e "\nContainer network details:"
network_name="delivery-system_grs-network"
docker network inspect "$network_name" | grep -A 5 -B 1 "IPAddress\|Name.*grs"

echo -e "\n${YELLOW}Step 2: Get container IP addresses...${NC}"
containers=("grs-backend" "grs-public-pwa" "grs-admin-pwa" "grs-business-pwa" "grs-driver-pwa")
declare -A container_ips

for container in "${containers[@]}"; do
    ip=$(docker inspect "$container" --format='{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null)
    if [ -n "$ip" ]; then
        container_ips[$container]=$ip
        echo "✓ $container: $ip"
    else
        echo "✗ $container: No IP found"
    fi
done

echo -e "\n${YELLOW}Step 3: Test IP-based connectivity...${NC}"
if [ -n "${container_ips[grs-backend]}" ]; then
    echo "Testing if nginx can reach backend by IP:"
    if docker exec grs-nginx wget -q -O- --timeout=5 "http://${container_ips[grs-backend]}:3000/health" 2>/dev/null; then
        echo "✓ Backend reachable by IP"
        USE_IPS=true
    else
        echo "✗ Backend not reachable by IP"
        USE_IPS=false
    fi
else
    USE_IPS=false
fi

echo -e "\n${YELLOW}Step 4: Create IP-based nginx configuration...${NC}"
if [ "$USE_IPS" = true ]; then
    echo "Creating nginx config using container IPs..."
    
    cat > nginx/nginx.conf.fixed << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Upstream servers using container IPs
    upstream backend_servers {
        server ${container_ips[grs-backend]}:3000;
    }
    
    upstream public_servers {
        server ${container_ips[grs-public-pwa]}:3001;
    }
    
    upstream admin_servers {
        server ${container_ips[grs-admin-pwa]}:3002;
    }
    
    upstream business_servers {
        server ${container_ips[grs-business-pwa]}:3003;
    }
    
    upstream driver_servers {
        server ${container_ips[grs-driver-pwa]}:3004;
    }

    # Main domain - grsdeliver.com
    server {
        listen 80;
        server_name grsdeliver.com www.grsdeliver.com;
        
        location / {
            proxy_pass http://public_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # API domain - api.grsdeliver.com
    server {
        listen 80;
        server_name api.grsdeliver.com;
        
        location / {
            proxy_pass http://backend_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # Admin domain - admin.grsdeliver.com
    server {
        listen 80;
        server_name admin.grsdeliver.com;
        
        location / {
            proxy_pass http://admin_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # Business domain - business.grsdeliver.com
    server {
        listen 80;
        server_name business.grsdeliver.com;
        
        location / {
            proxy_pass http://business_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # Driver domain - driver.grsdeliver.com
    server {
        listen 80;
        server_name driver.grsdeliver.com;
        
        location / {
            proxy_pass http://driver_servers;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }

    # Default server for localhost and unmatched requests
    server {
        listen 80 default_server;
        server_name localhost _;
        
        location / {
            return 200 'GRS Delivery System - Server is running';
            add_header Content-Type text/plain;
        }
        
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    echo -e "\n${YELLOW}Step 5: Test IP-based configuration...${NC}"
    if docker run --rm -v "$PWD/nginx/nginx.conf.fixed:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t; then
        echo "✓ IP-based nginx configuration is valid"
        
        echo -e "\n${YELLOW}Step 6: Apply IP-based configuration...${NC}"
        cp nginx/nginx.conf nginx/nginx.conf.original
        mv nginx/nginx.conf.fixed nginx/nginx.conf
        
        echo "Restarting nginx with IP-based configuration..."
        docker restart grs-nginx
        
        echo "Waiting for nginx to start..."
        sleep 10
        
        if docker ps | grep -q grs-nginx && ! docker logs grs-nginx --tail=5 | grep -q "emerg"; then
            echo -e "${GREEN}✓ Nginx started successfully with IP-based config!${NC}"
            
            echo -e "\n${YELLOW}Step 7: Test HTTP connectivity...${NC}"
            sleep 5
            
            # Test localhost first
            if timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null; then
                http_code=$(timeout 10 curl -s -o /dev/null -w "%{http_code}" http://localhost)
                echo "✓ HTTP localhost responds with code: $http_code"
                
                # Test the actual content
                echo -e "\nTesting localhost response:"
                timeout 5 curl -s http://localhost | head -c 100
                echo
                
            else
                echo "✗ HTTP localhost still not responding"
            fi
            
            # Test the health endpoint
            echo -e "\nTesting health endpoint:"
            if timeout 10 curl -s http://localhost/health; then
                echo -e "\n✓ Health endpoint working"
            fi
            
            echo -e "\n${GREEN}🎉 HTTP should now be working!${NC}"
            echo "Your domains should now be accessible:"
            echo "  • http://grsdeliver.com (and https://)"
            echo "  • http://admin.grsdeliver.com"
            echo "  • http://business.grsdeliver.com"
            echo "  • http://driver.grsdeliver.com"
            echo "  • http://api.grsdeliver.com"
            
        else
            echo -e "${RED}✗ Nginx failed to start with IP-based config${NC}"
            echo "Nginx logs:"
            docker logs grs-nginx --tail=10
        fi
        
    else
        echo "✗ IP-based nginx configuration has syntax errors"
    fi
    
else
    echo -e "${RED}Cannot create IP-based config - containers not reachable by IP${NC}"
    
    echo -e "\n${YELLOW}Alternative: Create simple nginx config for testing...${NC}"
    cat > nginx/nginx.conf.simple << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80 default_server;
        server_name _;
        
        location / {
            return 200 'GRS Delivery System - Nginx is working!';
            add_header Content-Type text/plain;
        }
        
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
EOF
    
    echo "Testing simple configuration:"
    if docker run --rm -v "$PWD/nginx/nginx.conf.simple:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t; then
        echo "✓ Simple nginx configuration is valid"
        
        cp nginx/nginx.conf nginx/nginx.conf.original
        mv nginx/nginx.conf.simple nginx/nginx.conf
        
        docker restart grs-nginx
        sleep 5
        
        if timeout 10 curl -s http://localhost; then
            echo -e "\n${GREEN}✓ Simple nginx is working!${NC}"
            echo "You can now access: http://your-server-ip"
        fi
    fi
fi

echo -e "\n${GREEN}=== Networking Fix Complete ===${NC}"
echo "Check nginx status: docker logs grs-nginx"
echo "Test HTTP: curl http://localhost"