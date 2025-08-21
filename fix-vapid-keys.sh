#!/bin/bash

# Fix VAPID Keys Issue Script
set -e

echo "🔧 Adding missing VAPID keys to fix backend..."

# Update the production environment file
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

# VAPID Keys for Push Notifications (REQUIRED)
VAPID_PUBLIC_KEY=BADdgsc8VG_REsV-xioz8NR_RT2F1o7aSzidDvAD6Ok89kQQAItcHBPLWOMVNmrdcm4CzNwB9g070l1W82BZn-4
VAPID_PRIVATE_KEY=g4q93Hx9Pzp1npudzGyih4HdQond28ESGCR-bzuoVj0

# API Configuration
API_HOST=0.0.0.0
API_PORT=3000
PORT=3000

# CORS Configuration
CORS_ORIGINS=http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004

# Frontend URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# PWA Configuration
NEXT_PUBLIC_APP_NAME=GRS Delivery System
NEXT_PUBLIC_APP_SHORT_NAME=GRS
NEXT_PUBLIC_APP_DESCRIPTION=UAE Delivery Management System
EOF

echo "✅ Environment updated with VAPID keys!"

echo "🔄 Rebuilding and restarting backend..."
docker-compose -f docker-compose.no-nginx.yml build backend
docker-compose -f docker-compose.no-nginx.yml up -d backend

echo "⏳ Waiting for backend to start..."
sleep 15

echo "🔍 Checking backend status..."
docker-compose -f docker-compose.no-nginx.yml ps backend

echo "📋 Backend logs (last 20 lines):"
docker-compose -f docker-compose.no-nginx.yml logs --tail=20 backend

echo ""
echo "🧪 Testing backend health..."
for i in {1..5}; do
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy!"
        break
    else
        echo "⏳ Attempt $i/5 - Backend not ready yet..."
        sleep 5
    fi
done