#!/bin/bash

echo "=== Container Debug Script ==="
echo "Generated at: $(date)"
echo

echo "=== Container Status Details ==="
docker-compose ps -a
echo

echo "=== Backend Container Logs (Last 30 lines) ==="
docker-compose logs --tail=30 backend
echo

echo "=== Public PWA Container Logs (Last 20 lines) ==="
docker-compose logs --tail=20 public-pwa
echo

echo "=== Admin PWA Container Logs (Last 20 lines) ==="
docker-compose logs --tail=20 admin-pwa
echo

echo "=== Business PWA Container Logs (Last 20 lines) ==="
docker-compose logs --tail=20 business-pwa
echo

echo "=== Driver PWA Container Logs (Last 20 lines) ==="
docker-compose logs --tail=20 driver-pwa
echo

echo "=== Nginx Container Logs (Last 20 lines) ==="
docker-compose logs --tail=20 nginx
echo

echo "=== Container Resource Usage ==="
docker stats --no-stream
echo

echo "=== Network Information ==="
docker network ls
docker network inspect delivery-system_grs-network 2>/dev/null || echo "Network not found"
echo

echo "=== Volume Information ==="
docker volume ls | grep delivery
echo

echo "=== Environment Variables Check ==="
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "MONGODB_URI present: $([ -n "$MONGODB_URI" ] && echo "yes" || echo "no")"
echo "JWT_SECRET present: $([ -n "$JWT_SECRET" ] && echo "yes" || echo "no")"
echo

echo "=== Image Information ==="
docker images | grep delivery
echo

echo "=== Container Restart Counts ==="
docker-compose ps --format "table {{.Name}}\t{{.State}}\t{{.Status}}"
echo

echo "=== Memory and Disk Space ==="
free -h
df -h
echo

echo "=== Port Usage ==="
netstat -tlnp | grep -E ':(80|443|3000|3001|3002|3003|3004|27017|6379)'
echo

echo "Debug complete. Check logs above for specific error messages."