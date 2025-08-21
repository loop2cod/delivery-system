#!/bin/bash

# Setup Production Domains Script
set -e

echo "🌐 Setting up production domains with nginx..."

# First, fix the port conflict
echo "1. Stopping system nginx..."
sudo systemctl stop nginx 2>/dev/null || echo "  nginx not running"
sudo systemctl disable nginx 2>/dev/null || echo "  nginx not installed"

# Kill any processes using ports 80/443
echo "2. Freeing ports 80/443..."
sudo fuser -k 80/tcp 2>/dev/null || echo "  Port 80 already free"
sudo fuser -k 443/tcp 2>/dev/null || echo "  Port 443 already free"

# Update environment for production domains
echo "3. Creating production environment for domains..."
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

# API Configuration
API_HOST=0.0.0.0
API_PORT=3000
PORT=3000

# CORS Configuration - PRODUCTION DOMAINS
CORS_ORIGINS=https://grsdeliver.com,https://admin.grsdeliver.com,https://business.grsdeliver.com,https://driver.grsdeliver.com,https://api.grsdeliver.com

# Frontend URLs - PRODUCTION DOMAINS
NEXT_PUBLIC_API_URL=https://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=wss://api.grsdeliver.com

# PWA Configuration
NEXT_PUBLIC_APP_NAME=GRS Delivery System
NEXT_PUBLIC_APP_SHORT_NAME=GRS
NEXT_PUBLIC_APP_DESCRIPTION=UAE Delivery Management System
EOF

echo "4. Stopping current services..."
docker-compose down --remove-orphans

echo "5. Starting with full nginx configuration..."
docker-compose build --no-cache
docker-compose up -d

echo "6. Waiting for services to start..."
sleep 30

echo "7. Checking service status:"
docker-compose ps

echo ""
echo "✅ Production domains setup completed!"
echo ""
echo "Your domains should now work:"
echo "  - https://grsdeliver.com (Public PWA)"
echo "  - https://admin.grsdeliver.com (Admin PWA)"
echo "  - https://business.grsdeliver.com (Business PWA)" 
echo "  - https://driver.grsdeliver.com (Driver PWA)"
echo "  - https://api.grsdeliver.com (Backend API)"
echo ""
echo "If domains still don't work, check:"
echo "  1. DNS points to this server IP"
echo "  2. SSL certificates are configured"
echo "  3. Firewall allows ports 80/443"