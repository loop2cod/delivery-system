# GRS Delivery System - Deployment Guide

This guide will help you deploy the GRS Delivery Management System on your KVM VPS with the following subdomain structure:

- **grsdeliver.com** - Public customer-facing PWA
- **admin.grsdeliver.com** - Admin control panel
- **business.grsdeliver.com** - Business partner portal
- **driver.grsdeliver.com** - Driver mobile app
- **api.grsdeliver.com** - Backend API

## Prerequisites

- Ubuntu 20.04+ or Debian 11+ VPS
- Root access to the server
- Domain name configured with DNS pointing to your server IP
- At least 4GB RAM and 2 CPU cores recommended
- 50GB+ storage space

## Quick Start

### 1. Initial Server Setup

```bash
# Connect to your VPS
ssh root@your-server-ip

# Clone the repository
git clone https://github.com/yourusername/grs-delivery.git /opt/grs-delivery
cd /opt/grs-delivery

# Make scripts executable
chmod +x scripts/*.sh

# Run server setup (installs Docker, Nginx, etc.)
./scripts/setup-server.sh
```

### 2. Configure Environment

```bash
# Copy and edit environment file
cp .env.production .env
nano .env

# Update the following variables:
# - MONGO_ROOT_PASSWORD (use a strong password)
# - REDIS_PASSWORD (use a strong password)
# - JWT_SECRET (minimum 32 characters)
# - SMTP_* (for email notifications)
```

### 3. Setup SSL Certificates

```bash
# Install SSL certificates for all domains
certbot certonly --standalone -d grsdeliver.com
certbot certonly --standalone -d admin.grsdeliver.com
certbot certonly --standalone -d business.grsdeliver.com
certbot certonly --standalone -d driver.grsdeliver.com
certbot certonly --standalone -d api.grsdeliver.com

# Copy certificates to nginx directory
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/grsdeliver.com/fullchain.pem nginx/ssl/grsdeliver.com.crt
cp /etc/letsencrypt/live/grsdeliver.com/privkey.pem nginx/ssl/grsdeliver.com.key
cp /etc/letsencrypt/live/admin.grsdeliver.com/fullchain.pem nginx/ssl/admin.grsdeliver.com.crt
cp /etc/letsencrypt/live/admin.grsdeliver.com/privkey.pem nginx/ssl/admin.grsdeliver.com.key
cp /etc/letsencrypt/live/business.grsdeliver.com/fullchain.pem nginx/ssl/business.grsdeliver.com.crt
cp /etc/letsencrypt/live/business.grsdeliver.com/privkey.pem nginx/ssl/business.grsdeliver.com.key
cp /etc/letsencrypt/live/driver.grsdeliver.com/fullchain.pem nginx/ssl/driver.grsdeliver.com.crt
cp /etc/letsencrypt/live/driver.grsdeliver.com/privkey.pem nginx/ssl/driver.grsdeliver.com.key
cp /etc/letsencrypt/live/api.grsdeliver.com/fullchain.pem nginx/ssl/api.grsdeliver.com.crt
cp /etc/letsencrypt/live/api.grsdeliver.com/privkey.pem nginx/ssl/api.grsdeliver.com.key
```

### 4. Deploy Application

```bash
# Run deployment script
./scripts/deploy.sh production
```

### 5. Verify Deployment

```bash
# Check system status
grs-status

# Check application logs
docker-compose logs -f

# Test endpoints
curl https://grsdeliver.com
curl https://admin.grsdeliver.com
curl https://business.grsdeliver.com
curl https://driver.grsdeliver.com
curl https://api.grsdeliver.com/health
```

## DNS Configuration

Configure your DNS records to point to your server IP:

```
A     grsdeliver.com           -> YOUR_SERVER_IP
A     admin.grsdeliver.com     -> YOUR_SERVER_IP
A     business.grsdeliver.com  -> YOUR_SERVER_IP
A     driver.grsdeliver.com    -> YOUR_SERVER_IP
A     api.grsdeliver.com       -> YOUR_SERVER_IP
```

## Updating the Application

When you make changes to your code and want to deploy updates:

