#!/bin/bash

# UAE Delivery Management System - Health Check Script
# Comprehensive system health monitoring and diagnostics

set -e

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:3001}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-delivery_management}"
DB_USER="${DB_USER:-delivery_user}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
PGPASSWORD="${DB_PASSWORD}"
REDIS_PASSWORD="${REDIS_PASSWORD}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
CHECK_TIMEOUT="${CHECK_TIMEOUT:-10}"

# PWA URLs
PUBLIC_PWA_URL="${PUBLIC_PWA_URL:-http://localhost:3000}"
ADMIN_PWA_URL="${ADMIN_PWA_URL:-http://localhost:3002}"
BUSINESS_PWA_URL="${BUSINESS_PWA_URL:-http://localhost:3003}"
DRIVER_PWA_URL="${DRIVER_PWA_URL:-http://localhost:3004}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Health status counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Arrays to store results
HEALTH_RESULTS=()
CRITICAL_ISSUES=()
WARNINGS=()

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Record check result
record_check() {
    local component=$1
    local status=$2
    local message=$3
    local response_time=$4
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    case $status in
        "PASS")
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
            HEALTH_RESULTS+=("✅ $component: $message ${response_time:+($response_time)}")
            ;;
        "FAIL")
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
            HEALTH_RESULTS+=("❌ $component: $message")
            CRITICAL_ISSUES+=("$component: $message")
            ;;
        "WARN")
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
            HEALTH_RESULTS+=("⚠️  $component: $message ${response_time:+($response_time)}")
            WARNINGS+=("$component: $message")
            ;;
    esac
}

# Send notification to Slack
send_slack_notification() {
    local status=$1
    local summary=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        local emoji="✅"
        
        if [ "$status" = "critical" ]; then
            color="danger"
            emoji="🚨"
        elif [ "$status" = "warning" ]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji System Health Check - $status\",
                    \"text\": \"$summary\",
                    \"fields\": [{
                        \"title\": \"Total Checks\",
                        \"value\": \"$TOTAL_CHECKS\",
                        \"short\": true
                    }, {
                        \"title\": \"Passed\",
                        \"value\": \"$PASSED_CHECKS\",
                        \"short\": true
                    }, {
                        \"title\": \"Failed\",
                        \"value\": \"$FAILED_CHECKS\",
                        \"short\": true
                    }, {
                        \"title\": \"Warnings\",
                        \"value\": \"$WARNING_CHECKS\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date +'%Y-%m-%d %H:%M:%S UTC')\",
                        \"short\": false
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# Check HTTP endpoint with timeout
check_http_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    log "Checking $name at $url"
    
    local start_time=$(date +%s.%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time "$CHECK_TIMEOUT" "$url" 2>/dev/null || echo "000,0.000")
    local end_time=$(date +%s.%3N)
    
    local status_code=$(echo "$response" | cut -d',' -f1)
    local response_time=$(echo "$response" | cut -d',' -f2)
    local response_time_ms=$(echo "$response_time * 1000" | bc 2>/dev/null | cut -d'.' -f1 || echo "0")
    
    if [ "$status_code" = "$expected_status" ]; then
        if [ "$response_time_ms" -gt 2000 ]; then
            record_check "$name" "WARN" "Slow response" "${response_time_ms}ms"
        else
            record_check "$name" "PASS" "Healthy" "${response_time_ms}ms"
        fi
    elif [ "$status_code" = "000" ]; then
        record_check "$name" "FAIL" "Connection timeout or refused"
    else
        record_check "$name" "FAIL" "HTTP $status_code (expected $expected_status)"
    fi
}

