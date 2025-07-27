#!/bin/bash

# UAE Delivery Management System - File Backup Script
# Automated backup of application files, uploads, and configurations

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/files}"
SOURCE_DIRS="${SOURCE_DIRS:-/app/uploads,/app/logs,/app/config}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BACKUP_BUCKET:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
EXCLUDE_PATTERNS="${EXCLUDE_PATTERNS:-*.tmp,*.log,node_modules,*.cache}"

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
    local size=$3
    
    if [ -n "$SLACK_WEBHOOK" ]; then
        local color="good"
        local emoji="📁"
        
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
                    \"title\": \"$emoji File Backup - $status\",
                    \"text\": \"$message\",
                    \"fields\": [{
                        \"title\": \"Source Directories\",
                        \"value\": \"$SOURCE_DIRS\",
                        \"short\": false
                    }, {
                        \"title\": \"Backup Size\",
                        \"value\": \"${size:-N/A}\",
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
    
    # Check if tar is available
    if ! command -v tar &> /dev/null; then
        error "tar is not installed."
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Check if source directories exist
    IFS=',' read -ra DIRS <<< "$SOURCE_DIRS"
    for dir in "${DIRS[@]}"; do
        if [ ! -d "$dir" ]; then
            warning "Source directory does not exist: $dir"
        else
            log "Found source directory: $dir"
        fi
    done
    
    success "Prerequisites check passed"
}

# Calculate directory size
get_directory_size() {
    local dir=$1
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | cut -f1 || echo "0B"
    else
        echo "0B"
    fi
}

# Create file backup
create_backup() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/files_${timestamp}.tar.gz"
    
    log "Starting file backup..."
    log "Source directories: $SOURCE_DIRS"
    log "Backup file: $backup_file"
    
    # Create exclude file for tar
    local exclude_file=$(mktemp)
    IFS=',' read -ra PATTERNS <<< "$EXCLUDE_PATTERNS"
    for pattern in "${PATTERNS[@]}"; do
        echo "$pattern" >> "$exclude_file"
    done
    
    # Add common exclude patterns
    cat >> "$exclude_file" << EOF
*.swp
*.swo
*~
.DS_Store
Thumbs.db
*.pid
*.sock
*.tmp
core.*
EOF
    
    # Prepare tar arguments
    local tar_args=(
        "--create"
        "--gzip"
        "--file=$backup_file"
        "--exclude-from=$exclude_file"
        "--verbose"
        "--preserve-permissions"
        "--absolute-names"
    )
    
    # Add existing directories to backup
    local existing_dirs=()
    IFS=',' read -ra DIRS <<< "$SOURCE_DIRS"
    for dir in "${DIRS[@]}"; do
        if [ -d "$dir" ]; then
            existing_dirs+=("$dir")
        fi
    done
    
    if [ ${#existing_dirs[@]} -eq 0 ]; then
        warning "No source directories found to backup"
        rm "$exclude_file"
        return 1
    fi
    
    # Calculate total size before backup
    local total_size_before=0
    for dir in "${existing_dirs[@]}"; do
        local dir_size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
        total_size_before=$((total_size_before + dir_size))
    done
    local total_size_before_human=$(numfmt --to=iec --suffix=B $total_size_before 2>/dev/null || echo "${total_size_before} bytes")
    
    log "Total source size: $total_size_before_human"
    
    # Create backup with error handling
    if tar "${tar_args[@]}" "${existing_dirs[@]}" 2>/dev/null; then
        # Clean up exclude file
        rm "$exclude_file"
        
        # Calculate backup file size
        local backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null || echo "0")
        local backup_size_human=$(numfmt --to=iec --suffix=B $backup_size 2>/dev/null || echo "${backup_size} bytes")
        
        # Calculate compression ratio
        local compression_ratio="N/A"
        if [ $total_size_before -gt 0 ]; then
            compression_ratio=$(echo "scale=1; $backup_size * 100 / $total_size_before" | bc 2>/dev/null || echo "N/A")
            if [ "$compression_ratio" != "N/A" ]; then
                compression_ratio="${compression_ratio}%"
            fi
        fi
        
        success "File backup completed successfully"
        log "Backup file: $backup_file"
        log "Original size: $total_size_before_human"
        log "Compressed size: $backup_size_human"
        log "Compression ratio: $compression_ratio"
        
        # Upload to S3 if configured
        if [ -n "$S3_BUCKET" ]; then
            upload_to_s3 "$backup_file"
        fi
        
        # Send success notification
        send_slack_notification "success" "File backup completed successfully. Compressed $total_size_before_human to $backup_size_human (ratio: $compression_ratio)" "$backup_size_human"
        
        return 0
    else
        rm "$exclude_file"
        error "File backup failed"
        send_slack_notification "error" "File backup failed"
        return 1
    fi
}

# Upload backup to S3
upload_to_s3() {
    local backup_file=$1
    
    if command -v aws &> /dev/null; then
        log "Uploading backup to S3 bucket: $S3_BUCKET"
        
        local timestamp=$(date +"%Y/%m/%d")
        local s3_path="s3://$S3_BUCKET/file-backups/$timestamp/"
        
        # Upload with server-side encryption
        if aws s3 cp "$backup_file" "$s3_path" \
            --storage-class STANDARD_IA \
            --server-side-encryption AES256 \
            --metadata "backup-type=files,created=$(date -u +%Y-%m-%dT%H:%M:%SZ)"; then
            success "Backup uploaded to S3 successfully"
            log "S3 path: $s3_path$(basename "$backup_file")"
        else
            warning "Failed to upload backup to S3"
        fi
    else
        warning "AWS CLI not found. Skipping S3 upload."
    fi
}

