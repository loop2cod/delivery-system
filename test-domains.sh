#!/bin/bash

# Test Domains Script
set -e

echo "🧪 Testing all domains and services..."

SERVER_IP="31.97.235.250"

echo "1. Test backend health directly:"
curl -f -s http://localhost:3000/health && echo "✅ Backend healthy" || echo "❌ Backend not responding"

echo -e "\n2. Test HTTPS directly (self-signed, so using -k):"
curl -k -f -s https://localhost/ | head -20 && echo -e "\n✅ HTTPS working" || echo "❌ HTTPS not working"

echo -e "\n3. Test HTTP to HTTPS redirect:"
curl -s -I http://localhost/ | grep -i location && echo "✅ HTTP redirects to HTTPS" || echo "❌ No redirect"

echo -e "\n4. Test domain routing via IP (simulating DNS):"

echo "  Testing API domain:"
curl -H 'Host: api.grsdeliver.com' -k -f -s https://$SERVER_IP/health && echo "✅ API domain works" || echo "❌ API domain fails"

echo "  Testing main domain:"
curl -H 'Host: grsdeliver.com' -k -f -s https://$SERVER_IP/ | grep -q "<!DOCTYPE html>" && echo "✅ Main domain works" || echo "❌ Main domain fails"

echo "  Testing admin domain:"
curl -H 'Host: admin.grsdeliver.com' -k -f -s https://$SERVER_IP/ | grep -q "<!DOCTYPE html>" && echo "✅ Admin domain works" || echo "❌ Admin domain fails"

echo -e "\n5. Test individual PWA services:"
echo "  Public PWA (3001):"
curl -f -s http://localhost:3001/ | head -10 && echo "✅ Public PWA responding" || echo "❌ Public PWA not responding"

echo -e "\n6. Check nginx logs for any errors:"
docker-compose logs --tail=10 nginx | grep -E "(error|emerg)" && echo "⚠️ Found errors in nginx logs" || echo "✅ No errors in nginx logs"

echo -e "\n7. Test external domain access (if DNS is configured):"
echo "  Note: This will only work if your DNS records point to $SERVER_IP"
echo "  Testing https://grsdeliver.com:"
curl -f -s --connect-timeout 5 https://grsdeliver.com/ | head -10 && echo "✅ External domain works" || echo "❌ External domain not accessible (likely DNS not configured)"

echo -e "\n8. Firewall and port check:"
echo "  Checking if ports 80 and 443 are open:"
sudo ufw status | grep -E "(80|443)" || echo "  UFW status not showing 80/443 (may be okay if inactive)"

echo ""
echo "🎯 Quick domain tests you can try:"
echo "  curl -H 'Host: grsdeliver.com' -k https://$SERVER_IP/"
echo "  curl -H 'Host: api.grsdeliver.com' -k https://$SERVER_IP/health"
echo "  curl -H 'Host: admin.grsdeliver.com' -k https://$SERVER_IP/"
echo ""
echo "🔧 If external domains don't work, ensure:"
echo "  1. DNS records point to: $SERVER_IP"
echo "  2. Firewall allows ports 80/443"
echo "  3. Domain propagation completed (can take up to 24h)"