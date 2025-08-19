#!/bin/bash

# Check what's using ports 80 and 443
echo "=== Checking what's using port 80 and 443 ==="

echo "Port 80:"
sudo lsof -i :80 || echo "Nothing found using lsof"
sudo netstat -tulpn | grep :80 || echo "Nothing found using netstat"

echo ""
echo "Port 443:"
sudo lsof -i :443 || echo "Nothing found using lsof"
sudo netstat -tulpn | grep :443 || echo "Nothing found using netstat"

echo ""
echo "=== Checking for common web servers ==="

# Check if Apache is running
if systemctl is-active --quiet apache2; then
    echo "Apache2 is running"
    systemctl status apache2 --no-pager
elif systemctl is-active --quiet httpd; then
    echo "Apache (httpd) is running"
    systemctl status httpd --no-pager
else
    echo "Apache is not running"
fi

echo ""

# Check if Nginx is running
if systemctl is-active --quiet nginx; then
    echo "Nginx is running"
    systemctl status nginx --no-pager
else
    echo "Nginx is not running"
fi

echo ""
echo "=== All listening ports ==="
sudo netstat -tulpn | grep LISTEN