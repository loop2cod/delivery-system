#!/bin/bash

# UAE Delivery Management System - Database Restore Script
# Automated PostgreSQL database restoration with safety checks

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-delivery_management}"
DB_USER="${DB_USER:-delivery_user}"
PGPASSWORD="${DB_PASSWORD}"
RESTORE_CONFIRM="${RESTORE_CONFIRM:-false}"

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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if pg_restore and psql are available
    if ! command -v pg_restore &> /dev/null; then
        error "pg_restore is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        error "psql is not installed. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Check if database password is set
    if [ -z "$PGPASSWORD" ]; then
        error "Database password not set. Please set DB_PASSWORD environment variable."
        exit 1
    fi
    
    # Test database connection
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" &> /dev/null; then
        error "Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# List available backups
list_backups() {
    log "Available backups in $BACKUP_DIR:"
    echo ""
    
    local backup_count=0
    
    # List .sql.gz files
    if ls "$BACKUP_DIR"/delivery_management_*.sql.gz 1> /dev/null 2>&1; then
        echo "SQL Backups (compressed):"
        for file in "$BACKUP_DIR"/delivery_management_*.sql.gz; do
            if [ -f "$file" ]; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                local size_human=$(numfmt --to=iec --suffix=B $size 2>/dev/null || echo "${size} bytes")
                local date=$(basename "$file" | sed 's/delivery_management_\(.*\)\.sql\.gz/\1/' | sed 's/_/ /')
                printf "  %s - %s (%s)\n" "$(basename "$file")" "$date" "$size_human"
                backup_count=$((backup_count + 1))
            fi
        done
        echo ""
    fi
    
    # List .custom files
    if ls "$BACKUP_DIR"/delivery_management_*.sql.custom 1> /dev/null 2>&1; then
        echo "Custom Format Backups:"
        for file in "$BACKUP_DIR"/delivery_management_*.sql.custom; do
            if [ -f "$file" ]; then
                local size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
                local size_human=$(numfmt --to=iec --suffix=B $size 2>/dev/null || echo "${size} bytes")
                local date=$(basename "$file" | sed 's/delivery_management_\(.*\)\.sql\.custom/\1/' | sed 's/_/ /')
                printf "  %s - %s (%s)\n" "$(basename "$file")" "$date" "$size_human"
                backup_count=$((backup_count + 1))
            fi
        done
        echo ""
    fi
    
    if [ $backup_count -eq 0 ]; then
        warning "No backup files found in $BACKUP_DIR"
        return 1
    fi
    
    log "Found $backup_count backup files"
    return 0
}

# Get latest backup
get_latest_backup() {
    local latest_sql=$(find "$BACKUP_DIR" -name "delivery_management_*.sql.gz" -type f 2>/dev/null | sort | tail -1)
    local latest_custom=$(find "$BACKUP_DIR" -name "delivery_management_*.sql.custom" -type f 2>/dev/null | sort | tail -1)
    
    # Prefer custom format if available and newer
    if [ -n "$latest_custom" ] && [ -n "$latest_sql" ]; then
        if [ "$latest_custom" -nt "$latest_sql" ]; then
            echo "$latest_custom"
        else
            echo "$latest_sql"
        fi
    elif [ -n "$latest_custom" ]; then
        echo "$latest_custom"
    elif [ -n "$latest_sql" ]; then
        echo "$latest_sql"
    else
        return 1
    fi
}

# Create pre-restore backup
create_pre_restore_backup() {
    log "Creating pre-restore backup of current database..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/pre_restore_${timestamp}.sql.gz"
    
    # Create backup
    if pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-password \
        --format=plain \
        --no-owner \
        --no-privileges \
        | gzip > "$backup_file" 2>/dev/null; then
        
        local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
        local size_human=$(numfmt --to=iec --suffix=B $size 2>/dev/null || echo "${size} bytes")
        
        success "Pre-restore backup created: $(basename "$backup_file") ($size_human)"
        echo "$backup_file"
    else
        error "Failed to create pre-restore backup"
        return 1
    fi
}

