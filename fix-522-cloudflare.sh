#!/bin/bash

# Fix 522 Error - Cloudflare Specific
set -e

echo "🔧 Fixing 522 Error - Cloudflare is detected in your DNS"
echo "   Your domains are proxied through Cloudflare (cf-proxied:true)"
echo "   IP: 31.97.235.250 ✅"

echo -e "\n1. Update nginx configuration for Cloudflare compatibility:"

# Backup current config
cp ./nginx/conf.d/domains.conf ./nginx/conf.d/domains.conf.backup 2>/dev/null || echo "  No existing domains.conf found"

# Create Cloudflare-optimized configuration
cat > ./nginx/conf.d/cloudflare.conf << 'EOF'
# Cloudflare-optimized configuration to fix 522 errors

# Real IP handling for Cloudflare
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
real_ip_header CF-Connecting-IP;

# HTTP to HTTPS redirects
server {
    listen 80;
    server_name grsdeliver.com admin.grsdeliver.com business.grsdeliver.com driver.grsdeliver.com api.grsdeliver.com;
    return 301 https://$server_name$request_uri;
}

# Public PWA - grsdeliver.com
server {
    listen 443 ssl;
    http2 on;
    server_name grsdeliver.com;
    
    # SSL Configuration optimized for Cloudflare
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Extended timeouts to prevent 522 errors
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    # Buffer settings
    proxy_buffering on;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
    proxy_busy_buffers_size 256k;
    
    location / {
        proxy_pass http://public-pwa:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_set_header CF-Ray $http_cf_ray;
        proxy_set_header CF-Visitor $http_cf_visitor;
        
        # Health check for upstream
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Admin PWA - admin.grsdeliver.com  
server {
    listen 443 ssl;
    http2 on;
    server_name admin.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s; 
    proxy_read_timeout 300s;
    
    location / {
        proxy_pass http://admin-pwa:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}

# Business PWA - business.grsdeliver.com
server {
    listen 443 ssl;
    http2 on;
    server_name business.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    location / {
        proxy_pass http://business-pwa:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}

# Driver PWA - driver.grsdeliver.com
server {
    listen 443 ssl;
    http2 on;
    server_name driver.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    location / {
        proxy_pass http://driver-pwa:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
}

# API Backend - api.grsdeliver.com
server {
    listen 443 ssl;
    http2 on;
    server_name api.grsdeliver.com;
    
    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    
    proxy_connect_timeout 60s;
    proxy_send_timeout 300s;
    proxy_read_timeout 300s;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header CF-Connecting-IP $http_cf_connecting_ip;
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }
    
    location /health {
        proxy_pass http://backend:3000/health;
        proxy_set_header Host $host;
        access_log off;
    }
}

# Default server for direct IP access
server {
    listen 80 default_server;
    listen 443 ssl default_server;
    server_name _;
    
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
EOF

echo "2. Remove old configuration:"
rm -f ./nginx/conf.d/domains.conf 2>/dev/null || echo "  No old domains.conf to remove"

echo "3. Test new nginx configuration:"
docker exec grs-nginx nginx -t && echo "✅ Configuration is valid" || echo "❌ Configuration has errors"

echo "4. Reload nginx:"
docker exec grs-nginx nginx -s reload

echo "5. Wait for nginx to stabilize:"
sleep 10

echo "6. Test server response:"
curl -k -I https://31.97.235.250/ && echo "✅ Server responding" || echo "❌ Server not responding"

echo ""
echo "🎯 CRITICAL: Check Cloudflare SSL Settings"
echo "   Go to Cloudflare Dashboard → SSL/TLS → Overview"
echo "   Ensure SSL mode is set to: 'Full (strict)'"
echo "   NOT 'Flexible' - this causes 522 errors!"
echo ""
echo "✅ Cloudflare-optimized configuration applied!"
echo "   - Extended timeouts (60s connect, 300s read/send)"
echo "   - Cloudflare IP ranges configured"
echo "   - CF headers properly forwarded"
echo "   - Health check endpoints added"
echo ""
echo "🔧 If still getting 522 errors:"
echo "   1. Change Cloudflare SSL mode to 'Full (strict)'"
echo "   2. Wait 2-3 minutes for changes to propagate"
echo "   3. Clear Cloudflare cache (Caching → Purge Everything)"