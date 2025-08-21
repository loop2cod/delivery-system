#!/bin/bash

# Setup SSL with Let's Encrypt Script
set -e

echo "🔒 Setting up SSL certificates with Let's Encrypt..."

# Check if domains resolve to this server
SERVER_IP=$(curl -s http://checkip.amazonaws.com/)
echo "Server IP: $SERVER_IP"

echo "1. Installing certbot..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

echo "2. Stopping nginx temporarily for certificate generation..."
docker-compose stop nginx

echo "3. Generating SSL certificates..."
sudo certbot certonly --standalone --agree-tos --non-interactive \
  --email admin@grsdeliver.com \
  -d grsdeliver.com \
  -d api.grsdeliver.com \
  -d admin.grsdeliver.com \
  -d business.grsdeliver.com \
  -d driver.grsdeliver.com

echo "4. Copying certificates to nginx volume..."
sudo mkdir -p ./nginx/ssl
sudo cp /etc/letsencrypt/live/grsdeliver.com/fullchain.pem ./nginx/ssl/
sudo cp /etc/letsencrypt/live/grsdeliver.com/privkey.pem ./nginx/ssl/
sudo chown -R $USER:$USER ./nginx/ssl/

echo "5. Creating nginx SSL configuration..."
sudo mkdir -p ./nginx/sites-available

cat > ./nginx/sites-available/grs-ssl.conf << 'EOF'
# HTTPS redirects and SSL configuration
server {
    listen 80;
    server_name grsdeliver.com api.grsdeliver.com admin.grsdeliver.com business.grsdeliver.com driver.grsdeliver.com;
    return 301 https://$server_name$request_uri;
}

# API Server
server {
    listen 443 ssl http2;
    server_name api.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
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
    listen 443 ssl http2;
    server_name grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
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
    listen 443 ssl http2;
    server_name admin.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
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
    listen 443 ssl http2;
    server_name business.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
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
    listen 443 ssl http2;
    server_name driver.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

echo "6. Restarting nginx with SSL..."
docker-compose up -d nginx

echo "7. Setting up auto-renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx" | sudo crontab -

echo ""
echo "✅ SSL setup completed!"
echo ""
echo "🎉 Your HTTPS domains should now work:"
echo "  - https://grsdeliver.com"
echo "  - https://admin.grsdeliver.com"
echo "  - https://business.grsdeliver.com"  
echo "  - https://driver.grsdeliver.com"
echo "  - https://api.grsdeliver.com"
echo ""
echo "📋 SSL certificates will auto-renew every 12 hours"