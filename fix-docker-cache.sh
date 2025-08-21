#!/bin/bash

# Fix Docker Cache Issue Script
set -e

echo "🧹 Cleaning Docker cache and rebuilding..."

# Stop all containers
echo "1. Stopping all containers..."
docker-compose down --remove-orphans || true

# Clean Docker completely
echo "2. Cleaning Docker cache..."
docker system prune -af --volumes
docker builder prune -af

# Remove any existing images
echo "3. Removing existing images..."
docker images | grep -E "(delivery|grs)" | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

# Rebuild with no cache
echo "4. Rebuilding with no cache..."
docker-compose build --no-cache --parallel

echo "✅ Docker cache cleaned and images rebuilt!"
echo ""
echo "Now you can start services with:"
echo "  docker-compose up -d"