# Clean up old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."
    
    local removed_count=0
    local freed_space=0
    
    # Find and remove old backup files
    while IFS= read -r -d '' file; do
        local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        freed_space=$((freed_space + file_size))
        rm "$file"
        removed_count=$((removed_count + 1))
        log "Removed old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ $removed_count -gt 0 ]; then
        local freed_space_human=$(numfmt --to=iec --suffix=B $freed_space 2>/dev/null || echo "${freed_space} bytes")
        success "Cleaned up $removed_count old backup files, freed $freed_space_human"
    else
        log "No old backup files found to clean up"
    fi
    
    # Clean up S3 old backups if configured
    if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
        log "Note: Configure S3 lifecycle policies for automatic cleanup of old backups"
    fi
}

# Generate backup report
generate_report() {
    log "Generating backup report..."
    
    local report_file="$BACKUP_DIR/file_backup_report_$(date +%Y%m%d).txt"
    local current_backups=$(find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime -1 | wc -l)
    local total_backups=$(find "$BACKUP_DIR" -name "files_*.tar.gz" | wc -l)
    local total_size=$(find "$BACKUP_DIR" -name "files_*.tar.gz" -exec stat -f%z {} + 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")
    local total_size_human=$(numfmt --to=iec --suffix=B $total_size 2>/dev/null || echo "${total_size} bytes")
    
    # Calculate source directory sizes
    local source_info=""
    IFS=',' read -ra DIRS <<< "$SOURCE_DIRS"
    for dir in "${DIRS[@]}"; do
        if [ -d "$dir" ]; then
            local dir_size=$(get_directory_size "$dir")
            local file_count=$(find "$dir" -type f | wc -l)
            source_info+="\n- $dir: $dir_size ($file_count files)"
        else
            source_info+="\n- $dir: Not found"
        fi
    done
    
    cat > "$report_file" << EOF
UAE Delivery Management System - File Backup Report
Generated: $(date)

Source Directories:$source_info

Backup Statistics:
- Backups created today: $current_backups
- Total backups: $total_backups
- Total storage used: $total_size_human
- Retention policy: $RETENTION_DAYS days

Backup Directory: $BACKUP_DIR

Recent Backups:
$(find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime -7 -exec ls -lh {} + 2>/dev/null | tail -10)

Configuration:
- Source Directories: $SOURCE_DIRS
- Exclude Patterns: $EXCLUDE_PATTERNS
- S3 Backup: $([ -n "$S3_BUCKET" ] && echo "Enabled ($S3_BUCKET)" || echo "Disabled")
- Slack Notifications: $([ -n "$SLACK_WEBHOOK" ] && echo "Enabled" || echo "Disabled")
- Retention Days: $RETENTION_DAYS

Disk Usage:
$(df -h "$BACKUP_DIR" 2>/dev/null || echo "Could not determine disk usage")
EOF
    
    log "Backup report generated: $report_file"
}

# Verify backup integrity
verify_backup() {
    local backup_file=$1
    
    if [ -f "$backup_file" ]; then
        log "Verifying backup integrity..."
        
        # Test if the backup file can be read
        if tar -tzf "$backup_file" >/dev/null 2>&1; then
            local file_count=$(tar -tzf "$backup_file" 2>/dev/null | wc -l)
            success "Backup file integrity verified ($file_count files)"
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

# List backup contents
list_backup_contents() {
    local backup_file=$1
    
    if [ -f "$backup_file" ]; then
        log "Listing backup contents..."
        echo "Files in backup:"
        tar -tzf "$backup_file" 2>/dev/null | head -20
        local total_files=$(tar -tzf "$backup_file" 2>/dev/null | wc -l)
        if [ $total_files -gt 20 ]; then
            echo "... and $((total_files - 20)) more files"
        fi
    else
        error "Backup file not found: $backup_file"
        return 1
    fi
}

# Main execution
main() {
    log "Starting UAE Delivery Management System file backup"
    log "=================================================="
    
    local start_time=$(date +%s)
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    if create_backup; then
        # Find the most recent backup file
        local latest_backup=$(find "$BACKUP_DIR" -name "files_*.tar.gz" -mtime -1 | sort | tail -1)
        
        # Verify backup integrity
        if verify_backup "$latest_backup"; then
            # Clean up old backups
            cleanup_old_backups
            
            # Generate report
            generate_report
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            success "File backup process completed successfully in ${duration}s"
            log "=================================================="
            
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
    --list)
        if [ -n "$2" ]; then
            list_backup_contents "$2"
        else
            error "Please provide backup file path"
            exit 1
        fi
        exit 0
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --test           Test configuration and source directories"
        echo "  --cleanup-only   Clean up old backups only"
        echo "  --report-only    Generate backup report only"
        echo "  --list FILE      List contents of backup file"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR       Backup directory (default: /backups/files)"
        echo "  SOURCE_DIRS      Comma-separated source directories"
        echo "                   (default: /app/uploads,/app/logs,/app/config)"
        echo "  RETENTION_DAYS   Backup retention in days (default: 7)"
        echo "  EXCLUDE_PATTERNS Comma-separated exclude patterns"
        echo "                   (default: *.tmp,*.log,node_modules,*.cache)"
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