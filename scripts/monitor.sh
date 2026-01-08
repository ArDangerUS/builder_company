#!/bin/bash
# Simple monitoring script for Builder Company
# Add to crontab: */5 * * * * /home/deploy/builder_company/scripts/monitor.sh

set -e

# Configuration
PROJECT_DIR="${PROJECT_DIR:-/home/deploy/builder_company}"
COMPOSE_FILE="docker-compose.prod.yml"
HEALTH_URL="${HEALTH_URL:-https://localhost/api/v1/health/}"
EXPECTED_CONTAINERS=6
DISK_THRESHOLD=80

# Optional: Telegram notifications
# TELEGRAM_BOT_TOKEN="your-bot-token"
# TELEGRAM_CHAT_ID="your-chat-id"

cd "$PROJECT_DIR"

ALERTS=""

# Check running containers
RUNNING=$(docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | jq -r '.[].State' 2>/dev/null | grep -c "running" || echo "0")
if [ "$RUNNING" -lt "$EXPECTED_CONTAINERS" ]; then
    ALERTS="${ALERTS}CONTAINER: Only $RUNNING/$EXPECTED_CONTAINERS containers running\n"
fi

# Check health endpoint (optional, skip if using self-signed cert)
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "$HEALTH_URL" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" != "200" ]; then
        ALERTS="${ALERTS}HEALTH: Health check failed (HTTP $HTTP_CODE)\n"
    fi
fi

# Check disk usage
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
    ALERTS="${ALERTS}DISK: Usage is ${DISK_USAGE}% (threshold: ${DISK_THRESHOLD}%)\n"
fi

# Check memory usage
MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
if [ "$MEM_USAGE" -gt 90 ]; then
    ALERTS="${ALERTS}MEMORY: Usage is ${MEM_USAGE}%\n"
fi

# Output alerts
if [ -n "$ALERTS" ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ALERTS:"
    echo -e "$ALERTS"

    # Send Telegram notification (if configured)
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        MESSAGE="🚨 Builder Company Alert\n\n$ALERTS"
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${MESSAGE}" \
            -d "parse_mode=HTML" > /dev/null
    fi

    exit 1
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') - OK: All checks passed"
fi
