# GRS Delivery System - Troubleshooting Guide

## Port 80/443 Already in Use

**Error:** `Could not bind TCP port 80 because it is already in use`

### Quick Fix

Run the port conflict resolution script:
```bash
sudo ./scripts/fix-port-conflict.sh
```

Choose option 1 to stop conflicting services, or option 2 to use alternative ports.

### Manual Resolution

1. **Check what's using the ports:**
   ```bash
   sudo lsof -i :80
   sudo lsof -i :443
   ```

2. **Stop Apache (if running):**
   ```bash
   sudo systemctl stop apache2
   sudo systemctl disable apache2
   ```

3. **Stop Nginx (if running):**
   ```bash
   sudo systemctl stop nginx
   sudo systemctl disable nginx
   ```

4. **Kill any remaining processes:**
   ```bash
   sudo pkill -f "nginx\|apache"
   ```

### Alternative: Use Different Ports

If you can't stop the existing web server, deploy on alternative ports:

```bash
# Create alternative ports configuration
cat > docker-compose.alt-ports.yml << 'EOF'
version: '3.8'
services:
  nginx:
    ports:
      - "8080:80"
      - "8443:443"
EOF

# Deploy with alternative ports
docker-compose -f docker-compose.yml -f docker-compose.alt-ports.yml up -d
```

Access your application at:
- HTTP: `http://your-server-ip:8080`
- HTTPS: `https://your-server-ip:8443`

## Common Issues and Solutions

### 1. Docker Permission Denied

**Error:** `permission denied while trying to connect to the Docker daemon socket`

**Solution:**
```bash
sudo usermod -aG docker $USER
newgrp docker
# Or logout and login again
```

### 2. Out of Disk Space

**Error:** `no space left on device`

**Solution:**
```bash
# Clean Docker images and containers
docker system prune -a -f

# Check disk usage
df -h

# Clean logs
sudo journalctl --vacuum-time=7d
```

### 3. Memory Issues

**Error:** Container keeps restarting or OOM killed

**Solution:**
```bash
# Check memory usage
free -h

# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 4. SSL Certificate Issues

**Error:** SSL certificate not found or expired

**Solution:**
```bash
# Install certificates
sudo certbot certonly --standalone -d grsdeliver.com
sudo certbot certonly --standalone -d admin.grsdeliver.com
sudo certbot certonly --standalone -d business.grsdeliver.com
sudo certbot certonly --standalone -d driver.grsdeliver.com
sudo certbot certonly --standalone -d api.grsdeliver.com

# Update nginx certificates
sudo ./scripts/update-ssl.sh
```

### 5. Database Connection Issues

**Error:** Cannot connect to MongoDB or Redis

**Solution:**
```bash
# Check container status
docker ps

# Check logs
docker-compose logs mongodb
docker-compose logs redis

# Restart database services
docker-compose restart mongodb redis
```

### 6. Application Not Loading

**Error:** 502 Bad Gateway or connection refused

**Solution:**
```bash
# Check all containers are running
docker ps

# Check application logs
docker-compose logs backend
docker-compose logs public-pwa

# Restart services
docker-compose restart
```

### 7. Build Failures

**Error:** Docker build fails

**Solution:**
```bash
# Clean build cache
docker builder prune -a -f

# Rebuild without cache
docker-compose build --no-cache

# Check available space
df -h
```

## Monitoring Commands

### Check System Status
```bash
# Overall system health
./scripts/monitor.sh

# Docker containers
docker ps -a

# System resources
htop
df -h
free -h
```

### Check Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# System logs
sudo journalctl -f
```

### Check Network
```bash
# Open ports
sudo netstat -tulpn

# Test connectivity
curl http://localhost:3000/health
curl http://localhost:3001
```

## Recovery Procedures

### Rollback Deployment
```bash
# Using update script
./scripts/update.sh
# Choose option 4 for rollback

# Manual rollback
git log --oneline -5
git checkout PREVIOUS_COMMIT_HASH
docker-compose down
docker-compose build
docker-compose up -d
```

### Restore from Backup
```bash
# List available backups
ls -la /opt/backups/grs-delivery/

# Stop services
docker-compose down

# Restore data
docker run --rm \
  -v grs-delivery_mongodb_data:/data/mongodb \
  -v grs-delivery_redis_data:/data/redis \
  -v /opt/backups/grs-delivery:/backup \
  alpine:latest \
  tar xzf /backup/backup_TIMESTAMP.tar.gz -C /

# Start services
docker-compose up -d
```

### Complete Reset
```bash
# WARNING: This will delete all data
docker-compose down -v
docker system prune -a -f
docker volume prune -f

# Redeploy
./scripts/deploy.sh production
```

## Performance Optimization

### Optimize Docker Images
```bash
# Remove unused images
docker image prune -a -f

# Remove unused volumes (be careful!)
docker volume prune -f

# Remove unused networks
docker network prune -f
```

### Database Optimization
```bash
# MongoDB optimization
docker exec grs-mongodb mongo --eval "db.runCommand({compact: 'your_collection'})"

# Redis optimization
docker exec grs-redis redis-cli FLUSHDB
```

## Getting Help

1. **Check logs first:**
   ```bash
   docker-compose logs -f
   ```

2. **Run system monitor:**
   ```bash
   ./scripts/monitor.sh
   ```

3. **Check this troubleshooting guide**

4. **Search for similar issues online**

5. **Contact support with:**
   - Error messages
   - System information (`uname -a`)
   - Docker version (`docker --version`)
   - Container status (`docker ps -a`)
   - Relevant logs

## Prevention Tips

1. **Regular monitoring:**
   ```bash
   # Add to crontab for daily health checks
   0 9 * * * /opt/grs-delivery/scripts/monitor.sh >> /var/log/grs-health.log
   ```

2. **Automated backups:**
   ```bash
   # Add to crontab for daily backups
   0 2 * * * /opt/grs-delivery/scripts/backup.sh
   ```

3. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Monitor disk space:**
   ```bash
   # Alert when disk usage > 80%
   df -h | awk '$5 > 80 {print $0}' | mail -s "Disk Space Alert" admin@example.com
   ```