#!/bin/bash

# Clean Deployment Script for KVM VPS
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 GRS Delivery System - Clean Deployment${NC}"
echo "=================================================="

# Parse command line arguments
BUILD_BACKEND=true
BUILD_PWAS=true
DOCKER_BUILD=true
START_SERVICES=true
USE_NO_NGINX=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backend)
            BUILD_BACKEND=false
            shift
            ;;
        --skip-pwas)
            BUILD_PWAS=false
            shift
            ;;
        --skip-docker)
            DOCKER_BUILD=false
            shift
            ;;
        --build-only)
            START_SERVICES=false
            shift
            ;;
        --no-nginx)
            USE_NO_NGINX=true
            shift
            ;;
        *)
            echo "Usage: $0 [--skip-backend] [--skip-pwas] [--skip-docker] [--build-only] [--no-nginx]"
            exit 1
            ;;
    esac
done

# Step 1: Install root dependencies
echo -e "${YELLOW}📦 Step 1: Installing root dependencies...${NC}"
pnpm install

# Step 2: Build Backend
if [ "$BUILD_BACKEND" = true ]; then
    echo -e "${YELLOW}🔨 Step 2: Building Backend...${NC}"
    chmod +x build-backend.sh
    ./build-backend.sh
else
    echo -e "${YELLOW}⏭️ Step 2: Skipping Backend build${NC}"
fi

# Step 3: Build PWAs sequentially
if [ "$BUILD_PWAS" = true ]; then
    echo -e "${YELLOW}🔨 Step 3: Building PWAs...${NC}"
    
    echo -e "${BLUE}  Building Public PWA...${NC}"
    chmod +x build-public-pwa.sh
    ./build-public-pwa.sh
    
    echo -e "${BLUE}  Building Admin PWA...${NC}"
    chmod +x build-admin-pwa.sh
    ./build-admin-pwa.sh
    
    echo -e "${BLUE}  Building Business PWA...${NC}"
    chmod +x build-business-pwa.sh
    ./build-business-pwa.sh
    
    echo -e "${BLUE}  Building Driver PWA...${NC}"
    chmod +x build-driver-pwa.sh
    ./build-driver-pwa.sh
else
    echo -e "${YELLOW}⏭️ Step 3: Skipping PWA builds${NC}"
fi

# Step 4: Create production environment
echo -e "${YELLOW}📝 Step 4: Creating production environment...${NC}"
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

# Step 5: Docker operations
if [ "$DOCKER_BUILD" = true ]; then
    echo -e "${YELLOW}🐳 Step 5: Building Docker containers...${NC}"
    
    # Choose docker-compose file
    if [ "$USE_NO_NGINX" = true ]; then
        COMPOSE_FILE="docker-compose.no-nginx.yml"
        echo "  Using no-nginx configuration (avoids port 80/443 conflicts)"
    else
        COMPOSE_FILE="docker-compose.yml"
        echo "  Using full configuration with nginx"
    fi
    
    # Stop existing containers
    echo "  Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans || true
    
    # Build containers
    echo "  Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    echo -e "${GREEN}✅ Docker images built successfully!${NC}"
else
    echo -e "${YELLOW}⏭️ Step 5: Skipping Docker build${NC}"
fi

# Step 6: Start services
if [ "$START_SERVICES" = true ]; then
    echo -e "${YELLOW}🚀 Step 6: Starting services...${NC}"
    
    # Use the same compose file as build step
    if [ "$USE_NO_NGINX" = true ]; then
        COMPOSE_FILE="docker-compose.no-nginx.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Start Redis cache (MongoDB Atlas used for database)
    echo "  Starting Redis cache..."
    docker-compose -f "$COMPOSE_FILE" up -d redis
    echo "  Waiting for Redis (15s)..."
    sleep 15
    
    # Start backend
    echo "  Starting backend..."
    docker-compose -f "$COMPOSE_FILE" up -d backend
    echo "  Waiting for backend (20s)..."
    sleep 20
    
    # Start PWAs
    echo "  Starting PWAs..."
    docker-compose -f "$COMPOSE_FILE" up -d public-pwa admin-pwa business-pwa driver-pwa
    echo "  Waiting for PWAs (15s)..."
    sleep 15
    
    # Start nginx only if not using no-nginx mode
    if [ "$USE_NO_NGINX" = false ]; then
        echo "  Starting nginx..."
        docker-compose -f "$COMPOSE_FILE" up -d nginx
        echo "  Waiting for nginx (10s)..."
        sleep 10
    else
        echo "  Skipping nginx (using no-nginx mode)"
    fi
    
    echo -e "${GREEN}✅ All services started!${NC}"
else
    echo -e "${YELLOW}⏭️ Step 6: Skipping service startup${NC}"
fi

# Step 7: Health check
if [ "$START_SERVICES" = true ]; then
    echo -e "${YELLOW}🔍 Step 7: Health check...${NC}"
    
    # Use the same compose file
    if [ "$USE_NO_NGINX" = true ]; then
        COMPOSE_FILE="docker-compose.no-nginx.yml"
    else
        COMPOSE_FILE="docker-compose.yml"
    fi
    
    # Check container status
    echo "  Container status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Check backend health
    echo "  Checking backend health..."
    for i in {1..10}; do
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            echo -e "    ${GREEN}✅ Backend is healthy${NC}"
            break
        else
            echo "    Attempt $i/10 - Backend not ready yet..."
            sleep 5
        fi
    done
    
    # Check PWA status
    echo "  Checking PWA status..."
    for port in 3001 3002 3003 3004; do
        if curl -f -s http://localhost:$port > /dev/null 2>&1; then
            echo -e "    ${GREEN}✅ PWA on port $port is running${NC}"
        else
            echo -e "    ${RED}❌ PWA on port $port is not responding${NC}"
        fi
    done
fi

# Summary
echo
echo -e "${GREEN}🎉 Deployment Summary${NC}"
echo "=================================================="
echo -e "${BLUE}Backend:${NC} $([ "$BUILD_BACKEND" = true ] && echo "Built" || echo "Skipped")"
echo -e "${BLUE}PWAs:${NC} $([ "$BUILD_PWAS" = true ] && echo "Built" || echo "Skipped")"
echo -e "${BLUE}Docker:${NC} $([ "$DOCKER_BUILD" = true ] && echo "Built" || echo "Skipped")"
echo -e "${BLUE}Services:${NC} $([ "$START_SERVICES" = true ] && echo "Started" || echo "Skipped")"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "  - View logs: docker-compose logs -f"
echo "  - Check status: docker-compose ps"
echo "  - Backend API: http://localhost:3000"
echo "  - Public PWA: http://localhost:3001"
echo "  - Admin PWA: http://localhost:3002"
echo "  - Business PWA: http://localhost:3003"
echo "  - Driver PWA: http://localhost:3004"
echo
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"