# Check database connectivity
check_database() {
    log "Checking PostgreSQL database"
    
    local start_time=$(date +%s.%3N)
    
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
        local end_time=$(date +%s.%3N)
        local response_time=$(echo "($end_time - $start_time) * 1000" | bc | cut -d'.' -f1)
        
        # Check database size and connection count
        if command -v psql >/dev/null 2>&1 && [ -n "$PGPASSWORD" ]; then
            local db_size=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));" 2>/dev/null | xargs || echo "Unknown")
            local connection_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';" 2>/dev/null | xargs || echo "0")
            
            record_check "PostgreSQL" "PASS" "Connected, Size: $db_size, Active connections: $connection_count" "${response_time}ms"
            
            # Check for long-running queries
            local long_queries=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 minutes';" 2>/dev/null | xargs || echo "0")
            if [ "$long_queries" -gt 0 ]; then
                record_check "Database Performance" "WARN" "$long_queries long-running queries detected"
            fi
        else
            record_check "PostgreSQL" "PASS" "Connection OK" "${response_time}ms"
        fi
    else
        record_check "PostgreSQL" "FAIL" "Connection failed to $DB_HOST:$DB_PORT"
    fi
}

# Check Redis connectivity
check_redis() {
    log "Checking Redis cache"
    
    local start_time=$(date +%s.%3N)
    
    if command -v redis-cli >/dev/null 2>&1; then
        local redis_response
        if [ -n "$REDIS_PASSWORD" ]; then
            redis_response=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" ping 2>/dev/null || echo "ERROR")
        else
            redis_response=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null || echo "ERROR")
        fi
        
        local end_time=$(date +%s.%3N)
        local response_time=$(echo "($end_time - $start_time) * 1000" | bc | cut -d'.' -f1)
        
        if [ "$redis_response" = "PONG" ]; then
            # Get Redis info
            local redis_info
            if [ -n "$REDIS_PASSWORD" ]; then
                redis_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" info memory 2>/dev/null | grep used_memory_human | cut -d':' -f2 | tr -d '\r' || echo "Unknown")
            else
                redis_info=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" info memory 2>/dev/null | grep used_memory_human | cut -d':' -f2 | tr -d '\r' || echo "Unknown")
            fi
            
            record_check "Redis" "PASS" "Connected, Memory usage: $redis_info" "${response_time}ms"
        else
            record_check "Redis" "FAIL" "Connection failed or authentication error"
        fi
    else
        # Try basic TCP connection
        if timeout "$CHECK_TIMEOUT" bash -c "</dev/tcp/$REDIS_HOST/$REDIS_PORT" 2>/dev/null; then
            local end_time=$(date +%s.%3N)
            local response_time=$(echo "($end_time - $start_time) * 1000" | bc | cut -d'.' -f1)
            record_check "Redis" "WARN" "TCP connection OK (redis-cli not available)" "${response_time}ms"
        else
            record_check "Redis" "FAIL" "TCP connection failed to $REDIS_HOST:$REDIS_PORT"
        fi
    fi
}

# Check disk space
check_disk_space() {
    log "Checking disk space"
    
    local warning_threshold=80
    local critical_threshold=90
    
    # Check root partition
    local root_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$root_usage" -ge "$critical_threshold" ]; then
        record_check "Disk Space (Root)" "FAIL" "Critical usage: ${root_usage}%"
    elif [ "$root_usage" -ge "$warning_threshold" ]; then
        record_check "Disk Space (Root)" "WARN" "High usage: ${root_usage}%"
    else
        record_check "Disk Space (Root)" "PASS" "Usage: ${root_usage}%"
    fi
    
    # Check backup directory if it exists
    if [ -d "/backups" ]; then
        local backup_usage=$(df /backups | tail -1 | awk '{print $5}' | sed 's/%//')
        if [ "$backup_usage" -ge "$critical_threshold" ]; then
            record_check "Disk Space (Backups)" "FAIL" "Critical usage: ${backup_usage}%"
        elif [ "$backup_usage" -ge "$warning_threshold" ]; then
            record_check "Disk Space (Backups)" "WARN" "High usage: ${backup_usage}%"
        else
            record_check "Disk Space (Backups)" "PASS" "Usage: ${backup_usage}%"
        fi
    fi
}

