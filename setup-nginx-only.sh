#!/bin/bash

# Setup Nginx Only (No App Rebuild) Script
set -e

echo "🌐 Setting up nginx for domains (no app rebuild)..."

# Get server IP
SERVER_IP=$(curl -s http://checkip.amazonaws.com/ || echo "YOUR-SERVER-IP")
echo "Server IP detected: $SERVER_IP"

# Step 1: Stop current no-nginx setup
echo "1. Stopping current no-nginx setup..."
docker-compose -f docker-compose.no-nginx.yml down

# Step 2: Free up ports 80/443
echo "2. Freeing ports 80 and 443..."
sudo systemctl stop nginx 2>/dev/null || echo "  System nginx not running"
sudo systemctl disable nginx 2>/dev/null || echo "  System nginx not installed"
sudo fuser -k 80/tcp 2>/dev/null || echo "  Port 80 already free"
sudo fuser -k 443/tcp 2>/dev/null || echo "  Port 443 already free"

# Step 3: Update only environment variables (no rebuild needed)
echo "3. Updating environment for HTTPS domains..."
cat > .env.production << EOF
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

# CORS Configuration - PRODUCTION DOMAINS + IP ACCESS
CORS_ORIGINS=https://grsdeliver.com,https://admin.grsdeliver.com,https://business.grsdeliver.com,https://driver.grsdeliver.com,https://api.grsdeliver.com,http://$SERVER_IP:3001,http://$SERVER_IP:3002,http://$SERVER_IP:3003,http://$SERVER_IP:3004

# Frontend URLs - PRODUCTION DOMAINS  
NEXT_PUBLIC_API_URL=https://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=wss://api.grsdeliver.com

# PWA Configuration
NEXT_PUBLIC_APP_NAME=GRS Delivery System
NEXT_PUBLIC_APP_SHORT_NAME=GRS
NEXT_PUBLIC_APP_DESCRIPTION=UAE Delivery Management System

# Build Information
BUILD_VERSION=$(date +%Y%m%d_%H%M%S)
BUILD_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
EOF

# Step 4: Start services with existing images (no build)
echo "4. Starting services with nginx (using existing app builds)..."
docker-compose up -d --no-build

echo "5. Waiting for services to start..."
sleep 30

echo "6. Checking service status:"
docker-compose ps

echo ""
echo "7. Testing services:"
echo "  Testing backend..."
curl -f -s http://localhost:3000/health && echo "✅ Backend healthy" || echo "❌ Backend not responding"

echo "  Testing nginx..."
curl -f -s http://localhost/ && echo "✅ Nginx responding" || echo "❌ Nginx not responding"

echo ""
echo "🎉 Nginx setup completed (no app rebuild)!"
echo ""
echo "✅ Services running:"
echo "  - Backend: http://localhost:3000 (also via nginx)"
echo "  - PWAs: http://localhost:3001-3004 (also via nginx)"
echo "  - Nginx: http://localhost:80"
echo ""
echo "🌐 Your domains should work once DNS points here:"
echo "  - http://grsdeliver.com (will redirect to HTTPS after SSL setup)"
echo "  - http://admin.grsdeliver.com"
echo "  - http://business.grsdeliver.com"
echo "  - http://driver.grsdeliver.com"
echo "  - http://api.grsdeliver.com"
echo ""
echo "📋 Next steps:"
echo "1. Ensure DNS records point to: $SERVER_IP"
echo "2. Run ./setup-ssl.sh for HTTPS certificates"
echo "3. Test: curl -H 'Host: grsdeliver.com' http://$SERVER_IP"