#!/bin/bash

# Fix Port Conflict Script
set -e

echo "🔍 Checking port conflicts..."

# Check what's using port 80
echo "1. Checking what's using port 80:"
sudo netstat -tulpn | grep :80 || echo "  No processes found on port 80"
sudo ss -tulpn | grep :80 || echo "  No processes found on port 80 (ss)"

# Check what's using port 443
echo "2. Checking what's using port 443:"
sudo netstat -tulpn | grep :443 || echo "  No processes found on port 443"
sudo ss -tulpn | grep :443 || echo "  No processes found on port 443 (ss)"

# Stop system nginx if running
echo "3. Stopping system nginx if running..."
sudo systemctl stop nginx 2>/dev/null || echo "  nginx not running or not installed"
sudo systemctl disable nginx 2>/dev/null || echo "  nginx not installed"

# Kill any processes using ports 80/443
echo "4. Killing processes on ports 80 and 443..."
sudo fuser -k 80/tcp 2>/dev/null || echo "  No processes to kill on port 80"
sudo fuser -k 443/tcp 2>/dev/null || echo "  No processes to kill on port 443"

# Stop any existing Docker containers
echo "5. Stopping existing Docker containers..."
docker-compose down --remove-orphans || true

# Wait a moment
echo "6. Waiting for ports to be released..."
sleep 5

# Check ports are free
echo "7. Verifying ports are free:"
if netstat -tulpn | grep -q :80; then
    echo "  ❌ Port 80 still in use"
    netstat -tulpn | grep :80
else
    echo "  ✅ Port 80 is free"
fi

if netstat -tulpn | grep -q :443; then
    echo "  ❌ Port 443 still in use" 
    netstat -tulpn | grep :443
else
    echo "  ✅ Port 443 is free"
fi

echo ""
echo "✅ Port conflict resolution completed!"
echo ""
echo "Now you can start Docker services:"
echo "  docker-compose up -d"