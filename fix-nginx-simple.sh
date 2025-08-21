#!/bin/bash

# Fix Nginx Simple HTTP Configuration Script
set -e

echo "🔧 Setting up simple nginx HTTP configuration..."

echo "1. Checking current directory structure:"
pwd
ls -la

echo -e "\n2. Creating nginx directory structure:"
mkdir -p ./nginx/sites-available
mkdir -p ./nginx/conf.d
mkdir -p ./nginx/logs

echo "3. Creating simple nginx.conf:"
cat > ./nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log  /var/log/nginx/access.log  main;
    
    sendfile        on;
    keepalive_timeout  65;
    
    # Include site configurations
    include /etc/nginx/conf.d/*.conf;
}
EOF

echo "4. Creating simple HTTP site configuration:"
cat > ./nginx/conf.d/default.conf << 'EOF'
# Default HTTP configuration

# API Server
server {
    listen 80;
    server_name api.grsdeliver.com;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Public PWA
server {
    listen 80;
    server_name grsdeliver.com;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin PWA  
server {
    listen 80;
    server_name admin.grsdeliver.com;
    
    location / {
        proxy_pass http://admin-pwa:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Business PWA
server {
    listen 80;
    server_name business.grsdeliver.com;
    
    location / {
        proxy_pass http://business-pwa:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Driver PWA
server {
    listen 80;
    server_name driver.grsdeliver.com;
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Default server for IP access or unknown domains
server {
    listen 80 default_server;
    server_name _;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "5. Verifying nginx directory structure:"
find ./nginx -type f -name "*.conf" | head -10

echo "6. Remove any SSL directories that might cause issues:"
rm -rf ./nginx/ssl 2>/dev/null || echo "  No SSL directory found"
rm -rf ./nginx/sites-available/*.conf 2>/dev/null || echo "  No old site configs found"

echo "7. Stop nginx container:"
docker-compose stop nginx || echo "  Nginx was not running"

echo "8. Start nginx with new configuration:"
docker-compose up -d nginx

echo "9. Wait for nginx to start:"
sleep 15

echo "10. Check nginx container status:"
docker-compose ps nginx

echo "11. Check nginx logs:"
docker-compose logs --tail=20 nginx

echo "12. Test nginx configuration inside container:"
docker exec grs-nginx nginx -t 2>/dev/null && echo "✅ Nginx config is valid" || echo "❌ Nginx config has errors"

echo "13. Test HTTP access:"
curl -f -s http://localhost/ && echo "✅ Nginx HTTP working!" || echo "❌ Still not working"

echo ""
echo "🎉 Simple nginx HTTP setup completed!"
echo ""
echo "🧪 Test your domains:"
echo "  curl -H 'Host: grsdeliver.com' http://31.97.235.250"
echo "  curl -H 'Host: api.grsdeliver.com' http://31.97.235.250"