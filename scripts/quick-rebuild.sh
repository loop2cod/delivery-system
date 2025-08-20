#!/bin/bash

set -e

echo "=== Quick Rebuild Script ==="
echo "This script rebuilds containers with the fixed node_modules issue"
echo

# Detect Docker Compose command (v2 preferred)
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  echo "ERROR: Docker Compose not found. Install Docker Compose v2 (preferred) or v1." >&2
  echo " - For v2: https://docs.docker.com/compose/install/linux/"
  echo " - For v1 (legacy): apt-get install docker-compose"
  exit 1
fi

echo "Step 1: Stopping all containers..."
$DC down || true

echo "Step 2: Removing old images to force rebuild..."
docker image rm -f delivery-system-backend delivery-system-public-pwa delivery-system-admin-pwa delivery-system-business-pwa delivery-system-driver-pwa 2>/dev/null || true

echo "Step 3: Building with no cache..."
$DC build --no-cache

echo "Step 4: Starting databases first..."
$DC up -d mongodb redis

echo "Waiting 30 seconds for databases..."
sleep 30

echo "Step 5: Starting backend..."
$DC up -d backend

echo "Waiting 20 seconds for backend..."
sleep 20

echo "Step 6: Starting PWAs..."
$DC up -d public-pwa admin-pwa business-pwa driver-pwa

echo "Waiting 15 seconds for PWAs..."
sleep 15

echo "Step 7: Starting nginx..."
$DC up -d nginx

echo "Step 8: Checking status..."
$DC ps

echo ""
echo "=== Quick Health Check ==="
echo "Backend logs (last 10 lines):"
$DC logs --tail=10 backend || true

echo ""
echo "Public PWA logs (last 5 lines):"
$DC logs --tail=5 public-pwa || true

echo ""
echo "=== Port Check ==="
port_listen() {
  if command -v ss >/dev/null 2>&1; then
    ss -tln | grep -q ":$1 "
  else
    netstat -tlnp 2>/dev/null | grep -q ":$1 "
  fi
}

for port in 3000 3001 3002 3003 3004; do
  if port_listen "$port"; then
    echo "✓ Port $port is active"
  else
    echo "✗ Port $port is not active"
  fi
done

echo ""
echo "Rebuild complete! Check the status above."
echo "If containers are still failing, check logs with:"
echo "  $DC logs -f [service-name]"