# Check database exists and get info
check_database() {
    log "Checking target database..."
    
    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        log "Database '$DB_NAME' exists"
        
        # Get database statistics
        local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
        local row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT sum(n_tup_ins + n_tup_upd) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
        
        log "Current database has $table_count tables with approximately $row_count rows"
        return 0
    else
        log "Database '$DB_NAME' does not exist"
        return 1
    fi
}

# Drop and recreate database
recreate_database() {
    warning "This will completely destroy the existing database!"
    
    if [ "$RESTORE_CONFIRM" != "true" ]; then
        echo -n "Are you sure you want to continue? Type 'yes' to confirm: "
        read -r confirmation
        if [ "$confirmation" != "yes" ]; then
            log "Database restore cancelled by user"
            exit 0
        fi
    fi
    
    log "Dropping and recreating database..."
    
    # Terminate all connections to the database
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
    " 2>/dev/null || true
    
    # Drop database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null; then
        log "Database dropped successfully"
    else
        error "Failed to drop database"
        return 1
    fi
    
    # Create database
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null; then
        log "Database created successfully"
        
        # Create extensions
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
            CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
            CREATE EXTENSION IF NOT EXISTS \"postgis\";
        " 2>/dev/null || log "Extensions may need to be created manually"
        
        return 0
    else
        error "Failed to create database"
        return 1
    fi
}

# Restore from backup file
restore_backup() {
    local backup_file=$1
    
    if [ ! -f "$backup_file" ]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    log "Restoring from backup: $(basename "$backup_file")"
    
    local start_time=$(date +%s)
    
    # Determine backup format and restore accordingly
    if [[ "$backup_file" == *.sql.gz ]]; then
        # Compressed SQL format
        log "Restoring from compressed SQL backup..."
        
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            success "SQL backup restored successfully in ${duration}s"
            return 0
        else
            error "Failed to restore SQL backup"
            return 1
        fi
        
    elif [[ "$backup_file" == *.sql.custom ]]; then
        # Custom format
        log "Restoring from custom format backup..."
        
        if pg_restore \
            -h "$DB_HOST" \
            -p "$DB_PORT" \
            -U "$DB_USER" \
            -d "$DB_NAME" \
            --verbose \
            --no-password \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            "$backup_file" 2>/dev/null; then
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            success "Custom backup restored successfully in ${duration}s"
            return 0
        else
            error "Failed to restore custom backup"
            return 1
        fi
        
    else
        error "Unsupported backup format: $backup_file"
        return 1
    fi
}

