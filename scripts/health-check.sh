#!/bin/bash

# Kimi GitHub Agent Health Check Script
# Checks the status of the Kimi GitHub Agent service

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🏥 Kimi GitHub Agent Health Check"
echo "=================================="
echo ""

# Check if running as systemd service
if systemctl is-active --quiet kimi-github-agent 2>/dev/null; then
    echo -e "${GREEN}✅ Service is running (systemd)${NC}"
    
    # Get service status
    echo ""
    echo "Service Status:"
    systemctl status kimi-github-agent --no-pager -l | head -n 10
    
    # Get recent logs
    echo ""
    echo "Recent Logs:"
    journalctl -u kimi-github-agent -n 20 --no-pager
else
    echo -e "${YELLOW}⚠️  Service not running as systemd service${NC}"
fi

# Check if process is running (by looking for node process)
if pgrep -f "node.*src/index.js" > /dev/null; then
    echo -e "${GREEN}✅ Node process is running${NC}"
    PID=$(pgrep -f "node.*src/index.js")
    echo "   PID: $PID"
else
    echo -e "${RED}❌ Node process not found${NC}"
fi

# Check HTTP endpoint if service is running
echo ""
echo "HTTP Endpoint Check:"

# Try to determine port from .env
PORT=3000
if [ -f .env ]; then
    source .env
    PORT=${PORT:-3000}
fi

if command -v curl &> /dev/null; then
    if curl -s -f "http://localhost:$PORT/health" > /dev/null; then
        echo -e "${GREEN}✅ Health endpoint responding${NC}"
        echo ""
        echo "Health Response:"
        curl -s "http://localhost:$PORT/health" | jq . 2>/dev/null || curl -s "http://localhost:$PORT/health"
    else
        echo -e "${RED}❌ Health endpoint not responding${NC}"
        echo "   URL: http://localhost:$PORT/health"
    fi
else
    echo -e "${YELLOW}⚠️  curl not available, skipping endpoint check${NC}"
fi

# Check disk space for workspaces
echo ""
echo "Disk Space:"
if [ -d workspaces ]; then
    du -sh workspaces 2>/dev/null || echo "Unable to check workspaces directory"
fi
if [ -d sessions ]; then
    du -sh sessions 2>/dev/null || echo "Unable to check sessions directory"
fi

# Summary
echo ""
echo "=================================="

# Exit with appropriate code
if systemctl is-active --quiet kimi-github-agent 2>/dev/null || pgrep -f "node.*src/index.js" > /dev/null; then
    echo -e "${GREEN}Overall Status: HEALTHY${NC}"
    exit 0
else
    echo -e "${RED}Overall Status: UNHEALTHY${NC}"
    exit 1
fi
