#!/bin/bash

# Debug SSL Issues Script
set -e

echo "🔍 Debugging SSL/522 error issues..."

echo "1. Check nginx container status:"
docker-compose ps nginx

echo -e "\n2. Check nginx logs for SSL errors:"
docker-compose logs --tail=30 nginx

echo -e "\n3. Check if SSL certificates exist:"
ls -la ./nginx/ssl/ 2>/dev/null || echo "  No SSL directory found"

echo -e "\n4. Test nginx config syntax:"
docker exec grs-nginx nginx -t 2>/dev/null || echo "  Cannot test config (container down?)"

echo -e "\n5. Check what's listening on ports 80/443:"
sudo netstat -tlnp | grep -E ':(80|443) ' || echo "  No processes on 80/443"

echo -e "\n6. Test HTTP (port 80) access:"
curl -f -s http://localhost/ && echo "✅ HTTP working" || echo "❌ HTTP not working"

echo -e "\n7. Test HTTPS (port 443) access:"
curl -f -s -k https://localhost/ && echo "✅ HTTPS working" || echo "❌ HTTPS not working"

echo -e "\n8. Check nginx SSL configuration files:"
find ./nginx -name "*.conf" -exec echo "=== {} ===" \; -exec head -20 {} \;

echo -e "\n9. Test domain with HTTP first:"
curl -H 'Host: grsdeliver.com' -f -s http://31.97.235.250/ && echo "✅ HTTP domain routing works" || echo "❌ HTTP domain routing fails"

echo -e "\n10. Check nginx error logs inside container:"
docker exec grs-nginx cat /var/log/nginx/error.log 2>/dev/null | tail -10 || echo "  No error log or container not running"

echo -e "\n🔧 Quick fixes to try:"
echo "  - HTTP only: ./fix-nginx-simple.sh"
echo "  - Restart nginx: docker-compose restart nginx"
echo "  - Check nginx config: docker exec grs-nginx nginx -t"