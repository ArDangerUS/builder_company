#!/bin/bash
# Database backup script for Builder Company
# Usage: ./backup.sh

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/home/deploy/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CONTAINER_NAME="${CONTAINER_NAME:-builder_postgres_prod}"
DB_USER="${POSTGRES_USER:-builder}"
DB_NAME="${POSTGRES_DB:-builder_company}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Database Backup ===${NC}"
echo "Date: $(date)"
echo "Backup directory: $BACKUP_DIR"

# Create backup directory if not exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo -e "${YELLOW}Creating backup...${NC}"
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
    echo -e "${GREEN}Backup created: backup_$DATE.sql.gz ($BACKUP_SIZE)${NC}"
else
    echo -e "${RED}Backup failed!${NC}"
    exit 1
fi

# Remove old backups
echo -e "${YELLOW}Cleaning old backups (older than $RETENTION_DAYS days)...${NC}"
DELETED=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "Deleted $DELETED old backup(s)"

# List current backups
echo -e "${YELLOW}Current backups:${NC}"
ls -lht "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | head -10 || echo "No backups found"

# Calculate total size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo -e "${GREEN}Total backup size: $TOTAL_SIZE${NC}"

echo -e "${GREEN}=== Backup completed! ===${NC}"
