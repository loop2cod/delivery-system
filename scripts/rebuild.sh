#!/bin/bash

# Delivery System Rebuild Script
# Usage: ./scripts/rebuild.sh [--dev|--prod|--clean]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
MODE="dev"
CLEAN_BUILD=false
DOCKER_COMPOSE_FILE="docker-compose.dev.yml"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dev)
            MODE="dev"
            DOCKER_COMPOSE_FILE="docker-compose.dev.yml"
            shift
            ;;
        --prod)
            MODE="prod"
            DOCKER_COMPOSE_FILE="docker-compose.yml"
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        *)
            echo "Usage: $0 [--dev|--prod] [--clean]"
            exit 1
            ;;
    esac
done

# Detect Docker Compose command
if docker compose version >/dev/null 2>&1; then
    DC="docker compose -f $DOCKER_COMPOSE_FILE"
elif command -v docker-compose >/dev/null 2>&1; then
    DC="docker-compose -f $DOCKER_COMPOSE_FILE"
else
    echo -e "${RED}ERROR: Docker Compose not found${NC}"
    exit 1
fi

echo -e "${GREEN}Delivery System Rebuild Script${NC}"
echo -e "${BLUE}Mode: $MODE | Clean: $CLEAN_BUILD${NC}"
echo -e "${BLUE}Using: $DOCKER_COMPOSE_FILE${NC}"
echo

# Step 1: Stop all services
echo -e "${YELLOW}Step 1: Stopping all services...${NC}"
$DC down --remove-orphans || true

# Step 2: Clean build if requested
if [[ "$CLEAN_BUILD" == "true" ]]; then
    echo -e "${YELLOW}Step 2: Cleaning Docker resources...${NC}"
    
    # Remove images
    echo "  Removing application images..."
    docker image rm -f \
        delivery-system-backend \
        delivery-system-public-pwa \
        delivery-system-admin-pwa \
        delivery-system-business-pwa \
        delivery-system-driver-pwa \
        2>/dev/null || true
    
    # Clean build cache
    echo "  Cleaning build cache..."
    docker builder prune -f || true
    
    # Remove volumes (optional - preserves data)
    # docker volume prune -f || true
else
    echo -e "${YELLOW}Step 2: Skipping clean (use --clean to clean Docker cache)${NC}"
fi

# Step 3: Build dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
if [[ -f "pnpm-lock.yaml" ]]; then
    echo "  Installing pnpm dependencies..."
    pnpm install
elif [[ -f "package-lock.json" ]]; then
    echo "  Installing npm dependencies..."
    npm install
elif [[ -f "yarn.lock" ]]; then
    echo "  Installing yarn dependencies..."
    yarn install
else
    echo "  No lock file found, skipping dependency installation"
fi

# Step 4: Build TypeScript/assets
echo -e "${YELLOW}Step 4: Building application assets...${NC}"
if [[ "$MODE" == "dev" ]]; then
    echo "  Running development build..."
    pnpm run build 2>/dev/null || npm run build 2>/dev/null || echo "  No build script found"
else
    echo "  Running production build..."
    NODE_ENV=production pnpm run build 2>/dev/null || NODE_ENV=production npm run build 2>/dev/null || echo "  No build script found"
fi

# Step 5: Build Docker images
echo -e "${YELLOW}Step 5: Building Docker images...${NC}"
if [[ "$CLEAN_BUILD" == "true" ]]; then
    $DC build --no-cache --parallel
else
    $DC build --parallel
fi

# Step 6: Start services in proper order
echo -e "${YELLOW}Step 6: Starting services...${NC}"

# Start databases first
echo "  Starting databases..."
$DC up -d mongodb redis
echo "  Waiting for databases (15s)..."
sleep 15

# Start backend
echo "  Starting backend..."
$DC up -d backend
echo "  Waiting for backend (10s)..."
sleep 10

# Start frontend applications
if [[ "$MODE" == "prod" ]]; then
    echo "  Starting PWA applications..."
    $DC up -d public-pwa admin-pwa business-pwa driver-pwa
    echo "  Waiting for PWAs (10s)..."
    sleep 10
    
    # Start nginx
    echo "  Starting nginx..."
    $DC up -d nginx
fi

# Step 7: Health check
echo -e "${YELLOW}Step 7: Health check...${NC}"

# Check container status
echo "  Container status:"
$DC ps

# Check ports
echo "  Port status:"
check_port() {
    local port=$1
    local service=$2
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "    ${GREEN}✓${NC} $service (port $port)"
    else
        echo -e "    ${RED}✗${NC} $service (port $port)"
    fi
}

check_port 3000 "Backend API"
check_port 27017 "MongoDB"
check_port 6379 "Redis"

if [[ "$MODE" == "prod" ]]; then
    check_port 80 "HTTP"
    check_port 443 "HTTPS"
    check_port 3001 "Public PWA"
    check_port 3002 "Admin PWA"
    check_port 3003 "Business PWA"
    check_port 3004 "Driver PWA"
fi

# API health check
echo "  API health:"
if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "    ${GREEN}✓${NC} Backend API is healthy"
else
    echo -e "    ${RED}✗${NC} Backend API health check failed"
fi

# Step 8: Summary
echo
echo -e "${GREEN}=== Rebuild Complete ===${NC}"
echo -e "${BLUE}Mode:${NC} $MODE"
echo -e "${BLUE}Services:${NC} $(docker ps --format "{{.Names}}" | grep delivery | wc -l) running"
echo
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:     $DC logs -f [service-name]"
echo "  Check status:  $DC ps"
echo "  Stop all:      $DC down"
echo "  Monitor:       ./scripts/monitor.sh"

if [[ "$MODE" == "dev" ]]; then
    echo
    echo -e "${YELLOW}Development URLs:${NC}"
    echo "  Backend API:   http://localhost:3000"
    echo "  Public PWA:    http://localhost:3001"
    echo "  Admin PWA:     http://localhost:3002"
    echo "  Business PWA:  http://localhost:3003"
    echo "  Driver PWA:    http://localhost:3004"
fi