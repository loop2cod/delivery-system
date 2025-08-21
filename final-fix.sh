#!/bin/bash

# Final Fix - Complete Clean Setup
set -e

echo "🔧 Final fix - complete clean setup..."

echo "1. Stop all containers:"
docker-compose down --remove-orphans

echo "2. Clean nginx completely:"
rm -rf ./nginx/sites-available 2>/dev/null || echo "  Already clean"
rm -rf ./nginx/sites-backup 2>/dev/null || echo "  Already clean"

echo "3. Create final nginx configuration:"
mkdir -p ./nginx/conf.d

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
    error_log   /var/log/nginx/error.log warn;
    
    sendfile        on;
    keepalive_timeout  65;
    
    include /etc/nginx/conf.d/*.conf;
}
EOF

cat > ./nginx/conf.d/domains.conf << 'EOF'
# HTTP to HTTPS redirects
server {
    listen 80;
    server_name grsdeliver.com admin.grsdeliver.com business.grsdeliver.com driver.grsdeliver.com api.grsdeliver.com;
    return 301 https://$server_name$request_uri;
}

# Public PWA - HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:AES256+EECDH:AES256+EDH;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Admin PWA - HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name admin.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:AES256+EECDH:AES256+EDH;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://admin-pwa:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Business PWA - HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name business.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:AES256+EECDH:AES256+EDH;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://business-pwa:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Driver PWA - HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name driver.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:AES256+EECDH:AES256+EDH;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# API Backend - HTTPS
server {
    listen 443 ssl;
    http2 on;
    server_name api.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES128-GCM-SHA256:AES256+EECDH:AES256+EDH;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Default server (catch-all for IP access)
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "4. Start services in order:"
docker-compose up -d redis
sleep 5

docker-compose up -d backend  
sleep 10

docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa
sleep 15

docker-compose up -d nginx
sleep 10

echo "5. Test configuration:"
docker exec grs-nginx nginx -t && echo "✅ Nginx config valid" || echo "❌ Config invalid"

echo "6. Test services:"
echo "Testing HTTPS:"
curl -k -f -s https://localhost/ | head -20

echo -e "\nTesting domain routing:"
curl -H 'Host: api.grsdeliver.com' -k -f -s https://31.97.235.250/health && echo "✅ API working" || echo "❌ API not working"

echo "7. Service status:"
docker-compose ps

echo ""
echo "🎉 Final setup completed!"
echo ""
echo "✅ Test your domains:"
echo "  https://grsdeliver.com"
echo "  https://admin.grsdeliver.com" 
echo "  https://business.grsdeliver.com"
echo "  https://driver.grsdeliver.com"
echo "  https://api.grsdeliver.com"