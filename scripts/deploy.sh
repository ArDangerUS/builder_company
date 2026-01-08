#!/bin/bash
# Deployment script for Builder Company
# Usage: ./deploy.sh [--skip-backup] [--skip-build]

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/home/deploy/builder_company}"
COMPOSE_FILE="docker-compose.prod.yml"
BRANCH="${BRANCH:-main}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
SKIP_BACKUP=false
SKIP_BUILD=false
for arg in "$@"; do
    case $arg in
        --skip-backup) SKIP_BACKUP=true ;;
        --skip-build) SKIP_BUILD=true ;;
    esac
done

cd "$PROJECT_DIR"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Builder Company Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo "Date: $(date)"
echo "Branch: $BRANCH"
echo ""

# Step 1: Pull latest changes
echo -e "${YELLOW}[1/6] Pulling latest changes...${NC}"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo -e "${GREEN}Done!${NC}"

# Step 2: Backup database
if [ "$SKIP_BACKUP" = false ]; then
    echo -e "${YELLOW}[2/6] Creating database backup...${NC}"
    if [ -f "./scripts/backup.sh" ]; then
        ./scripts/backup.sh
    else
        echo "Backup script not found, skipping..."
    fi
else
    echo -e "${YELLOW}[2/6] Skipping backup (--skip-backup)${NC}"
fi

# Step 3: Build images
if [ "$SKIP_BUILD" = false ]; then
    echo -e "${YELLOW}[3/6] Building Docker images...${NC}"
    docker compose -f "$COMPOSE_FILE" build
    echo -e "${GREEN}Done!${NC}"
else
    echo -e "${YELLOW}[3/6] Skipping build (--skip-build)${NC}"
fi

# Step 4: Stop and start services
echo -e "${YELLOW}[4/6] Restarting services...${NC}"
docker compose -f "$COMPOSE_FILE" down
docker compose -f "$COMPOSE_FILE" up -d
echo -e "${GREEN}Done!${NC}"

# Step 5: Run migrations
echo -e "${YELLOW}[5/6] Running database migrations...${NC}"
sleep 5  # Wait for database to be ready
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput
echo -e "${GREEN}Done!${NC}"

# Step 6: Collect static files
echo -e "${YELLOW}[6/6] Collecting static files...${NC}"
docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput
echo -e "${GREEN}Done!${NC}"

# Health check
echo ""
echo -e "${YELLOW}Running health check...${NC}"
sleep 5
if docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo -e "${GREEN}All services are running!${NC}"
else
    echo -e "${RED}Warning: Some services may not be running properly${NC}"
    docker compose -f "$COMPOSE_FILE" ps
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Services status:"
docker compose -f "$COMPOSE_FILE" ps