# Check memory usage
check_memory() {
    log "Checking memory usage"
    
    local warning_threshold=80
    local critical_threshold=90
    
    # Get memory usage percentage
    local memory_info=$(free | grep Mem)
    local total=$(echo "$memory_info" | awk '{print $2}')
    local used=$(echo "$memory_info" | awk '{print $3}')
    local memory_usage=$(echo "scale=0; $used * 100 / $total" | bc)
    
    local memory_total_gb=$(echo "scale=1; $total / 1024 / 1024" | bc)
    local memory_used_gb=$(echo "scale=1; $used / 1024 / 1024" | bc)
    
    if [ "$memory_usage" -ge "$critical_threshold" ]; then
        record_check "Memory Usage" "FAIL" "Critical: ${memory_used_gb}GB/${memory_total_gb}GB (${memory_usage}%)"
    elif [ "$memory_usage" -ge "$warning_threshold" ]; then
        record_check "Memory Usage" "WARN" "High: ${memory_used_gb}GB/${memory_total_gb}GB (${memory_usage}%)"
    else
        record_check "Memory Usage" "PASS" "${memory_used_gb}GB/${memory_total_gb}GB (${memory_usage}%)"
    fi
}

# Check CPU load
check_cpu_load() {
    log "Checking CPU load"
    
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_percentage=$(echo "scale=0; $load_avg * 100 / $cpu_cores" | bc)
    
    if [ "$load_percentage" -ge 200 ]; then
        record_check "CPU Load" "FAIL" "Critical load: $load_avg (${load_percentage}%)"
    elif [ "$load_percentage" -ge 100 ]; then
        record_check "CPU Load" "WARN" "High load: $load_avg (${load_percentage}%)"
    else
        record_check "CPU Load" "PASS" "Load: $load_avg (${load_percentage}%)"
    fi
}

# Check service processes
check_processes() {
    log "Checking service processes"
    
    # Common process patterns to check
    local processes=(
        "node.*backend"
        "node.*public-pwa"
        "node.*admin-pwa"
        "node.*business-pwa"
        "node.*driver-pwa"
        "postgres"
        "redis-server"
    )
    
    for process_pattern in "${processes[@]}"; do
        local process_name=$(echo "$process_pattern" | sed 's/\.\*/ /')
        local process_count=$(pgrep -cf "$process_pattern" 2>/dev/null || echo "0")
        
        if [ "$process_count" -gt 0 ]; then
            record_check "Process ($process_name)" "PASS" "$process_count instances running"
        else
            record_check "Process ($process_name)" "WARN" "No processes found"
        fi
    done
}

# Check log files for errors
check_logs() {
    log "Checking recent log files for errors"
    
    local log_dirs=("/var/log" "/app/logs" "./logs")
    local error_count=0
    
    for log_dir in "${log_dirs[@]}"; do
        if [ -d "$log_dir" ]; then
            # Look for recent error entries (last 1 hour)
            local recent_errors=$(find "$log_dir" -name "*.log" -mmin -60 -exec grep -l -i "error\|exception\|fatal" {} \; 2>/dev/null | wc -l)
            error_count=$((error_count + recent_errors))
        fi
    done
    
    if [ "$error_count" -gt 10 ]; then
        record_check "Log Analysis" "WARN" "$error_count log files with recent errors"
    elif [ "$error_count" -gt 0 ]; then
        record_check "Log Analysis" "PASS" "$error_count log files with recent errors (normal)"
    else
        record_check "Log Analysis" "PASS" "No recent errors found"
    fi
}

