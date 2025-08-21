#!/bin/bash

# Fix Docker Network Issues Script
set -e

echo "🔧 Fixing Docker network issues..."

echo "1. Stopping all containers:"
docker-compose down --remove-orphans

echo "2. Cleaning up Docker networks:"
docker network prune -f

echo "3. Removing dangling containers:"
docker container prune -f

echo "4. Check current networks:"
docker network ls

echo "5. Starting services step by step:"

echo "  - Starting Redis..."
docker-compose up -d redis
sleep 5

echo "  - Starting Backend..."
docker-compose up -d backend
sleep 10

echo "  - Starting PWAs..."
docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa
sleep 10

echo "  - Starting Nginx..."
docker-compose up -d nginx
sleep 10

echo "6. Check all container status:"
docker-compose ps

echo "7. Check nginx logs:"
docker-compose logs --tail=15 nginx

echo "8. Test nginx:"
curl -f -s http://localhost/ && echo "✅ Nginx working!" || echo "❌ Nginx still not working"

echo "9. Test domain routing:"
curl -H 'Host: grsdeliver.com' -f -s http://localhost/ && echo "✅ Domain routing working!" || echo "❌ Domain routing not working"

echo ""
echo "🎉 Docker network fix completed!"
echo ""
echo "🧪 Test your domains:"
echo "  curl -H 'Host: grsdeliver.com' http://31.97.235.250"
echo "  curl -H 'Host: api.grsdeliver.com' http://31.97.235.250/health"