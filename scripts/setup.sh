#!/bin/bash

# Kimi GitHub Agent Setup Script
# This script prepares the environment for running the Kimi GitHub Agent

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        🤖 Kimi GitHub Agent Setup                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 18.0.0 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version is too old (found v$NODE_VERSION, need v18+)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version)${NC}"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ git is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ git $(git --version | cut -d' ' -f3)${NC}"

# Check Kimi CLI
if ! command -v kimi &> /dev/null; then
    echo -e "${YELLOW}⚠️  Kimi CLI not found in PATH${NC}"
    echo "Please install Kimi CLI or set KIMI_PATH in .env"
else
    echo -e "${GREEN}✅ Kimi CLI found${NC}"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo ""
echo "📁 Creating directories..."
mkdir -p workspaces
mkdir -p sessions
mkdir -p logs
echo -e "${GREEN}✅ Directories created${NC}"

# Setup environment file
echo ""
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit .env and configure your settings${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Check if GitHub token is set
if [ -f .env ]; then
    source .env
    if [ -z "$GITHUB_TOKEN" ] || [ "$GITHUB_TOKEN" = "ghp_your_github_personal_access_token" ]; then
        echo -e "${YELLOW}⚠️  GITHUB_TOKEN not configured in .env${NC}"
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Edit .env and configure your settings:"
echo "   - Set GITHUB_TOKEN"
echo "   - Set KIMI_RELAY_TOKEN (generate a secure random string)"
echo "   - Configure other settings as needed"
echo ""
echo "2. Start the agent:"
echo "   npm start"
echo ""
echo "3. For development with auto-reload:"
echo "   npm run dev"
echo ""
echo "4. To run as a system service:"
echo "   sudo cp daemon/kimi-github-agent.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable kimi-github-agent"
echo "   sudo systemctl start kimi-github-agent"
echo ""
echo "📚 Documentation: docs/SETUP.md"
echo ""
