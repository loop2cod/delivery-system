# Clean Deployment Guide for KVM VPS

## Fresh Server Setup

1. **Run server setup on your Ubuntu VPS:**
   ```bash
   ./server-setup.sh
   ```
   This installs Docker, Node.js, pnpm, nginx, and sets up firewall.

2. **Log out and log back in** for Docker group changes to take effect.

## Application Deployment

### Full Deployment (Recommended)
```bash
./deploy.sh
```
This builds everything and starts all services.

### If Docker is not running locally
If you get "Cannot connect to Docker daemon" on your local machine, you can:

1. **Build code only (skip Docker):**
   ```bash
   ./deploy.sh --skip-docker
   ```

2. **Then on your KVM VPS, build Docker images:**
   ```bash
   # After copying files to server
   docker-compose build --no-cache
   docker-compose up -d
   ```

### Individual App Builds
If you want to build apps separately:

```bash
# Build backend only
./build-backend.sh

# Build individual PWAs
./build-public-pwa.sh
./build-admin-pwa.sh
./build-business-pwa.sh
./build-driver-pwa.sh
```

### Deployment Options
```bash
# Skip certain components
./deploy.sh --skip-backend     # Skip backend build
./deploy.sh --skip-pwas        # Skip PWA builds
./deploy.sh --skip-docker      # Skip Docker build
./deploy.sh --build-only       # Build but don't start services

# Build everything but don't start services
./deploy.sh --build-only

# Start services (after build-only)
docker-compose up -d
```

## Service Management

### Check Status
```bash
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f              # All services
docker-compose logs -f backend      # Backend only
docker-compose logs -f public-pwa   # Public PWA only
```

### Stop Services
```bash
docker-compose down
```

### Restart Specific Service
```bash
docker-compose restart backend
```

## Access URLs

- **Backend API:** http://your-server-ip:3000
- **Public PWA:** http://your-server-ip:3001
- **Admin PWA:** http://your-server-ip:3002
- **Business PWA:** http://your-server-ip:3003
- **Driver PWA:** http://your-server-ip:3004

## Troubleshooting

### If build fails:
1. Check logs: `docker-compose logs -f [service-name]`
2. Rebuild specific service: `docker-compose build --no-cache [service-name]`
3. Check disk space: `df -h`
4. Check memory: `free -h`

### If services won't start:
1. Check if ports are available: `netstat -tulpn | grep :3000`
2. Restart Docker: `sudo systemctl restart docker`
3. Clean Docker: `docker system prune -f`

### Complete reset:
```bash
docker-compose down --volumes --remove-orphans
docker system prune -af
./deploy.sh
```

## Key Changes from Previous Scripts

1. **No loops:** Each build script runs once and exits
2. **Sequential builds:** Apps build one at a time, not in parallel
3. **Clear error handling:** Scripts stop on first error
4. **Simple structure:** Each script has a single responsibility
5. **No complex logic:** Straightforward bash commands only

This approach eliminates the infinite loop issues you were experiencing.