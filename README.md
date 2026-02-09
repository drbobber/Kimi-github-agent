# 🤖 Kimi GitHub Agent

**Autonomous GitHub Agent powered by Kimi CLI - Autopilot for issue resolution, PR creation, and CI/CD feedback loops**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)

---

## 🚀 Overview

Kimi GitHub Agent enables **fully autonomous development workflows**. Write an issue, and the agent implements it automatically:

1. **Create Issue** → Write requirements in structured format
2. **Agent Picks Up** → Automatically when dependencies are met  
3. **Implementation** → Kimi CLI writes the code
4. **PR Created** → Automatic pull request with tests
5. **CI Feedback** → Fixes failures automatically (up to 3 attempts)
6. **Auto-merge** → Merges on approval + passing tests

**Your only job: Write good issues. The agent handles the rest.**

---

## ✨ Features

- 🤖 **Autonomous Implementation** - From issue to merged PR, fully automated
- 🔄 **CI/CD Integration** - Detects and fixes test failures automatically
- 📊 **Dependency Tracking** - Respects issue dependencies with checkbox format
- 🔀 **Auto-merge** - Merges approved PRs with passing checks
- 📦 **Multi-repository** - Manage multiple projects from one agent
- 🔔 **Telegram Notifications** - Real-time status updates (optional)
- 💾 **Context Management** - Automatic token overflow prevention
- 🔒 **Secure** - Token-based authentication, systemd hardening
- 📈 **Task Queue** - Sequential processing prevents conflicts
- 🔁 **Retry Logic** - Automatic retry on transient failures

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐                │
│  │  Issues   │  │    PRs    │  │ Workflows│                │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘                │
└────────┼──────────────┼─────────────┼──────────────────────┘
         │ labels       │ status      │ triggers
         ↓              ↓             ↓
┌────────────────────────────────────────────────────────────┐
│             GitHub Actions Workflows                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Process Ready    │  │Handle PR     │  │Auto-merge    │  │
│  │Issues (cron)    │  │Failures      │  │              │  │
│  └────────┬────────┘  └──────┬───────┘  └──────┬───────┘  │
└───────────┼────────────────────┼───────────────┼───────────┘
            │ webhook            │ webhook       │
            ↓                    ↓               ↓
┌───────────────────────────────────────────────────────────┐
│                  Kimi GitHub Agent                         │
│  ┌──────────────┐    ┌─────────────────┐                  │
│  │  API Server  │────│  Task Queue     │                  │
│  │  Express.js  │    │  Sequential     │                  │
│  └──────────────┘    └────────┬────────┘                  │
│                               ↓                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │              Task Processor                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │
│  │  │  Workspace   │  │   Context    │  │ Notifier │ │   │
│  │  │  Manager     │  │   Manager    │  │ Telegram │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────┘ │   │
│  └────────────────────┬───────────────────────────────┘   │
└───────────────────────┼──────────────────────────────────┘
                        ↓
              ┌─────────────────┐
              │   Kimi CLI      │
              │  (AI Assistant) │
              └─────────────────┘
```

---

## 📋 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- Kimi CLI installed and configured
- GitHub personal access token
- Git 2.x or higher

### Installation

```bash
# Clone repository
git clone https://github.com/drbobber/Kimi-github-agent.git
cd Kimi-github-agent

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start agent
npm start
```

### Configuration

Edit `.env` file:

```bash
# Required
GITHUB_TOKEN=ghp_your_github_token_here
KIMI_RELAY_TOKEN=your_secure_random_string

# Optional but recommended
KIMI_PATH=/usr/local/bin/kimi
WORKSPACES_DIR=/home/user/kimi-workspaces
SESSIONS_DIR=/home/user/.kimi-sessions
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_USER_ID=your_user_id
```

See [docs/SETUP.md](docs/SETUP.md) for detailed installation instructions.

---

## 📖 Usage

### 1. Create an Issue

Use the "🤖 Kimi Task" issue template:

```markdown
**Description:**
Add a dark mode toggle to the application header...

**Dependencies:**
- [ ] #42 - Complete authentication system
- [ ] #55 - Add theme context

**Acceptance Criteria:**
- [ ] Toggle button appears in header
- [ ] Theme persists across sessions
- [ ] All components render correctly in both themes

