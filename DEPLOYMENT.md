# Deployment Instructions

## Container Restart Issues - CRITICAL FIX APPLIED

**ISSUE IDENTIFIED:** Containers failing with "Cannot find module" errors because `node_modules` are missing in production containers.

**ROOT CAUSE:** The Docker build process wasn't properly copying production dependencies to the production stages.

**SOLUTION:** Updated Dockerfile to create a separate production dependencies stage and copy `node_modules` from the correct build stage.

The containers were restarting due to several configuration mismatches that have been resolved:

### 1. Docker Configuration Issues Fixed:
- ✅ **CRITICAL:** Fixed missing `node_modules` in production containers
- ✅ Added separate production dependencies build stage
- ✅ Fixed shell execution error by updating CMD structure
- ✅ Added proper working directories for each PWA
- ✅ Included missing `next.config.js` files
- ✅ Added `dumb-init` for proper process management
- ✅ Fixed environment variable handling

### 2. Environment Configuration Fixed:
- ✅ Created `.env.production` with correct MongoDB/Redis URLs
- ✅ Updated backend to handle both `MONGODB_URL` and `MONGODB_URI`
- ✅ Added environment setup script for production

### 3. IMMEDIATE FIX on Server:

**CRITICAL:** The current containers are failing due to missing `node_modules`. You MUST rebuild the images with the fixed Dockerfile.

```bash
# Navigate to the project directory
cd /root/delivery-system

# OPTION 1: Quick rebuild (recommended)
./scripts/quick-rebuild.sh

# OPTION 2: Manual fix if quick rebuild doesn't work
./scripts/fix-containers.sh

# OPTION 3: If issues persist, debug first
./scripts/debug-containers.sh
```

**Important:** You must rebuild the Docker images - restarting containers won't fix this issue.

### 4. Manual Fix Steps:

If the automated script doesn't work, follow these manual steps:

```bash
# 1. Create proper environment file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/grs_delivery?authSource=admin
MONGODB_URL=mongodb://admin:password123@mongodb:27017/grs_delivery?authSource=admin
REDIS_URL=redis://:redis123@redis:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
COOKIE_SECRET=your-super-secret-cookie-key-change-in-production
CORS_ORIGIN=https://grsdeliver.com,https://admin.grsdeliver.com,https://business.grsdeliver.com,https://driver.grsdeliver.com
NEXT_PUBLIC_API_URL=https://api.grsdeliver.com
NEXT_PUBLIC_WS_URL=wss://api.grsdeliver.com
EOF

# 2. Rebuild the containers with no cache
docker-compose build --no-cache

# 3. Start databases first
docker-compose up -d mongodb redis

# 4. Wait for databases to be ready
sleep 30

# 5. Start backend
docker-compose up -d backend

# 6. Wait for backend to be ready
sleep 20

# 7. Start PWAs
docker-compose up -d public-pwa admin-pwa business-pwa driver-pwa

# 8. Start nginx
docker-compose up -d nginx

# 9. Check status
docker-compose ps
```

### 5. Common Issues and Solutions:

#### Issue: "MONGODB_URI environment variable not set"
**Solution:** Ensure the `.env` file contains both `MONGODB_URL` and `MONGODB_URI`

#### Issue: "Cannot connect to MongoDB"
**Solution:** Check if MongoDB container is running and accessible:
```bash
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
```

#### Issue: "Port already in use"
**Solution:** Stop conflicting services:
```bash
# Check what's using the ports
netstat -tlnp | grep -E ':(80|443|3000|3001|3002|3003|3004)'

# Kill conflicting processes if needed
sudo fuser -k 80/tcp 443/tcp 3000/tcp
```

#### Issue: "Container keeps restarting"
**Solution:** Check container logs:
```bash
docker-compose logs -f [service-name]
```

### 6. Health Check Commands:

After deployment, verify everything is working:

```bash
# Check all containers are running
docker-compose ps

# Check MongoDB connectivity
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check Redis connectivity
docker-compose exec redis redis-cli ping

# Check backend API
curl -f http://localhost:3000/health || echo "Backend not responding"

# Check PWA applications
for port in 3001 3002 3003 3004; do
  curl -f http://localhost:$port || echo "Port $port not responding"
done

# Check nginx
curl -f http://localhost || echo "Nginx not responding"
```

### 7. Monitoring:

Use the provided monitoring script:
```bash
./scripts/monitor.sh
```

### 8. SSL Certificates:

If SSL certificates are missing, you'll need to:
1. Install certbot
2. Generate certificates for your domains
3. Update nginx configuration
4. Restart nginx

The specific SSL setup would depend on your domain configuration and DNS settings.

---

## Summary

The main issues causing container restarts were:
1. **Docker CMD format** - Fixed working directories and command structure
2. **Environment variables** - Mismatched variable names between Docker Compose and backend
3. **Missing files** - Added next.config.js and environment setup
4. **Process management** - Added dumb-init for proper signal handling

All these issues have been fixed in the updated Dockerfile and configuration files.