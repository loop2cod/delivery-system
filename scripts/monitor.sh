#!/bin/bash

# Delivery System Health Monitor
# Usage: ./scripts/monitor.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print status with colored output
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
    esac
}

# Check Docker containers
check_containers() {
    echo -e "\n${BLUE}=== Docker Containers ===${NC}"
    
    local containers=("delivery-mongodb" "delivery-redis" "delivery-backend")
    
    for container in "${containers[@]}"; do
        if docker ps --format "{{.Names}}" | grep -q "$container"; then
            local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
            if [[ "$status" == "running" ]]; then
                print_status "OK" "$container is running"
            else
                print_status "ERROR" "$container is $status"
            fi
        else
            print_status "ERROR" "$container not found"
        fi
    done
}

# Check essential ports
check_ports() {
    echo -e "\n${BLUE}=== Network Ports ===${NC}"
    
    local ports=("3000:Backend API" "27017:MongoDB" "6379:Redis")
    
    for port_info in "${ports[@]}"; do
        local port=$(echo $port_info | cut -d':' -f1)
        local name=$(echo $port_info | cut -d':' -f2)
        
        if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
            print_status "OK" "$name (port $port) is listening"
        else
            print_status "ERROR" "$name (port $port) not listening"
        fi
    done
}

# Check API health
check_api() {
    echo -e "\n${BLUE}=== API Health ===${NC}"
    
    if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
        print_status "OK" "Backend API is healthy"
    else
        print_status "ERROR" "Backend API health check failed"
    fi
}

# Check database connectivity
check_databases() {
    echo -e "\n${BLUE}=== Database Connectivity ===${NC}"
    
    # MongoDB
    if docker exec delivery-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_status "OK" "MongoDB is accessible"
    else
        print_status "ERROR" "MongoDB is not accessible"
    fi
    
    # Redis
    if docker exec delivery-redis redis-cli ping > /dev/null 2>&1; then
        print_status "OK" "Redis is accessible"
    else
        print_status "ERROR" "Redis is not accessible"
    fi
}

# Check system resources
check_resources() {
    echo -e "\n${BLUE}=== System Resources ===${NC}"
    
    # Memory usage
    if command -v free &> /dev/null; then
        local memory_info=$(free | grep Mem)
        local memory_total=$(echo $memory_info | awk '{print $2}')
        local memory_used=$(echo $memory_info | awk '{print $3}')
        local memory_percent=$((memory_used * 100 / memory_total))
        
        if [[ $memory_percent -lt 80 ]]; then
            print_status "OK" "Memory usage: ${memory_percent}%"
        else
            print_status "WARNING" "High memory usage: ${memory_percent}%"
        fi
    fi
    
    # Disk usage
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    if [[ $disk_usage -lt 80 ]]; then
        print_status "OK" "Disk usage: ${disk_usage}%"
    else
        print_status "WARNING" "High disk usage: ${disk_usage}%"
    fi
}

# Main function
main() {
    echo -e "${GREEN}Delivery System Health Monitor${NC}"
    echo -e "${BLUE}Generated at: $(date)${NC}"
    
    check_containers
    check_ports
    check_api
    check_databases
    check_resources
    
    echo -e "\n${BLUE}=== Summary ===${NC}"
    echo "Health check completed."
    echo "For detailed logs: docker-compose logs -f [service-name]"
}

# Run the monitor
main "$@"