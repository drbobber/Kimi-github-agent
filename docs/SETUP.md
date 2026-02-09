# 📦 Setup Guide

This guide will walk you through setting up the Kimi GitHub Agent.

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** (comes with Node.js)
- **git** 2.x or higher
- **Kimi CLI** installed and configured
- A GitHub account with personal access token
- (Optional) Telegram bot for notifications

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/drbobber/Kimi-github-agent.git
cd Kimi-github-agent
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This script will:
- Check prerequisites
- Install npm dependencies
- Create necessary directories
- Copy `.env.example` to `.env`

### 3. Configure Environment Variables

Edit the `.env` file and configure the following:

```bash
# Required
PORT=3000
GITHUB_TOKEN=ghp_your_actual_token_here
KIMI_RELAY_TOKEN=your_secure_random_string

# Optional but recommended
KIMI_PATH=/usr/local/bin/kimi
WORKSPACES_DIR=/home/user/kimi-workspaces
SESSIONS_DIR=/home/user/.kimi-sessions

# Telegram (optional)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_USER_ID=your_user_id
```

#### Getting a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Kimi Agent")
4. Select these scopes:
   - `repo` (all)
   - `workflow`
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)

#### Generating a Relay Token

The relay token is used to authenticate webhook requests. Generate a secure random string:

```bash
openssl rand -hex 32
```

### 4. Configure GitHub Repository

In your target repository, add these secrets:

1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:
   - `KIMI_RELAY_URL`: Your agent's URL (e.g., `https://your-server.com`)
   - `KIMI_RELAY_TOKEN`: The same token from your `.env` file

### 5. Start the Agent

#### Development Mode (with auto-reload)

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

#### As a System Service (Linux)

```bash
# Copy service file
sudo cp daemon/kimi-github-agent.service /etc/systemd/system/

# Edit the service file to match your installation
sudo nano /etc/systemd/system/kimi-github-agent.service

# Reload systemd
sudo systemctl daemon-reload

# Enable on boot
sudo systemctl enable kimi-github-agent

# Start the service
sudo systemctl start kimi-github-agent

# Check status
sudo systemctl status kimi-github-agent
```

## Verification

### Check Health Endpoint

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "queue": {
    "length": 0,
    "isProcessing": false,
    "currentTask": null
  }
}
```

### Run Health Check Script

```bash
./scripts/health-check.sh
```

### Test Issue Processing

1. Create a test issue in your repository
2. Add the `kimi-ready` label
3. Wait for the next scheduled run (or trigger manually)
4. Check logs for processing

## Directory Structure

After setup, your directory structure should look like:

```
kimi-github-agent/
├── .env                 # Your configuration (not in git)
├── .env.example         # Template
├── .github/             # GitHub workflows and templates
├── config/              # Project configurations
├── daemon/              # Systemd service file
├── docs/                # Documentation
├── scripts/             # Utility scripts
├── src/                 # Source code
├── workspaces/          # Cloned repositories (created on first run)
├── sessions/            # Context sessions (created on first run)
└── logs/                # Application logs (created on first run)
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

## Next Steps

- Read [WORKFLOW.md](./WORKFLOW.md) to understand how the agent works
- Read [ISSUE-WRITING-GUIDE.md](./ISSUE-WRITING-GUIDE.md) for best practices
- Configure your projects in `config/projects.json`

## Support

For issues, questions, or contributions:
- Open an issue: https://github.com/drbobber/Kimi-github-agent/issues
- Read the docs: https://github.com/drbobber/Kimi-github-agent/tree/main/docs
