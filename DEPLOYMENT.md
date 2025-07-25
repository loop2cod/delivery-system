# 🚀 UAE Delivery Management System - Production Deployment Guide

## 📋 Table of Contents
- [System Overview](#system-overview)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Pre-deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Application Deployment](#application-deployment)
- [Monitoring Setup](#monitoring-setup)
- [SSL/Security Configuration](#ssl-security-configuration)
- [Performance Optimization](#performance-optimization)
- [Backup & Recovery](#backup--recovery)
- [Maintenance & Updates](#maintenance--updates)
- [Troubleshooting](#troubleshooting)

## 🏗️ System Overview

The UAE Delivery Management System consists of:
- **4 Progressive Web Applications (PWAs)**
  - Public Customer Portal (`localhost:3000`)
  - Admin Management Dashboard (`localhost:3002`)
  - Business Partner Portal (`localhost:3003`)
  - Driver Mobile App (`localhost:3004`)
- **Backend API Server** (`localhost:3001`)
- **PostgreSQL Database** (Primary data storage)
- **Redis Cache** (Session management & real-time data)
- **Monitoring Stack** (Prometheus, Grafana, Alertmanager)

## 🖥️ Infrastructure Requirements

### Minimum Production Requirements
```
CPU: 8 cores (2.4GHz+)
RAM: 32GB
Storage: 500GB SSD
Network: 1Gbps
OS: Ubuntu 22.04 LTS or RHEL 8+
```

### Recommended Production Setup
```
CPU: 16 cores (3.0GHz+)
RAM: 64GB
Storage: 1TB NVMe SSD
Network: 10Gbps
Load Balancer: 2x instances
Database: Master-slave replication
Cache: Redis Cluster (3 nodes)
```

### Cloud Provider Specifications

#### AWS Setup
- **EC2 Instances**: t3.2xlarge (minimum) or c5.4xlarge (recommended)
- **RDS**: PostgreSQL 15.x with Multi-AZ deployment
- **ElastiCache**: Redis 7.x cluster mode
- **Application Load Balancer** for traffic distribution
- **Route 53** for DNS management
- **CloudFront** CDN for static assets

#### Google Cloud Setup
- **Compute Engine**: n2-standard-8 (minimum) or c2-standard-16 (recommended)
- **Cloud SQL**: PostgreSQL 15.x with high availability
- **Memorystore**: Redis instance
- **Load Balancing** for traffic distribution
- **Cloud CDN** for static assets

#### Azure Setup
- **Virtual Machines**: Standard_D8s_v3 (minimum) or Standard_F16s_v2 (recommended)
- **Azure Database**: PostgreSQL Flexible Server
- **Azure Cache**: Redis Enterprise
- **Application Gateway** for load balancing
- **Azure CDN** for static assets

## ✅ Pre-deployment Checklist

### Domain & SSL Setup
- [ ] Domain name registered (.ae domain recommended)
- [ ] SSL certificates obtained (Let's Encrypt or commercial)
- [ ] DNS records configured
- [ ] CDN setup (CloudFlare/AWS CloudFront)

### Environment Configuration
- [ ] Production environment variables set
- [ ] Database connection strings configured
- [ ] Redis connection details configured
- [ ] JWT secrets generated (256-bit minimum)
- [ ] SMTP server configured for notifications
- [ ] File storage setup (AWS S3/Google Cloud Storage)

### Security Setup
- [ ] Firewall rules configured
- [ ] VPN access setup for admin systems
- [ ] Database access restricted to application servers
- [ ] Redis access secured with authentication
- [ ] Rate limiting configured
- [ ] CORS policies set for production domains

## 🌍 Environment Setup

### 1. Create Production Environment Files

#### Backend Environment (`.env.production`)
```bash
# Database Configuration
DATABASE_URL="postgresql://delivery_user:SECURE_PASSWORD@db-server:5432/delivery_management"
DB_HOST="your-db-host.amazonaws.com"
DB_PORT="5432"
DB_NAME="delivery_management"
DB_USER="delivery_user"
DB_PASSWORD="SECURE_DB_PASSWORD"

# Redis Configuration
REDIS_URL="redis://your-redis-cluster:6379"
REDIS_HOST="your-redis-host.cache.amazonaws.com"
REDIS_PORT="6379"
REDIS_PASSWORD="SECURE_REDIS_PASSWORD"

# Application Configuration
NODE_ENV="production"
PORT="3001"
HOST="0.0.0.0"
LOG_LEVEL="info"

# Security Configuration
JWT_SECRET="your-256-bit-jwt-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-token-secret-here"
COOKIE_SECRET="your-cookie-secret-here"
ENCRYPTION_KEY="your-32-byte-encryption-key"

# External Services
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="alerts@your-domain.ae"
SMTP_PASSWORD="your-smtp-password"

# File Upload Configuration
UPLOAD_DIRECTORY="/app/uploads"
MAX_FILE_SIZE="10485760"
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,application/pdf"

# Rate Limiting
RATE_LIMIT_WINDOW="900000"
RATE_LIMIT_MAX="100"

# Monitoring
PROMETHEUS_ENABLED="true"
METRICS_ENDPOINT="/metrics"
```

#### PWA Environment Files
Create `.env.production` for each PWA:

```bash
# Public PWA
NEXT_PUBLIC_API_BASE_URL="https://api.your-domain.ae"
NEXT_PUBLIC_WS_URL="wss://api.your-domain.ae/ws"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_ENVIRONMENT="production"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-key"

# Admin PWA (additional)
NEXT_PUBLIC_ADMIN_EMAIL="admin@your-domain.ae"
NEXT_PUBLIC_MAX_UPLOAD_SIZE="10485760"

# Business PWA (additional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_your-stripe-key"
NEXT_PUBLIC_SUPPORT_EMAIL="support@your-domain.ae"

# Driver PWA (additional)
NEXT_PUBLIC_GPS_ACCURACY_THRESHOLD="10"
NEXT_PUBLIC_OFFLINE_CACHE_SIZE="50"
```

## 🗄️ Database Setup

### 1. PostgreSQL Production Setup

#### Installation (Ubuntu 22.04)
```bash
# Install PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create production database and user
sudo -u postgres psql
CREATE DATABASE delivery_management;
CREATE USER delivery_user WITH ENCRYPTED PASSWORD 'SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE delivery_management TO delivery_user;
ALTER USER delivery_user CREATEDB;
\q
```

#### Database Configuration (`/etc/postgresql/15/main/postgresql.conf`)
```ini
# Performance Tuning
shared_buffers = 2GB                    # 25% of available RAM
effective_cache_size = 6GB              # 75% of available RAM
work_mem = 64MB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Connection Settings
max_connections = 200
listen_addresses = '*'

# Logging
log_destination = 'csvlog'
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_statement = 'ddl'
log_min_duration_statement = 1000

# Replication (if using)
wal_level = replica
max_wal_senders = 3
```

#### Security Configuration (`/etc/postgresql/15/main/pg_hba.conf`)
```
# Production security settings
local   all             postgres                                peer
local   all             all                                     md5
host    delivery_management    delivery_user    10.0.0.0/16     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### 2. Database Migration & Seeding
```bash
# Navigate to backend directory
cd packages/backend

# Install dependencies
npm install

# Run database migrations
npm run migrate:up

# Seed initial data
npm run seed:production
```

## 🚀 Application Deployment

### Option 1: Docker Deployment (Recommended)

#### 1. Build Production Images
```bash
# Build all images
docker-compose -f docker-compose.production.yml build

# Or build individually
docker build -f Dockerfile.backend -t delivery-backend:latest .
docker build -f Dockerfile.public-pwa -t delivery-public:latest .
docker build -f Dockerfile.admin-pwa -t delivery-admin:latest .
docker build -f Dockerfile.business-pwa -t delivery-business:latest .
docker build -f Dockerfile.driver-pwa -t delivery-driver:latest .
```

#### 2. Deploy with Docker Compose
```bash
# Deploy production stack
docker-compose -f docker-compose.production.yml up -d

# Check deployment status
docker-compose -f docker-compose.production.yml ps
```

#### 3. Production Docker Compose File
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: delivery_management
      POSTGRES_USER: delivery_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U delivery_user -d delivery_management"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: delivery-backend:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://delivery_user:${DB_PASSWORD}@postgres:5432/delivery_management
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  public-pwa:
    image: delivery-public:latest
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.${DOMAIN}
    ports:
      - "3000:3000"
    restart: unless-stopped

  admin-pwa:
    image: delivery-admin:latest
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.${DOMAIN}
    ports:
      - "3002:3000"
    restart: unless-stopped

  business-pwa:
    image: delivery-business:latest
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.${DOMAIN}
    ports:
      - "3003:3000"
    restart: unless-stopped

  driver-pwa:
    image: delivery-driver:latest
    environment:
      NEXT_PUBLIC_API_BASE_URL: https://api.${DOMAIN}
    ports:
      - "3004:3000"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - public-pwa
      - admin-pwa
      - business-pwa
      - driver-pwa
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: delivery_network
```

### Option 2: Traditional Server Deployment

#### 1. Install Node.js and PM2
```bash
# Install Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install build tools
sudo apt-get install -y build-essential
```

#### 2. Deploy Applications
```bash
# Clone repository
git clone https://github.com/your-org/delivery-management-system.git
cd delivery-management-system

# Install dependencies
npm install

# Build all applications
npm run build

# Start backend with PM2
pm2 start packages/backend/dist/server.js --name "delivery-backend"

# Start PWAs with PM2
pm2 start packages/public-pwa/package.json --name "public-pwa"
pm2 start packages/admin-pwa/package.json --name "admin-pwa"
pm2 start packages/business-pwa/package.json --name "business-pwa"
pm2 start packages/driver-pwa/package.json --name "driver-pwa"

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📊 Monitoring Setup

### 1. Deploy Monitoring Stack
```bash
# Start monitoring services
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# Verify monitoring services
curl http://localhost:9090  # Prometheus
curl http://localhost:3001  # Grafana
curl http://localhost:9093  # Alertmanager
```

### 2. Configure Grafana Dashboards
1. Access Grafana at `http://your-domain:3001`
2. Login with admin/admin123
3. Import dashboards from `monitoring/grafana/dashboards/`
4. Configure data sources (Prometheus endpoint)

### 3. Set Up Alerting
1. Configure Alertmanager with your SMTP settings
2. Set up Slack webhooks for critical alerts
3. Test alert delivery with sample alerts

## 🔒 SSL/Security Configuration

### 1. Nginx SSL Configuration
```nginx
# /etc/nginx/sites-available/delivery-system
server {
    listen 80;
    server_name your-domain.ae www.your-domain.ae;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.ae www.your-domain.ae;
    
    ssl_certificate /etc/nginx/ssl/your-domain.ae.crt;
    ssl_certificate_key /etc/nginx/ssl/your-domain.ae.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Public PWA
    location / {
        proxy_pass http://public-pwa:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Admin PWA
    location /admin {
        proxy_pass http://admin-pwa:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Configuration
```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow from 10.0.0.0/16 to any port 5432  # Database access
sudo ufw allow from 10.0.0.0/16 to any port 6379  # Redis access
sudo ufw deny 3001  # Block direct backend access
```

## ⚡ Performance Optimization

### 1. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_deliveries_status ON deliveries(status);
CREATE INDEX CONCURRENTLY idx_deliveries_created_at ON deliveries(created_at);
CREATE INDEX CONCURRENTLY idx_deliveries_driver_id ON deliveries(driver_id);
CREATE INDEX CONCURRENTLY idx_location_updates_delivery_id ON location_updates(delivery_id);
CREATE INDEX CONCURRENTLY idx_location_updates_timestamp ON location_updates(timestamp);

-- Update table statistics
ANALYZE deliveries;
ANALYZE users;
ANALYZE location_updates;
```

### 2. Redis Configuration
```bash
# /etc/redis/redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
tcp-keepalive 60
timeout 300
```

### 3. Application Performance
```bash
# Enable compression in Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 🔄 Backup & Recovery

### 1. Database Backup Script
```bash
#!/bin/bash
# /scripts/backup-database.sh

BACKUP_DIR="/backups/postgresql"
DB_NAME="delivery_management"
DB_USER="delivery_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: backup_$TIMESTAMP.sql.gz"
```

### 2. File Backup Script
```bash
#!/bin/bash
# /scripts/backup-files.sh

BACKUP_DIR="/backups/files"
SOURCE_DIR="/app/uploads"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR

# Create tar archive of uploaded files
tar -czf $BACKUP_DIR/files_$TIMESTAMP.tar.gz -C $SOURCE_DIR .

# Remove file backups older than 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "File backup completed: files_$TIMESTAMP.tar.gz"
```

### 3. Automated Backup with Cron
```bash
# Edit crontab
sudo crontab -e

# Add backup jobs
0 2 * * * /scripts/backup-database.sh >> /var/log/backup.log 2>&1
0 3 * * * /scripts/backup-files.sh >> /var/log/backup.log 2>&1
```

## 🔧 Maintenance & Updates

### 1. Health Check Script
```bash
#!/bin/bash
# /scripts/health-check.sh

# Check application services
services=("delivery-backend" "public-pwa" "admin-pwa" "business-pwa" "driver-pwa")

for service in "${services[@]}"
do
    if pm2 describe $service | grep -q "online"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is down"
        pm2 restart $service
    fi
done

# Check database connection
if pg_isready -h localhost -p 5432 -U delivery_user; then
    echo "✅ Database is accessible"
else
    echo "❌ Database connection failed"
fi

# Check Redis connection
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is accessible"
else
    echo "❌ Redis connection failed"
fi
```

### 2. Update Deployment Script
```bash
#!/bin/bash
# /scripts/deploy-update.sh

echo "Starting deployment update..."

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build applications
npm run build

# Restart services with PM2
pm2 restart all

# Run database migrations if needed
npm run migrate:up

echo "Deployment update completed!"
```

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Reset connections
sudo systemctl restart postgresql
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping

# Clear Redis cache
redis-cli FLUSHALL
```

#### 3. Application Performance Issues
```bash
# Check PM2 processes
pm2 list
pm2 logs

# Monitor system resources
htop
iostat -x 1

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

#### 4. SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in /etc/nginx/ssl/your-domain.ae.crt -noout -dates

# Renew Let's Encrypt certificate
sudo certbot renew --nginx

# Test SSL configuration
openssl s_client -connect your-domain.ae:443
```

## 📞 Support and Maintenance

### Production Support Contacts
- **System Administrator**: admin@your-domain.ae
- **Database Administrator**: dba@your-domain.ae
- **DevOps Team**: devops@your-domain.ae
- **24/7 Support**: +971-XXX-XXXX

### Monitoring URLs
- **Application Status**: https://your-domain.ae/api/health
- **Grafana Dashboard**: https://monitoring.your-domain.ae:3001
- **Prometheus Metrics**: https://monitoring.your-domain.ae:9090
- **Alertmanager**: https://monitoring.your-domain.ae:9093

---

## 🎯 Next Steps After Deployment

1. **Load Testing** - Use tools like Apache JMeter or k6 to test system performance
2. **Security Audit** - Conduct penetration testing and security assessment
3. **User Acceptance Testing** - Have stakeholders test all system functionality
4. **Performance Tuning** - Monitor and optimize based on real usage patterns
5. **Staff Training** - Train administrators and end users on system usage

**The UAE Delivery Management System is now ready for production deployment!** 🚀

For technical support or deployment assistance, contact the development team.