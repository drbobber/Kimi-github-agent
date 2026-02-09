# 📋 System Requirements

## Minimum Requirements

### Hardware

- **CPU**: 2 cores
- **RAM**: 2 GB available
- **Disk**: 10 GB free space (more for multiple workspaces)

### Software

- **Operating System**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+) or macOS 10.15+
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **git**: Version 2.x or higher
- **Kimi CLI**: Latest version

### Network

- **Outbound**: Access to github.com (port 443)
- **Inbound**: One open port for webhook endpoint (default: 3000)
- **Bandwidth**: At least 10 Mbps for cloning repositories

## Recommended Requirements

### Hardware

- **CPU**: 4+ cores
- **RAM**: 4+ GB available
- **Disk**: 50+ GB free space (SSD preferred)

### Software

- **Operating System**: Ubuntu 22.04 LTS or later
- **Node.js**: Version 20.x (LTS)
- **Process Manager**: systemd or PM2
- **Reverse Proxy**: nginx or Caddy (for production)

## Kimi CLI Requirements

The Kimi CLI is the core component that performs the actual code changes. Ensure:

1. **Installation**: Kimi CLI is installed and available in PATH
   ```bash
   which kimi
   # or specify KIMI_PATH in .env
   ```

2. **Configuration**: Kimi CLI is properly configured with API credentials
   ```bash
   kimi --version
   kimi config list
   ```

3. **Permissions**: User running the agent has permission to execute Kimi CLI

## GitHub Requirements

### Personal Access Token

Required scopes:
- `repo` - Full control of private repositories
  - `repo:status` - Access commit status
  - `repo_deployment` - Access deployment status
  - `public_repo` - Access public repositories
  - `repo:invite` - Access repository invitations
- `workflow` - Update GitHub Action workflows

### Repository Access

The GitHub token must have:
- Read access to target repositories
- Write access to create branches and PRs
- Workflow write access to trigger actions

## Optional Requirements

### Telegram Notifications

For Telegram notifications:
- Telegram Bot Token (from @BotFather)
- Your Telegram User ID (from @userinfobot)

### SSL/TLS Certificate

For production deployments:
- Valid SSL certificate for webhook endpoint
- Or use a reverse proxy (nginx, Caddy) with Let's Encrypt

## Capacity Planning

### Disk Space

Estimate disk usage based on your repositories:

```
Per Repository:
- Code: 50-500 MB (typical)
- Dependencies: 100 MB - 2 GB (node_modules, etc.)
- Git history: 10-100 MB

Sessions:
- Per task session: ~1-5 MB
- Context summaries: ~100 KB each

Total = (Number of repos × Average repo size) + Session storage
```

Example: For 10 repositories averaging 500 MB each:
```
10 repos × 500 MB = 5 GB
+ Sessions: 500 MB
+ OS/App: 2 GB
= ~8 GB minimum
```

### Memory

Memory usage scales with:
- Number of concurrent operations (usually 1)
- Repository size (during operations)
- Context window size

Typical usage:
- Base process: ~100-200 MB
- Per task: ~200-500 MB
- Peak: ~1 GB

Recommended: 2-4 GB RAM

### CPU

CPU usage is bursty:
- Idle: <5%
- During task processing: 20-80%
- Kimi CLI operations: 50-100% (short bursts)

Recommended: 2-4 cores

## Performance Considerations

### I/O Performance

Operations that benefit from fast storage:
- Git operations (clone, pull, push)
- Node.js dependency installation
- File system operations

**Recommendation**: Use SSD storage for workspaces directory

### Network Latency

Operations that benefit from low latency:
- GitHub API calls
- Git operations
- Kimi CLI API calls

**Recommendation**: Deploy close to your development team or in a region with good connectivity to GitHub

### Task Timeout

Default timeout: 15 minutes per task

Adjust based on:
- Repository size
- Complexity of issues
- CI/CD pipeline duration

Configure in `.env`:
```bash
TASK_TIMEOUT_MS=900000  # 15 minutes
```

## Security Considerations

### File System Permissions

```bash
# Recommended permissions
chmod 700 workspaces/
chmod 700 sessions/
chmod 600 .env
```

### Network Security

- Use firewall to restrict access to webhook endpoint
- Consider using authentication middleware
- Use HTTPS in production

### Token Security

- Never commit `.env` file
- Rotate tokens regularly
- Use separate tokens for different environments
- Store tokens in secure secret management system

## Monitoring

Recommended monitoring:
- Disk space usage (workspaces directory)
- Memory usage
- CPU usage
- Process uptime
- Health endpoint availability
- GitHub API rate limits

## Scaling

For multiple repositories or high activity:

1. **Vertical Scaling**: Increase RAM and CPU
2. **Storage Scaling**: Use network storage for workspaces
3. **Multiple Instances**: Run separate agents for different project groups
4. **Load Balancing**: Use multiple webhook endpoints (future feature)

## Compatibility

### Supported Node.js Versions

- ✅ Node.js 18.x (Minimum)
- ✅ Node.js 20.x (Recommended)
- ✅ Node.js 22.x (Latest)
- ❌ Node.js 16.x and below (Not supported)

### Supported Operating Systems

- ✅ Ubuntu 20.04+ (Recommended)
- ✅ Debian 11+
- ✅ CentOS/RHEL 8+
- ✅ macOS 10.15+
- ⚠️  Windows (via WSL2 only)
- ❌ Windows (native) - Not recommended

### Package Managers

Supported for target repositories:
- npm
- pnpm
- yarn
- Any custom package manager (via configuration)
