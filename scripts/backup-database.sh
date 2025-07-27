#!/bin/bash

# UAE Delivery Management System - Database Backup Script
# Automated PostgreSQL backup with compression and retention management

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-delivery_management}"
DB_USER="${DB_USER:-delivery_user}"
PGPASSWORD="${DB_PASSWORD}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Send notification to Slack
send_slack_notification() {
    local status=$1
    local message=$2
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        local emoji="✅"
        
        if [ "$status" = "error" ]; then
            color="danger"
            emoji="❌"
        elif [ "$status" = "warning" ]; then
            color="warning"
            emoji="⚠️"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Database Backup - $status\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Database\",
                        \"value\": \"$DB_NAME\",
                        \"short\": true
                    }, {
                        \"title\": \"Server\",
                        \"value\": \"$DB_HOST:$DB_PORT\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date +'%Y-%m-%d %H:%M:%S UTC')\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
    fi
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        error "pg_dump is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check if database password is set
    if [ -z "$PGPASSWORD" ]; then
        error "Database password not set. Please set DB_PASSWORD environment variable."
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Test database connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" &> /dev/null; then
        error "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
        send_slack_notification "error" "Cannot connect to database $DB_NAME at $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Create database backup
create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/delivery_management_${timestamp}.sql"
    local compressed_file="${backup_file}.gz"
    
    log "Starting database backup..."
    log "Database: $DB_NAME"
    log "Host: $DB_HOST:$DB_PORT"
    log "User: $DB_USER"
    log "Backup file: $compressed_file"
    
    # Create backup with verbose output
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --no-password \
        --format=custom \
        --compress=9 \
        --no-owner \
        --no-privileges \
        --exclude-table-data=location_updates_archive \
        --exclude-table-data=audit_logs_archive \
        > "$backup_file.custom" 2>/dev/null; then
        
        # Also create a plain SQL backup for easier restore
        pg_dump \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --no-password \
            --format=plain \
            --no-owner \
            --no-privileges \
            --exclude-table-data=location_updates_archive \
            --exclude-table-data=audit_logs_archive \
            > "$backup_file" 2>/dev/null
        
        # Compress the plain SQL backup
        gzip "$backup_file"
        
        # Calculate file sizes
        local custom_size=$(stat -f%z "$backup_file.custom" 2>/dev/null || stat -c%s "$backup_file.custom" 2>/dev/null)
        local compressed_size=$(stat -f%z "$compressed_file" 2>/dev/null || stat -c%s "$compressed_file" 2>/dev/null)
        
        # Convert bytes to human readable format
        local custom_size_human=$(numfmt --to=iec --suffix=B $custom_size 2>/dev/null || echo "${custom_size} bytes")
        local compressed_size_human=$(numfmt --to=iec --suffix=B $compressed_size 2>/dev/null || echo "${compressed_size} bytes")
        
        success "Database backup completed successfully"
        log "Custom format backup: $backup_file.custom ($custom_size_human)"
        log "Compressed SQL backup: $compressed_file ($compressed_size_human)"
        
        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_file.custom" "$compressed_file"
        fi
        
        # Send success notification
        send_slack_notification "success" "Database backup completed successfully. Files: $(basename $backup_file.custom) ($custom_size_human), $(basename $compressed_file) ($compressed_size_human)"
        
        return 0
    else
        error "Database backup failed"
        send_slack_notification "error" "Database backup failed for $DB_NAME"
        return 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local custom_file=$1
    local compressed_file=$2
    
    if command -v aws &> /dev/null; then
        log "Uploading backups to S3 bucket: $S3_BUCKET"
        
        local timestamp=$(date +"%Y/%m/%d")
        local s3_path="s3://$S3_BUCKET/postgresql-backups/$timestamp/"
        
        # Upload both files
        if aws s3 cp "$custom_file" "$s3_path" --storage-class STANDARD_IA && \
           aws s3 cp "$compressed_file" "$s3_path" --storage-class STANDARD_IA; then
            success "Backups uploaded to S3 successfully"
            log "S3 path: $s3_path"
        else
            warning "Failed to upload backups to S3"
        fi
    else
        warning "AWS CLI not found. Skipping S3 upload."
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    # Find and remove old backup files
    local removed_count=0
    
    # Remove old .sql.gz files
    while IFS= read -r -d '' file; do
        rm "$file"
        removed_count=$((removed_count + 1))
        log "Removed old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Remove old .custom files
    while IFS= read -r -d '' file; do
        rm "$file"
        removed_count=$((removed_count + 1))
        log "Removed old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "delivery_management_*.sql.custom" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ $removed_count -gt 0 ]; then
        success "Cleaned up $removed_count old backup files"
    else
        log "No old backup files found to clean up"
    fi
    
    # Clean up S3 old backups if configured
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "Cleaning up old S3 backups..."
        
        # Calculate date $RETENTION_DAYS ago
        local cutoff_date=$(date -d "$RETENTION_DAYS days ago" +%Y-%m-%d 2>/dev/null || date -v -${RETENTION_DAYS}d +%Y-%m-%d 2>/dev/null)
        
        # This would require more complex AWS CLI commands or a separate script
        # For now, we'll just log that S3 cleanup should be configured separately
        log "S3 lifecycle policies should be configured for automatic cleanup"
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d).txt"
    local current_backups=$(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" -mtime -1 | wc -l)
    local total_backups=$(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" | wc -l)
    local total_size=$(find "$BACKUP_DIR" -name "delivery_management_*" -exec stat -f%z {} + 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
    local total_size_human=$(numfmt --to=iec --suffix=B $total_size 2>/dev/null || echo "${total_size} bytes")
    
    cat > "$report_file" << EOF
UAE Delivery Management System - Backup Report
Generated: $(date)

Database Information:
- Host: $DB_HOST:$DB_PORT
- Database: $DB_NAME
- User: $DB_USER

Backup Statistics:
- Backups created today: $current_backups
- Total backups: $total_backups
- Total storage used: $total_size_human
- Retention policy: $RETENTION_DAYS days

Backup Directory: $BACKUP_DIR

Recent Backups:
$(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" -mtime -7 -exec ls -lh {} + 2>/dev/null | tail -10)

Configuration:
- S3 Backup: $([ -n "$S3_BUCKET" ] && echo "Enabled ($S3_BUCKET)" || echo "Disabled")
- Slack Notifications: $([ -n "$SLACK_WEBHOOK" ] && echo "Enabled" || echo "Disabled")
- Retention Days: $RETENTION_DAYS
EOF
    
    log "Backup report generated: $report_file"
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1
    
    if [ -f "$backup_file" ]; then
        log "Verifying backup integrity..."
        
        # Test if the backup file can be read
        if gzip -t "$backup_file" 2>/dev/null; then
            success "Backup file integrity verified"
            return 0
        else
            error "Backup file integrity check failed"
            send_slack_notification "error" "Backup file integrity check failed: $(basename $backup_file)"
            return 1
        fi
    else
        error "Backup file not found: $backup_file"
        return 1
    fi
}

# Main execution
main() {
    log "Starting UAE Delivery Management System database backup"
    log "========================================================"
    
    local start_time=$(date +%s)
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    if create_backup; then
        # Find the most recent backup file
        local latest_backup=$(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" -mtime -1 | sort | tail -1)
        
        # Verify backup integrity
        if verify_backup "$latest_backup"; then
            # Clean up old backups
            cleanup_old_backups
            
            # Generate report
            generate_report
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            success "Backup process completed successfully in ${duration}s"
            log "========================================================"
            
            exit 0
        else
            error "Backup verification failed"
            exit 1
        fi
    else
        error "Backup creation failed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --test)
        log "Running in test mode - checking prerequisites only"
        check_prerequisites
        log "Test completed successfully"
        exit 0
        ;;
    --cleanup-only)
        log "Running cleanup only"
        cleanup_old_backups
        exit 0
        ;;
    --report-only)
        log "Generating report only"
        generate_report
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --test          Test configuration and database connection"
        echo "  --cleanup-only  Clean up old backups only"
        echo "  --report-only   Generate backup report only"
        echo "  --help, -h      Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR      Backup directory (default: /backups/postgresql)"
        echo "  DB_HOST         Database host (default: localhost)"
        echo "  DB_PORT         Database port (default: 5432)"
        echo "  DB_NAME         Database name (default: delivery_management)"
        echo "  DB_USER         Database user (default: delivery_user)"
        echo "  DB_PASSWORD     Database password (required)"
        echo "  RETENTION_DAYS  Backup retention in days (default: 30)"
        echo "  S3_BACKUP_BUCKET S3 bucket for remote backups (optional)"
        echo "  SLACK_WEBHOOK_URL Slack webhook for notifications (optional)"
        exit 0
        ;;
    "")
        # No arguments, run main backup
        main
        ;;
    *)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac