#!/bin/bash

# Debug Backend Issues Script
set -e

echo "🔍 Debugging backend issues..."

echo "1. Checking backend logs:"
docker-compose -f docker-compose.no-nginx.yml logs --tail=50 backend

echo -e "\n2. Backend container details:"
docker inspect grs-backend --format='{{.State.Status}}: {{.State.Error}}'

echo -e "\n3. Checking if backend can connect to Atlas:"
echo "Testing MongoDB Atlas connectivity..."
docker exec grs-backend ping -c 3 grs.e9af7mt.mongodb.net || echo "Cannot reach Atlas"

echo -e "\n4. Checking Redis connectivity:"
docker exec grs-backend ping -c 3 redis || echo "Cannot reach Redis"

echo -e "\n5. Environment variables in backend:"
docker exec grs-backend env | grep -E "(MONGODB|REDIS|NODE_ENV)" || echo "No relevant env vars found"

echo -e "\n6. Restart backend and follow logs:"
docker-compose -f docker-compose.no-nginx.yml restart backend
echo "Following logs for 30 seconds..."
timeout 30s docker-compose -f docker-compose.no-nginx.yml logs -f backend || echo "Logs ended"