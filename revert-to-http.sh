#!/bin/bash

# Revert to HTTP Only Script
set -e

echo "🔄 Reverting to HTTP-only configuration..."

echo "1. Stopping nginx:"
docker-compose stop nginx

echo "2. Backup SSL config:"
mkdir -p ./nginx/ssl-backup
cp -r ./nginx/ssl ./nginx/ssl-backup/ 2>/dev/null || echo "  No SSL directory to backup"

echo "3. Remove problematic SSL configs:"
rm -rf ./nginx/sites-available/grs-ssl.conf 2>/dev/null || echo "  No SSL config to remove"

echo "4. Restore simple HTTP nginx.conf:"
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
    
    # Include HTTP-only configurations
    include /etc/nginx/conf.d/*.conf;
}
EOF

echo "5. Update environment for HTTP domains:"
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

# CORS Configuration - HTTP DOMAINS
CORS_ORIGINS=http://grsdeliver.com,http://admin.grsdeliver.com,http://business.grsdeliver.com,http://driver.grsdeliver.com,http://api.grsdeliver.com,http://31.97.235.250:3001,http://31.97.235.250:3002,http://31.97.235.250:3003,http://31.97.235.250:3004

# Frontend URLs - HTTP DOMAINS  
NEXT_PUBLIC_API_URL=http://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=ws://api.grsdeliver.com

# PWA Configuration
NEXT_PUBLIC_APP_NAME=GRS Delivery System
NEXT_PUBLIC_APP_SHORT_NAME=GRS
NEXT_PUBLIC_APP_DESCRIPTION=UAE Delivery Management System
EOF

echo "6. Start nginx with HTTP-only config:"
docker-compose up -d nginx

echo "7. Wait for nginx to start:"
sleep 10

echo "8. Test HTTP access:"
curl -f -s http://localhost/ && echo "✅ HTTP working!" || echo "❌ HTTP still not working"

echo "9. Check nginx status:"
docker-compose ps nginx

echo "10. Check nginx logs:"
docker-compose logs --tail=10 nginx

echo ""
echo "🎉 Reverted to HTTP-only mode!"
echo ""
echo "✅ Your domains should now work via HTTP:"
echo "  - http://grsdeliver.com"
echo "  - http://admin.grsdeliver.com"
echo "  - http://business.grsdeliver.com"
echo "  - http://driver.grsdeliver.com"
echo "  - http://api.grsdeliver.com"
echo ""
echo "🧪 Test: curl -H 'Host: grsdeliver.com' http://31.97.235.250"