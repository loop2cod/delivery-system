#!/bin/bash

# Clean SSL Fix Script
set -e

echo "🔧 Cleaning up SSL configuration conflicts..."

echo "1. Stop nginx:"
docker-compose stop nginx

echo "2. Clean up conflicting configurations:"
rm -rf ./nginx/sites-available/*.conf 2>/dev/null || echo "  No site configs to remove"
rm -rf ./nginx/sites-backup 2>/dev/null || echo "  No backup to remove"

echo "3. Create clean nginx.conf (HTTP + HTTPS):"
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
    
    # Only include conf.d (not sites-available)
    include /etc/nginx/conf.d/*.conf;
}
EOF

echo "4. Create unified SSL configuration:"
cat > ./nginx/conf.d/ssl.conf << 'EOF'
# HTTPS redirects for all domains
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
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    location / {
        proxy_pass http://admin-pwa:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    location / {
        proxy_pass http://business-pwa:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
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
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "5. Remove old HTTP-only config:"
rm -f ./nginx/conf.d/default.conf 2>/dev/null || echo "  No default.conf to remove"

echo "6. Update environment for HTTPS:"
cat > .env.production << 'EOF'
NODE_ENV=production
ENVIRONMENT=production

# Database Configuration - MONGODB ATLAS
MONGODB_URL=mongodb+srv://grs:grs2Deliver@grs.e9af7mt.mongodb.net/delivery_uae_production
MONGO_DB_NAME=delivery_uae_production

# Redis Configuration - LOCAL REDIS
REDIS_URL=redis://:redis123@redis:6379
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis123

# Security Configuration
JWT_SECRET=your-jwt-secret-change-in-production-kbh979bhb87bj4vhg8
COOKIE_SECRET=your-cookie-secret-change-in-production-kbh979bhbnkj8879kjvhg8

# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=BADdgsc8VG_REsV-xioz8NR_RT2F1o7aSzidDvAD6Ok89kQQAItcHBPLWOMVNmrdcm4CzNwB9g070l1W82BZn-4
VAPID_PRIVATE_KEY=g4q93Hx9Pzp1npudzGyih4HdQond28ESGCR-bzuoVj0

# API Configuration
API_HOST=0.0.0.0
API_PORT=3000
PORT=3000

# CORS Configuration - HTTPS DOMAINS
CORS_ORIGINS=https://grsdeliver.com,https://admin.grsdeliver.com,https://business.grsdeliver.com,https://driver.grsdeliver.com,https://api.grsdeliver.com

# Frontend URLs - HTTPS DOMAINS  
NEXT_PUBLIC_API_URL=https://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=wss://api.grsdeliver.com

# PWA Configuration
NEXT_PUBLIC_APP_NAME=GRS Delivery System
NEXT_PUBLIC_APP_SHORT_NAME=GRS
NEXT_PUBLIC_APP_DESCRIPTION=UAE Delivery Management System
EOF

echo "7. Start nginx with clean SSL config:"
docker-compose up -d nginx

echo "8. Wait for nginx:"
sleep 15

echo "9. Test nginx config:"
docker exec grs-nginx nginx -t && echo "✅ Config valid" || echo "❌ Config has errors"

echo "10. Test HTTPS:"
curl -k -f -s https://localhost/ && echo "✅ HTTPS working!" || echo "❌ HTTPS still failing"

echo "11. Check nginx status:"
docker-compose ps nginx

echo "12. Check nginx logs:"
docker-compose logs --tail=10 nginx

echo ""
echo "🎉 Clean SSL setup completed!"
echo ""
echo "✅ Test your HTTPS domains:"
echo "  curl -k https://31.97.235.250"
echo "  https://grsdeliver.com"
echo "  https://api.grsdeliver.com/health"