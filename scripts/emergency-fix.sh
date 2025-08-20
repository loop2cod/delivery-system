#!/bin/bash

echo "=== EMERGENCY FIX - Simple Single-Stage Build ==="
echo "This script uses a simpler Docker approach to fix the node_modules issue"
echo

echo "Step 1: Stopping all containers..."
docker-compose down

echo "Step 2: Backup current docker-compose and switch to simple version..."
if [ -f docker-compose.yml ]; then
    cp docker-compose.yml docker-compose.yml.backup
    echo "✓ Backed up docker-compose.yml"
fi

cp docker-compose.simple.yml docker-compose.yml
echo "✓ Using simple docker-compose configuration"

echo "Step 3: Remove old images..."
docker image rm -f delivery-system-backend delivery-system-public-pwa delivery-system-admin-pwa delivery-system-business-pwa delivery-system-driver-pwa delivery-system-app 2>/dev/null || true

echo "Step 4: Build single image with all services..."
docker-compose build --no-cache app

echo "Step 5: Create environment file..."
cat > .env << 'EOF'
NODE_ENV=production
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
MONGO_DB_NAME=grs_delivery
REDIS_PASSWORD=redis123
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EOF

echo "Step 6: Start databases..."
docker-compose up -d mongodb redis

echo "Waiting 30 seconds for databases..."
sleep 30

echo "Step 7: Start backend..."
docker-compose up -d backend

echo "Waiting 20 seconds for backend..."
sleep 20

echo "Step 8: Start PWAs..."
docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa

echo "Waiting 15 seconds for PWAs..."
sleep 15

echo "Step 9: Start nginx..."
docker-compose up -d nginx

echo "Step 10: Check status..."
docker-compose ps

echo ""
echo "=== Health Check ==="
sleep 5

echo "Checking backend logs:"
docker-compose logs --tail=5 backend

echo ""
echo "Checking public-pwa logs:"
docker-compose logs --tail=3 public-pwa

echo ""
echo "Port check:"
for port in 3000 3001 3002 3003 3004; do
    if netstat -tlnp | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

echo ""
echo "Emergency fix complete!"
echo ""
echo "To revert to original configuration:"
echo "  mv docker-compose.yml.backup docker-compose.yml"
echo ""
echo "To check detailed logs:"
echo "  docker-compose logs -f [service-name]"