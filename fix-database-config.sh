#!/bin/bash

# Fix Database Configuration Script
set -e

echo "🔧 Confirming database configuration uses MongoDB Atlas..."

# Create/update production environment file with Atlas
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

echo "✅ Database configuration confirmed!"
echo ""
echo "Configuration:"
echo "  - MONGODB_URL: MongoDB Atlas (grs.e9af7mt.mongodb.net)"
echo "  - Database: delivery_uae_production"
echo "  - Redis: Local container"
echo ""
echo "To apply changes:"
echo "  1. Rebuild backend: docker-compose build backend"
echo "  2. Restart backend: docker-compose restart backend"
echo "  3. Or full redeploy: ./deploy.sh --no-nginx"