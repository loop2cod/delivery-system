#!/bin/bash

# Fix Nginx Container Script
set -e

echo "🔧 Fixing nginx container..."

echo "1. Current container status:"
docker-compose ps

echo -e "\n2. Check if nginx container exists but stopped:"
docker ps -a | grep nginx || echo "  No nginx container found"

echo -e "\n3. Force restart nginx service:"
docker-compose up -d nginx

echo -e "\n4. Wait for nginx to start:"
sleep 10

echo -e "\n5. Check nginx status again:"
docker-compose ps nginx

echo -e "\n6. Check nginx logs for errors:"
docker-compose logs --tail=20 nginx

echo -e "\n7. Verify port 80 is mapped:"
docker port grs-nginx 2>/dev/null || echo "  Container not found or no ports mapped"

echo -e "\n8. Test nginx access:"
curl -f -s http://localhost:80/ && echo "✅ Nginx working!" || echo "❌ Nginx still not accessible"

echo -e "\n9. If still not working, check nginx config:"
docker exec grs-nginx nginx -t 2>/dev/null || echo "  Cannot check config (container not running?)"

echo -e "\n10. Full container list:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(nginx|NAMES)"