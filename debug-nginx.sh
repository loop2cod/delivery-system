#!/bin/bash

# Debug Nginx Issues Script
set -e

echo "🔍 Debugging nginx issues..."

echo "1. Checking nginx container status:"
docker-compose ps nginx

echo -e "\n2. Nginx container logs:"
docker-compose logs --tail=30 nginx

echo -e "\n3. Check if nginx is listening on port 80:"
docker exec grs-nginx netstat -tlnp | grep :80 || echo "  Nginx not listening on port 80"

echo -e "\n4. Check nginx configuration syntax:"
docker exec grs-nginx nginx -t || echo "  Nginx config has errors"

echo -e "\n5. Check what's using port 80 on host:"
sudo netstat -tlnp | grep :80 || echo "  Nothing using port 80 on host"

echo -e "\n6. Check nginx container port mapping:"
docker port grs-nginx || echo "  No port mappings found"

echo -e "\n7. Test nginx from inside container:"
docker exec grs-nginx curl -f -s http://localhost:80/ && echo "✅ Nginx responding inside container" || echo "❌ Nginx not responding inside container"

echo -e "\n8. Check nginx process inside container:"
docker exec grs-nginx ps aux | grep nginx

echo -e "\n9. Manual nginx restart attempt:"
docker-compose restart nginx
sleep 5
docker-compose ps nginx

echo -e "\n10. Final test:"
curl -f -s http://localhost:80/ && echo "✅ Nginx now working" || echo "❌ Nginx still not working"