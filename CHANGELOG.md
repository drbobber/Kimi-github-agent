# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-02-09

### Added

#### Core Features
- Express.js API server with webhook endpoints
- Task queue system for sequential processing
- Git workspace manager with automatic cloning and syncing
- Context manager with token overflow prevention
- Integration with Kimi CLI for AI-powered implementations
- GitHub API wrapper for PR and issue management
- Telegram notifications support (optional)

#### Source Files
- `src/index.js` - Main Express server with health check endpoint
- `src/github-relay.js` - Task queue and processing logic
- `src/workspace-manager.js` - Git operations and repository management
- `src/context-manager.js` - Context window management with auto-summarization
- `src/task-processor.js` - Task execution pipeline
- `src/prompt-builder.js` - AI prompt generation for different task types
- `src/github-api.js` - GitHub REST API integration
- `src/notifier.js` - Telegram notification system using Grammy

#### GitHub Workflows
- `.github/workflows/process-ready-issues.yml` - Scheduled issue processing (every 30 min)
- `.github/workflows/handle-pr-failure.yml` - Automatic PR failure detection and fixing
- `.github/workflows/update-dependency-checkboxes.yml` - Dependency tracking automation
- `.github/workflows/auto-merge.yml` - Auto-merge approved PRs with passing checks

#### Templates
- `.github/ISSUE_TEMPLATE/kimi-task.yml` - Structured issue template for tasks
- `.github/PULL_REQUEST_TEMPLATE.md` - PR template for agent-generated PRs

#### Configuration
- `package.json` - Node.js project configuration with ES modules
- `.env.example` - Environment variable template
- `config/projects.example.json` - Multi-project configuration example
- `.gitignore` - Comprehensive ignore rules
- `daemon/kimi-github-agent.service` - Systemd service configuration

#### Scripts
- `scripts/setup.sh` - Installation and setup automation
- `scripts/health-check.sh` - Service health monitoring

#### Documentation
- `docs/SETUP.md` - Complete installation and configuration guide
- `docs/REQUIREMENTS.md` - System requirements and capacity planning
- `docs/WORKFLOW.md` - Architecture and workflow documentation with diagrams
- `docs/ISSUE-WRITING-GUIDE.md` - Best practices for writing effective issues
- `docs/TROUBLESHOOTING.md` - Comprehensive troubleshooting guide
- `README.md` - Complete project documentation
- `LICENSE` - MIT License
- `CHANGELOG.md` - This file

#### Features
- **Automatic Issue Processing**: Watches for `kimi-ready` labeled issues
- **Dependency Tracking**: Supports issue dependencies with checkbox format
- **CI/CD Integration**: Automatic failure detection and fixing (up to 3 attempts)
- **Auto-merge**: Merges approved PRs with passing checks
- **Context Management**: Prevents token overflow with automatic summarization
- **Multi-repository Support**: Can manage multiple repositories
- **Task Queue**: Sequential processing to avoid conflicts
- **Retry Logic**: Automatic retry for transient failures
- **Health Monitoring**: REST API health endpoint
- **Telegram Notifications**: Real-time task status updates

#### Task Types
- `implement_issue` - Implement new features or fixes from issues
- `fix_pr_failures` - Automatically fix CI/CD failures
- `respond_to_review` - Address code review comments (future)

### Security
- Token-based webhook authentication
- Secure environment variable management
- Git credential handling
- Systemd security hardening options

### Dependencies
- express ^4.18.2 - Web framework
- dotenv ^16.4.7 - Environment configuration
- grammy ^1.36.1 - Telegram bot framework

### Requirements
- Node.js >= 18.0.0
- Kimi CLI installed and configured
- GitHub personal access token with repo and workflow scopes
- Git 2.x or higher

### Compatibility
- Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- macOS 10.15+
- Windows (via WSL2 only)

---

## Future Releases

### Planned Features
- [ ] Review comment response automation
- [ ] Multi-agent support for parallel processing
- [ ] Web dashboard for monitoring
- [ ] Slack/Discord notification support
- [ ] Custom prompt templates
- [ ] Advanced filtering and routing
- [ ] Performance metrics and analytics
- [ ] Docker containerization
- [ ] Kubernetes deployment manifests
- [ ] Webhook signature verification
- [ ] Rate limiting and throttling
- [ ] Session backup and restore
- [ ] Hot reload configuration
- [ ] Plugin system

---

[1.0.0]: https://github.com/drbobber/Kimi-github-agent/releases/tag/v1.0.0