# Verify restored database
verify_restore() {
    log "Verifying restored database..."
    
    # Check database connection
    if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        error "Cannot connect to restored database"
        return 1
    fi
    
    # Get basic statistics
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    local row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT sum(n_tup_ins + n_tup_upd) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
    
    # Check for essential tables
    local essential_tables=("users" "deliveries" "drivers" "businesses")
    local missing_tables=()
    
    for table in "${essential_tables[@]}"; do
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" 2>/dev/null | grep -q 1; then
            missing_tables+=("$table")
        fi
    done
    
    if [ ${#missing_tables[@]} -gt 0 ]; then
        warning "Missing essential tables: ${missing_tables[*]}"
    fi
    
    success "Database verification completed"
    log "Restored database has $table_count tables with approximately $row_count rows"
    
    if [ ${#missing_tables[@]} -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Generate restore report
generate_restore_report() {
    local backup_file=$1
    local pre_restore_backup=$2
    
    log "Generating restore report..."
    
    local report_file="$BACKUP_DIR/restore_report_$(date +%Y%m%d_%H%M%S).txt"
    
    # Get database statistics
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)
    local row_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT sum(n_tup_ins + n_tup_upd) FROM pg_stat_user_tables;" 2>/dev/null | xargs)
    
    cat > "$report_file" << EOF
UAE Delivery Management System - Database Restore Report
Generated: $(date)

Restore Details:
- Backup File: $(basename "$backup_file")
- Backup Size: $(stat -f%z "$backup_file" 2>/dev/null | numfmt --to=iec --suffix=B || echo "Unknown")
- Target Database: $DB_NAME
- Host: $DB_HOST:$DB_PORT
- User: $DB_USER

Pre-restore Backup:
- File: $(basename "$pre_restore_backup")
- Location: $pre_restore_backup

Restored Database Statistics:
- Tables: $table_count
- Approximate Rows: $row_count

Database Schema:
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt" 2>/dev/null || echo "Could not list tables")

Indexes:
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\di" 2>/dev/null || echo "Could not list indexes")

Recent Activity:
$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del FROM pg_stat_user_tables ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC LIMIT 10;" 2>/dev/null || echo "Could not get activity statistics")
EOF
    
    log "Restore report generated: $report_file"
}

# Main execution
main() {
    local backup_file=""
    
    log "Starting UAE Delivery Management System database restore"
    log "======================================================="
    
    # Parse backup file argument
    if [ -n "$1" ]; then
        if [ -f "$1" ]; then
            backup_file="$1"
        elif [ -f "$BACKUP_DIR/$1" ]; then
            backup_file="$BACKUP_DIR/$1"
        else
            error "Backup file not found: $1"
            exit 1
        fi
    else
        # Get latest backup
        backup_file=$(get_latest_backup)
        if [ -z "$backup_file" ]; then
            error "No backup files found"
            list_backups
            exit 1
        fi
        log "Using latest backup: $(basename "$backup_file")"
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Show backup file info
    local backup_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    local backup_size_human=$(numfmt --to=iec --suffix=B $backup_size 2>/dev/null || echo "${backup_size} bytes")
    log "Backup file: $(basename "$backup_file") ($backup_size_human)"
    
    # Check current database
    if check_database; then
        # Create pre-restore backup
        local pre_restore_backup
        if pre_restore_backup=$(create_pre_restore_backup); then
            log "Pre-restore backup created for safety"
        else
            error "Failed to create pre-restore backup"
            exit 1
        fi
        
        # Recreate database
        if ! recreate_database; then
            error "Failed to recreate database"
            exit 1
        fi
    else
        log "Target database does not exist, will be created during restore"
        pre_restore_backup=""
    fi
    
    # Restore backup
    if restore_backup "$backup_file"; then
        # Verify restore
        if verify_restore; then
            # Generate report
            generate_restore_report "$backup_file" "$pre_restore_backup"
            
            success "Database restore completed successfully"
            log "======================================================="
            
            exit 0
        else
            warning "Database restore completed with warnings"
            exit 0
        fi
    else
        error "Database restore failed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --list)
        list_backups
        exit $?
        ;;
    --latest)
        latest=$(get_latest_backup)
        if [ -n "$latest" ]; then
            echo "Latest backup: $(basename "$latest")"
            exit 0
        else
            echo "No backup files found"
            exit 1
        fi
        ;;
    --help|-h)
        echo "Usage: $0 [OPTIONS] [BACKUP_FILE]"
        echo ""
        echo "Options:"
        echo "  --list           List available backup files"
        echo "  --latest         Show latest backup file"
        echo "  --help, -h       Show this help message"
        echo ""
        echo "Arguments:"
        echo "  BACKUP_FILE      Specific backup file to restore (optional)"
        echo "                   If not provided, latest backup will be used"
        echo ""
        echo "Environment Variables:"
        echo "  BACKUP_DIR       Backup directory (default: /backups/postgresql)"
        echo "  DB_HOST          Database host (default: localhost)"
        echo "  DB_PORT          Database port (default: 5432)"
        echo "  DB_NAME          Database name (default: delivery_management)"
        echo "  DB_USER          Database user (default: delivery_user)"
        echo "  DB_PASSWORD      Database password (required)"
        echo "  RESTORE_CONFIRM  Skip confirmation prompt (default: false)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Restore from latest backup"
        echo "  $0 delivery_management_20240101.sql.gz  # Restore from specific file"
        echo "  RESTORE_CONFIRM=true $0              # Auto-confirm restore"
        exit 0
        ;;
    --*)
        error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
    *)
        # Run main restore with optional backup file argument
        main "$1"
        ;;
esac