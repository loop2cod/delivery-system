#!/bash

# Debug 522 Connection Timeout Error
set -e

echo "🔍 Debugging 522 Connection Timeout Error..."

SERVER_IP="31.97.235.250"

echo "1. Check if Cloudflare is involved:"
echo "  Checking DNS resolution for your domains:"
nslookup grsdeliver.com || echo "  DNS lookup failed"
nslookup admin.grsdeliver.com || echo "  DNS lookup failed"  
nslookup api.grsdeliver.com || echo "  DNS lookup failed"

echo -e "\n2. Check if domains point to your server:"
dig +short grsdeliver.com || echo "  Dig command not available"
dig +short admin.grsdeliver.com || echo "  Dig command not available"
dig +short api.grsdeliver.com || echo "  Dig command not available"

echo -e "\n3. Test direct server IP access:"
curl -k -I https://$SERVER_IP/ && echo "✅ Direct IP HTTPS works" || echo "❌ Direct IP HTTPS fails"

echo -e "\n4. Test with Host header (simulating domain):"
curl -k -I -H 'Host: grsdeliver.com' https://$SERVER_IP/ && echo "✅ Host header routing works" || echo "❌ Host header routing fails"

echo -e "\n5. Check server response time:"
time curl -k -s https://$SERVER_IP/ > /dev/null && echo "✅ Server responds quickly" || echo "❌ Server response slow/failed"

echo -e "\n6. Check if 522 error comes from Cloudflare:"
curl -I https://grsdeliver.com 2>&1 | grep -i cloudflare && echo "⚠️ Cloudflare detected" || echo "✅ No Cloudflare headers found"

echo -e "\n7. Test different approaches:"
echo "  HTTP (should redirect to HTTPS):"
curl -I http://grsdeliver.com && echo "✅ HTTP redirect works" || echo "❌ HTTP fails"

echo -e "\n  HTTPS with timeout:"
timeout 30 curl -k -I https://grsdeliver.com && echo "✅ HTTPS works within 30s" || echo "❌ HTTPS times out"

echo -e "\n8. Check server resource usage:"
echo "  Memory usage:"
free -h
echo "  CPU load:"
uptime
echo "  Disk usage:"
df -h / | tail -1

echo -e "\n9. Check nginx and container status:"
docker-compose ps
echo -e "\nNginx status:"
docker exec grs-nginx ps aux | grep nginx

echo -e "\n10. Check for any blocking/rate limiting:"
echo "  Recent connections to port 443:"
ss -tuln | grep :443
echo "  Active connections:"
ss -tun | grep :443 | wc -l

echo -e "\n🔧 Common 522 Error Causes:"
echo "  1. Cloudflare can't connect to origin server"
echo "  2. SSL handshake timeout"
echo "  3. Server overloaded/slow response"
echo "  4. Firewall blocking Cloudflare IPs"
echo "  5. DNS pointing to wrong IP"

echo -e "\n🎯 Quick fixes to try:"
echo "  - Check DNS in Cloudflare dashboard"
echo "  - Verify SSL mode is 'Full' not 'Flexible'"
echo "  - Temporarily pause Cloudflare (orange cloud → grey cloud)"
echo "  - Check origin server certificate validity"