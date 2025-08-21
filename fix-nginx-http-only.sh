#!/bin/bash

# Fix Nginx for HTTP Only (No SSL) Script
set -e

echo "🔧 Setting up nginx for HTTP only (fixing SSL certificate error)..."

# Create temporary nginx configuration for HTTP only
echo "1. Creating HTTP-only nginx configuration..."
mkdir -p nginx/sites-available

cat > nginx/sites-available/http-only.conf << 'EOF'
# HTTP-only configuration (no SSL)

# API Server
server {
    listen 80;
    server_name api.grsdeliver.com;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Public PWA
server {
    listen 80;
    server_name grsdeliver.com;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin PWA  
server {
    listen 80;
    server_name admin.grsdeliver.com;
    
    location / {
        proxy_pass http://admin-pwa:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Business PWA
server {
    listen 80;
    server_name business.grsdeliver.com;
    
    location / {
        proxy_pass http://business-pwa:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Driver PWA
server {
    listen 80;
    server_name driver.grsdeliver.com;
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Default server for any other domain or IP access
server {
    listen 80 default_server;
    server_name _;
    
    # Route to public PWA by default
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "2. Backup existing nginx sites (if any)..."
mkdir -p nginx/sites-backup
mv nginx/sites-available/*.conf nginx/sites-backup/ 2>/dev/null || echo "  No existing configs to backup"

echo "3. Copy HTTP-only config to nginx..."
cp nginx/sites-available/http-only.conf nginx/sites-available/default.conf

echo "4. Remove SSL-related configs temporarily..."
rm -rf nginx/ssl 2>/dev/null || echo "  No SSL directory to remove"

echo "5. Stop nginx container..."
docker-compose stop nginx

echo "6. Start nginx with new HTTP-only config..."
docker-compose up -d nginx

echo "7. Wait for nginx to start..."
sleep 10

echo "8. Check nginx status:"
docker-compose ps nginx

echo "9. Check nginx logs:"
docker-compose logs --tail=10 nginx

echo "10. Test nginx access:"
curl -f -s http://localhost:80/ && echo "✅ Nginx HTTP working!" || echo "❌ Nginx still not working"

echo ""
echo "✅ Nginx HTTP-only setup completed!"
echo ""
echo "🌐 Your domains should now work via HTTP:"
echo "  - http://grsdeliver.com"
echo "  - http://admin.grsdeliver.com"
echo "  - http://business.grsdeliver.com"
echo "  - http://driver.grsdeliver.com"
echo "  - http://api.grsdeliver.com"
echo ""
echo "📋 To add HTTPS later, run: ./setup-ssl.sh"
echo "🔧 To test with IP: curl -H 'Host: grsdeliver.com' http://31.97.235.250"