# Check SSL certificates
check_ssl_certificates() {
    local domains=("localhost" "your-domain.ae")
    
    for domain in "${domains[@]}"; do
        log "Checking SSL certificate for $domain"
        
        # Check if we can connect via HTTPS
        if timeout "$CHECK_TIMEOUT" openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | grep -q "CONNECTED"; then
            # Get certificate expiry
            local expiry_date=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d'=' -f2)
            
            if [ -n "$expiry_date" ]; then
                local expiry_timestamp=$(date -d "$expiry_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$expiry_date" +%s 2>/dev/null || echo "0")
                local current_timestamp=$(date +%s)
                local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
                
                if [ "$days_until_expiry" -lt 7 ]; then
                    record_check "SSL ($domain)" "FAIL" "Certificate expires in $days_until_expiry days"
                elif [ "$days_until_expiry" -lt 30 ]; then
                    record_check "SSL ($domain)" "WARN" "Certificate expires in $days_until_expiry days"
                else
                    record_check "SSL ($domain)" "PASS" "Certificate valid for $days_until_expiry days"
                fi
            else
                record_check "SSL ($domain)" "WARN" "Could not parse certificate expiry"
            fi
        else
            record_check "SSL ($domain)" "WARN" "HTTPS connection not available"
        fi
    done
}

# Check network connectivity
check_network() {
    log "Checking network connectivity"
    
    # Check internet connectivity
    if ping -c 1 -W 5 8.8.8.8 >/dev/null 2>&1; then
        record_check "Internet Connectivity" "PASS" "External connectivity OK"
    else
        record_check "Internet Connectivity" "FAIL" "Cannot reach external hosts"
    fi
    
    # Check DNS resolution
    if nslookup google.com >/dev/null 2>&1; then
        record_check "DNS Resolution" "PASS" "DNS working"
    else
        record_check "DNS Resolution" "FAIL" "DNS resolution failed"
    fi
}