**Technical Notes:**
- Use existing ThemeContext
- Store preference in localStorage
- Follow the pattern in SettingsPanel.js
```

### 2. Agent Processes Automatically

- Scheduled workflow checks for ready issues every 30 minutes
- Picks up issues with `kimi-ready` label when dependencies are met
- Adds `in-progress` and `kimi-working` labels
- Clones/syncs repository, implements solution, creates PR

### 3. Review and Merge

- PR is created with implementation
- CI/CD runs automatically
- On failure: Agent attempts fixes (up to 3 times)
- On success + approval: Auto-merges
- Issue closes automatically

---

## 🎯 How It Works

### Workflow Cycle

1. **Issue Detection** (`.github/workflows/process-ready-issues.yml`)
   - Runs every 30 minutes
   - Finds issues with `kimi-ready` label
   - Checks dependency checkboxes
   - Dispatches to agent via webhook

2. **Implementation** (`src/task-processor.js`)
   - Clones/syncs repository
   - Installs dependencies
   - Creates feature branch (`kimi/issue-{n}`)
   - Executes Kimi CLI with generated prompt
   - Commits and pushes changes
   - Creates pull request

3. **CI/CD Integration** (`.github/workflows/handle-pr-failure.yml`)
   - Monitors workflow runs
   - Detects failures on Kimi branches
   - Extracts error logs
   - Sends fix request to agent
   - Retries up to 3 times

4. **Auto-merge** (`.github/workflows/auto-merge.yml`)
   - Triggers on check suite completion
   - Verifies all checks passed
   - Requires at least one approval
   - Merges and deletes branch

5. **Dependency Updates** (`.github/workflows/update-dependency-checkboxes.yml`)
   - Triggers when issues close
   - Finds referencing issues
   - Updates checkboxes: `- [ ]` → `- [x]`
   - Notifies when all dependencies resolved

### Task Types

- **implement_issue** - New feature or bug fix from issue
- **fix_pr_failures** - Automatic CI/CD failure fixes
- **respond_to_review** - Address review comments (future)

---

## 📁 Project Structure

```
kimi-github-agent/
├── src/                        # Source code
│   ├── index.js               # Express API server
│   ├── github-relay.js        # Task queue manager
│   ├── workspace-manager.js   # Git operations
│   ├── context-manager.js     # Context overflow prevention
│   ├── task-processor.js      # Task execution pipeline
│   ├── prompt-builder.js      # AI prompt generation
│   ├── github-api.js          # GitHub API wrapper
│   └── notifier.js            # Telegram notifications
├── .github/
│   ├── workflows/             # GitHub Actions
│   │   ├── process-ready-issues.yml
│   │   ├── handle-pr-failure.yml
│   │   ├── update-dependency-checkboxes.yml
│   │   └── auto-merge.yml
│   └── ISSUE_TEMPLATE/
│       └── kimi-task.yml      # Issue template
├── config/
│   └── projects.example.json  # Multi-repo config
├── daemon/
│   └── kimi-github-agent.service  # Systemd service
├── scripts/
│   ├── setup.sh              # Installation script
│   └── health-check.sh       # Health monitoring
├── docs/
│   ├── SETUP.md              # Installation guide
│   ├── REQUIREMENTS.md       # System requirements
│   ├── WORKFLOW.md           # Architecture docs
│   ├── ISSUE-WRITING-GUIDE.md # Best practices
│   └── TROUBLESHOOTING.md    # Debug guide
├── .env.example              # Environment template
├── package.json              # Node.js config
├── LICENSE                   # MIT License
├── CHANGELOG.md              # Version history
└── README.md                 # This file
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | API server port |
| `GITHUB_TOKEN` | Yes | - | GitHub personal access token |
| `KIMI_RELAY_TOKEN` | Yes | - | Webhook authentication token |
| `KIMI_PATH` | No | `kimi` | Path to Kimi CLI executable |
| `WORKSPACES_DIR` | No | `./workspaces` | Repository workspace directory |
| `SESSIONS_DIR` | No | `./sessions` | Context session storage |
| `MAX_RETRY_ATTEMPTS` | No | `3` | Max CI fix retry attempts |
| `MAX_CONTEXT_TOKENS` | No | `100000` | Context window size |
| `TASK_TIMEOUT_MS` | No | `900000` | Task timeout (15 min) |
| `TELEGRAM_BOT_TOKEN` | No | - | Telegram bot token (optional) |
| `TELEGRAM_USER_ID` | No | - | Telegram user ID (optional) |

### GitHub Token Scopes

Required scopes for `GITHUB_TOKEN`:
- ✅ `repo` - Full repository access
- ✅ `workflow` - Update GitHub Actions

### Multi-Repository Setup

Create `config/projects.json`:

```json
{
  "projects": [
    {
      "repository": "owner/repo1",
      "defaultBranch": "main",
      "packageManager": "pnpm",
      "enabled": true
    },
    {
      "repository": "owner/repo2",
      "defaultBranch": "master",
      "packageManager": "npm",
      "enabled": true
    }
  ]
}
```

---

## 🚀 Deployment

### Development Mode

```bash
npm run dev  # Auto-reload on changes
```

### Production - Systemd Service

```bash
# Copy service file
sudo cp daemon/kimi-github-agent.service /etc/systemd/system/

# Edit paths in service file
sudo nano /etc/systemd/system/kimi-github-agent.service

# Reload and start
sudo systemctl daemon-reload
sudo systemctl enable kimi-github-agent
sudo systemctl start kimi-github-agent

# Check status
sudo systemctl status kimi-github-agent

# View logs
journalctl -u kimi-github-agent -f
```

### Health Monitoring

```bash
# Check health endpoint
curl http://localhost:3000/health

# Run health check script
./scripts/health-check.sh
```

---

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Complete installation instructions
- **[Requirements](docs/REQUIREMENTS.md)** - System requirements and capacity planning
- **[Workflow](docs/WORKFLOW.md)** - Architecture and workflow documentation
- **[Issue Writing Guide](docs/ISSUE-WRITING-GUIDE.md)** - Best practices for writing issues
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common problems and solutions

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines (if available).

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Kimi CLI** - The AI assistant that powers the agent
- **GitHub Actions** - Workflow automation platform
- **Express.js** - Web framework
- **Grammy** - Telegram bot framework

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/drbobber/Kimi-github-agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/drbobber/Kimi-github-agent/discussions)
- **Documentation**: [docs/](docs/)

---

## 🗺️ Roadmap

See [CHANGELOG.md](CHANGELOG.md) for planned features:
- Review comment response automation
- Multi-agent parallel processing
- Web dashboard for monitoring
- Slack/Discord integration
- Custom prompt templates
- Docker containerization
- Performance metrics

---

## ⚡ Quick Links

- [Setup Guide](docs/SETUP.md)
- [Issue Writing Guide](docs/ISSUE-WRITING-GUIDE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Changelog](CHANGELOG.md)
- [License](LICENSE)

---

**Made with ❤️ by [drbobber](https://github.com/drbobber)**