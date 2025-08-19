#!/bin/bash

# GRS Delivery System Monitoring Script
# Usage: ./scripts/monitor.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "OK")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}✗${NC} $message"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Check Docker containers
check_containers() {
    echo -e "\n${BLUE}=== Docker Containers Status ===${NC}"
    
    CONTAINERS=("grs-mongodb" "grs-redis" "grs-backend" "grs-public-pwa" "grs-admin-pwa" "grs-business-pwa" "grs-driver-pwa" "grs-nginx")
    
    for container in "${CONTAINERS[@]}"; do
        if docker ps --format "table {{.Names}}" | grep -q "$container"; then
            STATUS=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
            if [[ "$STATUS" == "running" ]]; then
                print_status "OK" "$container is running"
            else
                print_status "ERROR" "$container is $STATUS"
            fi
        else
            print_status "ERROR" "$container is not found"
        fi
    done
}

# Check system resources
check_resources() {
    echo -e "\n${BLUE}=== System Resources ===${NC}"
    
    # CPU Usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    if (( $(echo "$CPU_USAGE < 80" | bc -l) )); then
        print_status "OK" "CPU Usage: ${CPU_USAGE}%"
    else
        print_status "WARNING" "High CPU Usage: ${CPU_USAGE}%"
    fi
    
    # Memory Usage
    MEMORY_INFO=$(free | grep Mem)
    MEMORY_TOTAL=$(echo $MEMORY_INFO | awk '{print $2}')
    MEMORY_USED=$(echo $MEMORY_INFO | awk '{print $3}')
    MEMORY_PERCENT=$(echo "scale=2; $MEMORY_USED * 100 / $MEMORY_TOTAL" | bc)
    
    if (( $(echo "$MEMORY_PERCENT < 80" | bc -l) )); then
        print_status "OK" "Memory Usage: ${MEMORY_PERCENT}%"
    else
        print_status "WARNING" "High Memory Usage: ${MEMORY_PERCENT}%"
    fi
    
    # Disk Usage
    DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    if [[ $DISK_USAGE -lt 80 ]]; then
        print_status "OK" "Disk Usage: ${DISK_USAGE}%"
    else
        print_status "WARNING" "High Disk Usage: ${DISK_USAGE}%"
    fi
}

# Check network connectivity
check_network() {
    echo -e "\n${BLUE}=== Network Connectivity ===${NC}"
    
    # Check if ports are listening
    PORTS=("80" "443" "3000" "3001" "3002" "3003" "3004")
    
    for port in "${PORTS[@]}"; do
        if netstat -tuln | grep -q ":$port "; then
            print_status "OK" "Port $port is listening"
        else
            print_status "ERROR" "Port $port is not listening"
        fi
    done
}

# Check application health
check_application_health() {
    echo -e "\n${BLUE}=== Application Health ===${NC}"
    
    # Check backend API
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        print_status "OK" "Backend API is healthy"
    else
        print_status "ERROR" "Backend API health check failed"
    fi
    
    # Check web applications
    APPS=("3001:Public PWA" "3002:Admin PWA" "3003:Business PWA" "3004:Driver PWA")
    
    for app in "${APPS[@]}"; do
        PORT=$(echo $app | cut -d':' -f1)
        NAME=$(echo $app | cut -d':' -f2)
        
        if curl -f -s "http://localhost:$PORT" > /dev/null 2>&1; then
            print_status "OK" "$NAME is responding"
        else
            print_status "ERROR" "$NAME is not responding"
        fi
    done
}

# Check SSL certificates
check_ssl_certificates() {
    echo -e "\n${BLUE}=== SSL Certificates ===${NC}"
    
    DOMAINS=("grsdeliver.com" "admin.grsdeliver.com" "business.grsdeliver.com" "driver.grsdeliver.com" "api.grsdeliver.com")
    
    for domain in "${DOMAINS[@]}"; do
        if [[ -f "nginx/ssl/$domain.crt" ]]; then
            EXPIRY=$(openssl x509 -in "nginx/ssl/$domain.crt" -noout -enddate 2>/dev/null | cut -d= -f2)
            if [[ -n "$EXPIRY" ]]; then
                EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null)
                CURRENT_EPOCH=$(date +%s)
                DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
                
                if [[ $DAYS_LEFT -gt 30 ]]; then
                    print_status "OK" "$domain certificate expires in $DAYS_LEFT days"
                elif [[ $DAYS_LEFT -gt 0 ]]; then
                    print_status "WARNING" "$domain certificate expires in $DAYS_LEFT days"
                else
                    print_status "ERROR" "$domain certificate has expired!"
                fi
            else
                print_status "ERROR" "$domain certificate is invalid"
            fi
        else
            print_status "ERROR" "$domain certificate not found"
        fi
    done
}

# Check database connectivity
check_database() {
    echo -e "\n${BLUE}=== Database Connectivity ===${NC}"
    
    # Check MongoDB
    if docker exec grs-mongodb mongo --eval "db.adminCommand('ismaster')" > /dev/null 2>&1; then
        print_status "OK" "MongoDB is accessible"
    else
        print_status "ERROR" "MongoDB is not accessible"
    fi
    
    # Check Redis
    if docker exec grs-redis redis-cli ping > /dev/null 2>&1; then
        print_status "OK" "Redis is accessible"
    else
        print_status "ERROR" "Redis is not accessible"
    fi
}

# Check logs for errors
check_logs() {
    echo -e "\n${BLUE}=== Recent Error Logs ===${NC}"
    
    # Check for recent errors in container logs
    ERROR_COUNT=$(docker-compose logs --since="1h" 2>&1 | grep -i error | wc -l)
    
    if [[ $ERROR_COUNT -eq 0 ]]; then
        print_status "OK" "No errors found in recent logs"
    elif [[ $ERROR_COUNT -lt 10 ]]; then
        print_status "WARNING" "$ERROR_COUNT errors found in recent logs"
    else
        print_status "ERROR" "$ERROR_COUNT errors found in recent logs"
    fi
}

# Main monitoring function
main() {
    echo -e "${GREEN}GRS Delivery System - Health Monitor${NC}"
    echo -e "${BLUE}Generated at: $(date)${NC}"
    
    check_containers
    check_resources
    check_network
    check_application_health
    check_ssl_certificates
    check_database
    check_logs
    
    echo -e "\n${BLUE}=== Summary ===${NC}"
    echo "Monitoring completed. Check the status above for any issues."
    echo "For detailed logs, run: docker-compose logs -f [service-name]"
}

# Check if bc is installed (for calculations)
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    apt-get update && apt-get install -y bc
fi

# Run main function
main "$@"