# Generate health report
generate_health_report() {
    local report_file="/tmp/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
UAE Delivery Management System - Health Check Report
Generated: $(date)

SUMMARY
=======
Total Checks: $TOTAL_CHECKS
Passed: $PASSED_CHECKS
Failed: $FAILED_CHECKS
Warnings: $WARNING_CHECKS

Overall Status: $([ $FAILED_CHECKS -eq 0 ] && echo "HEALTHY" || echo "UNHEALTHY")

DETAILED RESULTS
================
EOF
    
    for result in "${HEALTH_RESULTS[@]}"; do
        echo "$result" >> "$report_file"
    done
    
    if [ ${#CRITICAL_ISSUES[@]} -gt 0 ]; then
        echo "" >> "$report_file"
        echo "CRITICAL ISSUES" >> "$report_file"
        echo "===============" >> "$report_file"
        for issue in "${CRITICAL_ISSUES[@]}"; do
            echo "- $issue" >> "$report_file"
        done
    fi
    
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo "" >> "$report_file"
        echo "WARNINGS" >> "$report_file"
        echo "========" >> "$report_file"
        for warning in "${WARNINGS[@]}"; do
            echo "- $warning" >> "$report_file"
        done
    fi
    
    echo "" >> "$report_file"
    echo "SYSTEM INFORMATION" >> "$report_file"
    echo "==================" >> "$report_file"
    echo "Hostname: $(hostname)" >> "$report_file"
    echo "OS: $(uname -a)" >> "$report_file"
    echo "Uptime: $(uptime)" >> "$report_file"
    echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')" >> "$report_file"
    echo "Memory: $(free -h | grep Mem)" >> "$report_file"
    echo "Disk: $(df -h / | tail -1)" >> "$report_file"
    
    log "Health report generated: $report_file"
    echo "$report_file"
}

# Print summary
print_summary() {
    echo ""
    echo "================================="
    echo "Health Check Summary"
    echo "================================="
    echo "Total Checks: $TOTAL_CHECKS"
    echo "✅ Passed: $PASSED_CHECKS"
    echo "❌ Failed: $FAILED_CHECKS"
    echo "⚠️  Warnings: $WARNING_CHECKS"
    echo ""
    
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            success "🎉 All systems are healthy!"
            return 0
        else
            warning "⚠️  System is operational with $WARNING_CHECKS warnings"
            return 1
        fi
    else
        error "🚨 System has $FAILED_CHECKS critical issues!"
        return 2
    fi
}

# Main execution
main() {
    log "Starting UAE Delivery Management System health check"
    log "===================================================="
    
    # PWA Applications
    check_http_endpoint "Public PWA" "$PUBLIC_PWA_URL"
    check_http_endpoint "Admin PWA" "$ADMIN_PWA_URL"
    check_http_endpoint "Business PWA" "$BUSINESS_PWA_URL"
    check_http_endpoint "Driver PWA" "$DRIVER_PWA_URL"
    
    # Backend API
    check_http_endpoint "Backend API" "$API_BASE_URL/health"
    check_http_endpoint "Backend Metrics" "$API_BASE_URL/metrics" 200
    
    # Infrastructure
    check_database
    check_redis
    
    # System Resources
    check_disk_space
    check_memory
    check_cpu_load
    
    # Processes
    check_processes
    
    # Logs
    check_logs
    
    # Network
    check_network
    
    # SSL (if applicable)
    # check_ssl_certificates
    
    # Generate report
    local report_file
    report_file=$(generate_health_report)
    
    # Print summary
    local exit_code=0
    if ! print_summary; then
        exit_code=$?
    fi
    
    # Send notifications
    if [ $FAILED_CHECKS -gt 0 ]; then
        send_slack_notification "critical" "System health check failed with $FAILED_CHECKS critical issues"
    elif [ $WARNING_CHECKS -gt 0 ]; then
        send_slack_notification "warning" "System health check completed with $WARNING_CHECKS warnings"
    else
        send_slack_notification "healthy" "All system health checks passed successfully"
    fi
    
    log "===================================================="
    log "Health check report: $report_file"
    
    exit $exit_code
}

# Handle script arguments
case "${1:-}" in
    --quick)
        log "Running quick health check (core services only)"
        check_http_endpoint "Backend API" "$API_BASE_URL/health"
        check_database
        check_redis
        print_summary
        exit $?
        ;;
    --monitoring)
        # Output in monitoring-friendly format
        if [ $FAILED_CHECKS -eq 0 ] && [ $WARNING_CHECKS -eq 0 ]; then
            echo "OK - All checks passed ($PASSED_CHECKS/$TOTAL_CHECKS)"
            exit 0
        elif [ $FAILED_CHECKS -eq 0 ]; then
            echo "WARNING - $WARNING_CHECKS warnings detected ($PASSED_CHECKS/$TOTAL_CHECKS passed)"
            exit 1
        else
            echo "CRITICAL - $FAILED_CHECKS failures detected ($PASSED_CHECKS/$TOTAL_CHECKS passed)"
            exit 2
        fi
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --quick      Run quick health check (core services only)"
        echo "  --monitoring Output in monitoring system format"
        echo "  --help, -h   Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  API_BASE_URL        Backend API URL (default: http://localhost:3001)"
        echo "  PUBLIC_PWA_URL      Public PWA URL (default: http://localhost:3000)"
        echo "  ADMIN_PWA_URL       Admin PWA URL (default: http://localhost:3002)"
        echo "  BUSINESS_PWA_URL    Business PWA URL (default: http://localhost:3003)"
        echo "  DRIVER_PWA_URL      Driver PWA URL (default: http://localhost:3004)"
        echo "  DB_HOST             Database host (default: localhost)"
        echo "  DB_PORT             Database port (default: 5432)"
        echo "  DB_NAME             Database name (default: delivery_management)"
        echo "  DB_USER             Database user (default: delivery_user)"
        echo "  DB_PASSWORD         Database password"
        echo "  REDIS_HOST          Redis host (default: localhost)"
        echo "  REDIS_PORT          Redis port (default: 6379)"
        echo "  REDIS_PASSWORD      Redis password"
        echo "  CHECK_TIMEOUT       HTTP timeout in seconds (default: 10)"
        echo "  SLACK_WEBHOOK_URL   Slack webhook for notifications"
        exit 0
        ;;
    "")
        # No arguments, run full health check
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac