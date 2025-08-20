#!/bin/bash

echo "=== Quick Rebuild Script ==="
echo "This script rebuilds containers with the fixed node_modules issue"
echo

echo "Step 1: Stopping all containers..."
docker-compose down

echo "Step 2: Removing old images to force rebuild..."
docker image rm -f delivery-system-backend delivery-system-public-pwa delivery-system-admin-pwa delivery-system-business-pwa delivery-system-driver-pwa 2>/dev/null || true

echo "Step 3: Building with no cache..."
docker-compose build --no-cache

echo "Step 4: Starting databases first..."
docker-compose up -d mongodb redis

echo "Waiting 30 seconds for databases..."
sleep 30

echo "Step 5: Starting backend..."
docker-compose up -d backend

echo "Waiting 20 seconds for backend..."
sleep 20

echo "Step 6: Starting PWAs..."
docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa

echo "Waiting 15 seconds for PWAs..."
sleep 15

echo "Step 7: Starting nginx..."
docker-compose up -d nginx

echo "Step 8: Checking status..."
docker-compose ps

echo ""
echo "=== Quick Health Check ==="
echo "Backend logs (last 10 lines):"
docker-compose logs --tail=10 backend

echo ""
echo "Public PWA logs (last 5 lines):"
docker-compose logs --tail=5 public-pwa

echo ""
echo "=== Port Check ==="
for port in 3000 3001 3002 3003 3004; do
    if netstat -tlnp | grep -q ":$port "; then
        echo "✓ Port $port is active"
    else
        echo "✗ Port $port is not active"
    fi
done

echo ""
echo "Rebuild complete! Check the status above."
echo "If containers are still failing, check logs with:"
echo "  docker-compose logs -f [service-name]"