```bash
# Navigate to application directory
cd /opt/grs-delivery

# Run update script
./scripts/update.sh

# Choose update method:
# 1) Rolling update (zero downtime)
# 2) Quick update (brief downtime)
```

## Monitoring and Maintenance

### System Status
```bash
# Check overall system status
grs-status

# Check Docker containers
docker ps

# Check logs
docker-compose logs -f [service-name]
```

### Backup and Restore
```bash
# Backups are automatically created during deployment
# Manual backup
docker run --rm \
  -v grs-delivery_mongodb_data:/data/mongodb \
  -v grs-delivery_redis_data:/data/redis \
  -v /opt/backups/grs-delivery:/backup \
  alpine:latest \
  tar czf /backup/manual_backup_$(date +%Y%m%d_%H%M%S).tar.gz /data

# Restore from backup
docker-compose down
docker run --rm \
  -v grs-delivery_mongodb_data:/data/mongodb \
  -v grs-delivery_redis_data:/data/redis \
  -v /opt/backups/grs-delivery:/backup \
  alpine:latest \
  tar xzf /backup/backup_TIMESTAMP.tar.gz -C /
docker-compose up -d
```

### SSL Certificate Renewal
```bash
# Certificates auto-renew, but you can manually renew:
certbot renew

# Update nginx certificates after renewal
./scripts/update-ssl.sh
```

## Troubleshooting

### Common Issues

1. **Containers not starting**
   ```bash
   # Check logs
   docker-compose logs [service-name]
   
   # Restart specific service
   docker-compose restart [service-name]
   ```

2. **SSL certificate issues**
   ```bash
   # Check certificate validity
   openssl x509 -in nginx/ssl/grsdeliver.com.crt -text -noout
   
   # Renew certificates
   certbot renew --force-renewal
   ```

3. **Database connection issues**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Connect to MongoDB
   docker exec -it grs-mongodb mongo -u admin -p
   ```

4. **High memory usage**
   ```bash
   # Check memory usage
   free -h
   
   # Restart services to free memory
   docker-compose restart
   ```

### Performance Optimization

1. **Enable Redis caching**
   - Ensure Redis is properly configured in your backend
   - Monitor Redis memory usage

2. **Optimize Docker images**
   ```bash
   # Remove unused images
   docker image prune -f
   
   # Remove unused volumes (be careful!)
   docker volume prune -f
   ```

3. **Monitor resource usage**
   ```bash
   # Install monitoring tools
   apt install htop iotop nethogs
   
   # Monitor in real-time
   htop
   ```

## Security Considerations

1. **Firewall Configuration**
   - Only ports 22 (SSH), 80 (HTTP), and 443 (HTTPS) should be open
   - Use fail2ban for SSH protection

2. **Regular Updates**
   - System packages are automatically updated
   - Monitor security advisories for Docker and Node.js

3. **Database Security**
   - Use strong passwords for MongoDB and Redis
   - Regularly backup your data
   - Consider encrypting backups

4. **SSL/TLS**
   - Use strong SSL configurations
   - Regularly update certificates
   - Monitor certificate expiration

## Support

For issues and questions:
1. Check the logs: `docker-compose logs -f`
2. Review this documentation
3. Check the GitHub issues page
4. Contact the development team

## Architecture Overview

```
Internet
    ↓
Nginx (Port 80/443)
    ↓
┌─────────────────────────────────────────┐
│  Docker Network (grs-network)          │
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │Public   │  │Admin    │  │Business │ │
│  │PWA      │  │PWA      │  │PWA      │ │
│  │:3001    │  │:3002    │  │:3003    │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│                                         │
│  ┌─────────┐  ┌─────────┐              │
│  │Driver   │  │Backend  │              │
│  │PWA      │  │API      │              │
│  │:3004    │  │:3000    │              │
│  └─────────┘  └─────────┘              │
│                    ↓                    │
│  ┌─────────┐  ┌─────────┐              │
│  │MongoDB  │  │Redis    │              │
│  │:27017   │  │:6379    │              │
│  └─────────┘  └─────────┘              │
└─────────────────────────────────────────┘
```