#!/bin/bash

echo "=== Container Fix Script ==="
echo "This script attempts to fix common container restart issues"
echo

# Function to check if container is running
check_container() {
    local service=$1
    if docker-compose ps $service | grep -q "Up"; then
        echo "✓ $service is running"
        return 0
    else
        echo "✗ $service is not running"
        return 1
    fi
}

echo "=== Step 1: Stop all containers ==="
docker-compose down
echo

echo "=== Step 2: Clean up dangling images and containers ==="
docker system prune -f
echo

echo "=== Step 3: Check environment file ==="
if [ ! -f .env ]; then
    echo "Creating default .env file..."
    cat > .env << 'EOF'
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=password123
MONGO_DB_NAME=grs_delivery

# Redis Configuration
REDIS_PASSWORD=redis123

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Node Environment
NODE_ENV=production

# API URLs
NEXT_PUBLIC_API_URL=https://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=wss://api.grsdeliver.com
EOF
    echo "✓ Created .env file"
else
    echo "✓ .env file exists"
fi
echo

echo "=== Step 4: Start database services first ==="
docker-compose up -d mongodb redis
echo "Waiting 30 seconds for databases to initialize..."
sleep 30
echo

echo "=== Step 5: Check database connectivity ==="
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
    echo "✓ MongoDB is accessible"
else
    echo "✗ MongoDB connection failed"
fi

if docker-compose exec -T redis redis-cli ping &>/dev/null; then
    echo "✓ Redis is accessible"
else
    echo "✗ Redis connection failed"
fi
echo

echo "=== Step 6: Start backend service ==="
docker-compose up -d backend
echo "Waiting 20 seconds for backend to start..."
sleep 20

check_container backend
echo

echo "=== Step 7: Start PWA services ==="
docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa
echo "Waiting 20 seconds for PWAs to start..."
sleep 20

for service in public-pwa admin-pwa business-pwa driver-pwa; do
    check_container $service
done
echo

echo "=== Step 8: Start nginx ==="
docker-compose up -d nginx
echo "Waiting 10 seconds for nginx to start..."
sleep 10

check_container nginx
echo

echo "=== Step 9: Final status check ==="
docker-compose ps
echo

echo "=== Step 10: Check port availability ==="
for port in 80 443 3000 3001 3002 3003 3004; do
    if netstat -tlnp | grep -q ":$port "; then
        echo "✓ Port $port is listening"
    else
        echo "✗ Port $port is not listening"
    fi
done
echo

echo "Fix script completed. If containers are still restarting, run:"
echo "  ./scripts/debug-containers.sh"
echo "to get detailed error information."