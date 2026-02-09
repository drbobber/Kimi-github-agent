# 🔧 Troubleshooting Guide

Common issues and solutions for the Kimi GitHub Agent.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Agent Won't Start](#agent-wont-start)
- [Issues Not Being Processed](#issues-not-being-processed)
- [Error Handling & Recovery](#error-handling--recovery)
- [PR Creation Failures](#pr-creation-failures)
- [CI/CD Integration Problems](#cicd-integration-problems)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

## Installation Issues

### Node.js Version Too Old

**Symptom**: Error about async/await or ES modules

**Solution**:
```bash
# Check version
node --version

# If < 18.0.0, upgrade Node.js
# Using nvm (recommended):
nvm install 18
nvm use 18

# Or download from nodejs.org
```

### npm install Fails

**Symptom**: Errors during `npm install`

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and try again
rm -rf node_modules package-lock.json
npm install

# Try with legacy peer deps
npm install --legacy-peer-deps
```

### Kimi CLI Not Found

**Symptom**: "kimi: command not found"

**Solutions**:
1. Install Kimi CLI (follow Kimi documentation)
2. Or specify path in `.env`:
   ```bash
   KIMI_PATH=/path/to/kimi
   ```

## Agent Won't Start

### Port Already in Use

**Symptom**: "Error: listen EADDRINUSE: address already in use :::3000"

**Solutions**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

### Missing Environment Variables

**Symptom**: "GITHUB_TOKEN is required"

**Solution**:
1. Copy `.env.example` to `.env`
2. Fill in required values:
   ```bash
   GITHUB_TOKEN=ghp_your_token_here
   KIMI_RELAY_TOKEN=your_relay_token
   ```

### Permission Denied Errors

**Symptom**: "EACCES: permission denied"

**Solutions**:
```bash
# Fix directory permissions
chmod 700 workspaces/
chmod 700 sessions/
chmod 600 .env

# Or run with correct user
# Don't run as root in production!
```

## Issues Not Being Processed

### Issue Stays in Queue

**Symptom**: Issue has `kimi-ready` label but nothing happens

**Possible Causes & Solutions**:

1. **Unchecked Dependencies**
   ```markdown
   # Issue has this:
   Dependencies:
   - [ ] #123  ← Still open!
   ```
   **Solution**: Wait for dependency to be closed or remove it

2. **Already Has In-Progress Label**
   ```
   Labels: kimi-ready, in-progress
   ```
   **Solution**: Remove `in-progress` label to reprocess

3. **Workflow Not Running**
   
   Check workflow runs:
   ```bash
   # Go to: https://github.com/owner/repo/actions
   # Look for "Process Ready Issues" workflow
   ```
   
   **Solution**: Manually trigger workflow or check schedule

4. **Webhook Not Configured**
   
   The workflow might have webhook disabled (commented out).
   
   **Solution**: 
   - Set GitHub secrets: `KIMI_RELAY_URL` and `KIMI_RELAY_TOKEN`
   - Uncomment webhook code in `.github/workflows/process-ready-issues.yml`

## Error Handling & Recovery

The agent includes comprehensive error handling and automatic recovery mechanisms. This section explains how to diagnose and resolve various error scenarios.

### Understanding Error Types

The agent categorizes all errors into 6 types, each with specific handling:

#### 1. Quota Exceeded (💳 `error-quota_exceeded`)

**What it means**: Kimi CLI has run out of tokens or hit a quota limit.

**Symptoms**:
- Issue labeled with `error-quota_exceeded`
- Error message mentions "quota", "rate limit", or "insufficient credits"
- Task fails immediately or mid-execution

**Solutions**:
```bash
# Check Kimi account balance
kimi account status

# Wait for quota to reset (usually hourly or daily)
# Time depends on your Kimi subscription

# Temporary workaround: Break large tasks into smaller sub-issues
```

**Prevention**:
- Monitor Kimi usage regularly
- Upgrade subscription if hitting limits frequently
- Break complex tasks into smaller, focused issues
- Configure quota alerts if available

#### 2. Context Overflow (📊 `error-context_overflow`)

**What it means**: Task is too large for the AI context window.

**Symptoms**:
- Issue labeled with `error-context_overflow`
- Error mentions "context", "too large", or "token limit exceeded"
- Large codebases or very complex tasks

**Solutions**:
1. **Break into sub-issues**:
   ```markdown
   # Parent issue
   Dependencies:
   - [ ] #101 - Part 1: Setup database
   - [ ] #102 - Part 2: Create API endpoints
   - [ ] #103 - Part 3: Add frontend
   ```

2. **Reduce scope**:
   - Focus on one feature at a time
   - Split large files into smaller modules
   - Provide specific file paths to modify

3. **Clear old sessions**:
   ```bash
   # Remove session for this issue
   rm sessions/*issue-123*
   ```

**Prevention**:
- Keep issues focused and specific
- Use dependency tracking for complex features
- Limit context by specifying exact files to modify

#### 3. Network Error (🌐 `error-network_error`)

**What it means**: Connection problem prevented task completion.

**Symptoms**:
- Issue labeled with `error-network_error`
- Errors like `ECONNREFUSED`, `ETIMEDOUT`, `ECONNRESET`
- Transient failures that may work on retry

**Solutions**:
```bash
# Check network connectivity
ping github.com
curl -I https://api.github.com

# Check DNS resolution
nslookup github.com

# Check firewall rules
sudo iptables -L | grep -i github

# If behind proxy, configure:
export HTTP_PROXY=http://proxy:8080
export HTTPS_PROXY=http://proxy:8080
```

**Auto-retry**: Network errors trigger automatic retry (up to 3 attempts)

#### 4. Timeout (⏱️ `error-timeout`)

**What it means**: Task exceeded maximum allowed execution time.

**Symptoms**:
- Issue labeled with `error-timeout`
- Error message includes "timeout" or "timed out"
- Task was running for 15+ minutes (default timeout)

**Solutions**:
1. **Increase timeout** (in `.env`):
   ```bash
   TASK_TIMEOUT_MS=1800000  # 30 minutes
   ```

2. **Simplify the task**:
   - Break into smaller issues
   - Reduce number of files to modify
   - Remove complex requirements

3. **Check system performance**:
   ```bash
   # CPU usage
   top
   
   # Disk I/O
   iostat
   
   # If high, consider upgrading hardware
   ```

**Prevention**:
- Keep tasks small and focused
- Monitor task completion times
- Adjust timeout based on your typical task size

#### 5. Git Conflict (🔀 `error-git_conflict`)

**What it means**: Changes couldn't be pushed due to conflicts.

**Symptoms**:
- Issue labeled with `error-git_conflict`
- Error mentions "conflict", "diverged", or "rejected"
- Someone else pushed to the branch

**Solutions**:
```bash
# Check if branch exists
gh pr list --head kimi/issue-123

# If PR exists, check for conflicts
gh pr view 456 --json mergeable

# Manual resolution:
cd workspaces/owner-repo
git fetch origin
git checkout kimi/issue-123
git pull origin main
# Resolve conflicts manually
git add .
git commit -m "Resolve conflicts"
git push
```

**Prevention**:
- Don't manually push to `kimi/*` branches
- Let agent handle retries
- Use branch protection rules

#### 6. Unknown Error (❓ `error-unknown`)

**What it means**: Unexpected error not matching other categories.

**Symptoms**:
- Issue labeled with `error-unknown`
- Generic error message
- May indicate bug in agent or Kimi CLI

**Solutions**:
1. **Check detailed logs**:
   ```bash
   journalctl -u kimi-github-agent -n 200 | grep -A 20 "issue-123"
   ```

2. **Check Kimi CLI logs**:
   ```bash
   # Kimi logs location depends on installation
   cat ~/.kimi/logs/latest.log
   ```

3. **Reproduce manually**:
   ```bash
   cd workspaces/owner-repo
   kimi "Implement issue #123: [title]"
   ```

4. **Report issue**:
   - If reproducible, open GitHub issue
   - Include error logs and stack trace

### Automatic Retry Logic

The agent automatically retries failed tasks with exponential backoff:

**Retry Schedule** (default configuration):
- **Attempt 1**: Immediate (initial attempt)
- **Attempt 2**: After 5 minutes (adds `retry-1` label)
- **Attempt 3**: After 15 minutes (adds `retry-2` label)
- **Attempt 4**: After 30 minutes (adds `retry-3` label)

**After 3 retries**:
- Task marked as `kimi-failed`
- Label `needs-human-review` added
- No more automatic retries

**Configuration** (in `config.json`):
```json
{
  "errorHandling": {
    "maxRetries": 3,
    "retryDelayMinutes": [5, 15, 30],
    "enableAutoRetry": true,
    "notifyOnFailure": true
  }
}
```

**Monitoring retries**:
```bash
# Check retry labels on issues
gh issue list --label retry-1,retry-2,retry-3

# View retry notifications in Telegram (if configured)
# Notifications include attempt number and remaining attempts
```

### Stuck Issue Recovery

Issues can get stuck with `kimi-working` label if:
- Agent process crashes
- Server restarts during task
- Network interruption prevents completion
- Timeout occurs but label cleanup fails

**Automatic Recovery**:
- Recovery workflow runs every 2 hours
- Detects issues labeled `kimi-working` for >2 hours
- Automatically:
  - Removes `kimi-working` and `in-progress` labels
  - Adds `kimi-recovered` and `needs-human-review` labels
  - Posts recovery comment with diagnostics
  - Sends Telegram notification

**Manual Recovery**:
```bash
# Using GitHub CLI
gh workflow run kimi-recover-stuck.yml

# Or via GitHub UI:
# Actions → Recover Stuck Issues → Run workflow
```

**After Recovery**:
1. Review error logs in issue comments
2. Check if partial work was committed:
   ```bash
   gh pr list --head kimi/issue-123
   ```
3. Decide next action:
   - Re-queue: Add `kimi-ready` label (removes recovery labels first)
   - Manual fix: Assign to developer
   - Close: If issue is invalid or duplicate

**Check Recovery Status**:
```bash
# List recovered issues
gh issue list --label kimi-recovered

# View recovery workflow runs
gh run list --workflow=kimi-recover-stuck.yml
```

**Configure threshold** (in workflow file):
```yaml
# .github/workflows/kimi-recover-stuck.yml
# Change cron schedule or threshold_hours
```

### Label Management

**Setup all labels** (first-time setup or new repository):
```bash
# Using GitHub CLI
./scripts/setup-labels.sh owner/repo

# Or with API token
GITHUB_TOKEN=ghp_xxx ./scripts/setup-labels.sh owner/repo
```

**Check label status**:
```bash
# List all labels
gh label list

# Check specific error labels
gh label list | grep error-

# View issues by error type
gh issue list --label error-quota_exceeded
gh issue list --label error-timeout
```

**Manual label operations**:
```bash
# Add error label
gh issue edit 123 --add-label error-network_error

# Remove working labels
gh issue edit 123 --remove-label kimi-working,in-progress

# Add recovery labels
gh issue edit 123 --add-label kimi-recovered,needs-human-review
```

### Error Notifications

If Telegram notifications are configured, you'll receive:

**On Task Failure**:
```
❌ Task Failed - QUOTA EXCEEDED

Repository: owner/repo
Action: implement_issue
Issue: #123 - Add dark mode
Attempt: 1/3
Error Type: quota_exceeded

🔄 Auto-retry scheduled
```

**On Retry**:
```
🔄 Retry Attempt 2/3

Repository: owner/repo
Issue: #123 - Add dark mode

Retrying after previous failure...
```

**On Recovery**:
```
🔄 Stuck Issue Recovery

Repository: owner/repo
Issue: #123
Time Stuck: 3.5 hours

The issue was marked as kimi-working but did not complete.
Recovery actions have been taken.
```

**Setup Telegram notifications**:
```bash
# In .env file
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_USER_ID=123456789
```

### Troubleshooting Failed Tasks

**Step-by-step diagnosis**:

1. **Check issue labels**:
   ```bash
   gh issue view 123 --json labels
   ```
   - Look for `error-*` labels to identify error type
   - Check for `retry-*` labels to see attempt count

2. **Read error comment**:
   ```bash
   gh issue view 123 --comments
   ```
   - Look for error comment with suggestions
   - Follow specific recommendations for error type

3. **Check agent logs**:
   ```bash
   journalctl -u kimi-github-agent -n 500 | grep "issue-123"
   ```

4. **Check branch status**:
   ```bash
   # Does branch exist?
   gh pr list --head kimi/issue-123
   
   # Check commits
   gh pr view 456 --json commits
   ```

5. **Verify configuration**:
   ```bash
   # Check config.json exists and is valid
   cat config.json | jq .errorHandling
   ```

6. **Test Kimi CLI**:
   ```bash
   cd workspaces/owner-repo
   kimi "Simple test task"
   ```

### Common Error Scenarios

#### Scenario: All tasks failing with quota_exceeded

**Diagnosis**: Kimi account out of credits

**Solution**:
1. Check account: `kimi account status`
2. Wait for reset or add credits
3. Temporarily disable processing:
   ```bash
   # Stop agent
   sudo systemctl stop kimi-github-agent
   ```
4. Re-enable when quota available

#### Scenario: Tasks failing after 15 minutes

**Diagnosis**: Tasks timing out

**Solution**:
1. Increase timeout:
   ```bash
   # In .env
   TASK_TIMEOUT_MS=3600000  # 60 minutes
   ```
2. Or break tasks into smaller issues

#### Scenario: Multiple issues stuck with kimi-working

**Diagnosis**: Agent crashed or restarted

**Solution**:
1. Run recovery manually:
   ```bash
   gh workflow run kimi-recover-stuck.yml
   ```
2. Check agent status:
   ```bash
   sudo systemctl status kimi-github-agent
   ```
3. Review crash logs:
   ```bash
   journalctl -u kimi-github-agent -n 500
   ```

#### Scenario: Retries not working

**Diagnosis**: Auto-retry might be disabled

**Solution**:
```bash
# Check config.json
cat config.json | jq .errorHandling.enableAutoRetry

# If false or missing, enable:
# Edit config.json:
{
  "errorHandling": {
    "enableAutoRetry": true
  }
}

# Restart agent
sudo systemctl restart kimi-github-agent
```

### Known Limitations

**Retry Persistence**:
- Retries scheduled with setTimeout are lost if agent restarts
- After restart, failed tasks won't automatically retry
- Workaround: Re-add `kimi-ready` label to retry manually

**Recovery Workflow**:
- Checks up to 500 events per issue (5 pages × 100 events)
- Very active issues might need manual recovery
- Consider cleaning up old events if this is a problem

**For production deployments**, consider:
- Implementing persistent retry queue (Redis, database)
- External monitoring and alerting
- Automated restarts with systemd
- Regular health checks

### Agent Processing But No PR Created

**Symptom**: Agent logs show success but no PR appears

**Check**:
```bash
# View agent logs
journalctl -u kimi-github-agent -n 100

# Or if running in terminal
# Look for these messages:
# ✅ Kimi execution completed successfully
# ✅ Pull request created: #123
```

**Possible Causes**:
1. **No Changes Made**
   - Kimi couldn't determine what to do
   - Issue description too vague
   
   **Solution**: Improve issue description, add more details

2. **Git Push Failed**
   - Permission issues
   - Branch already exists
   
   **Solution**: Check git credentials, delete remote branch

3. **GitHub API Error**
   ```
   GitHub API error (403): Resource not accessible
   ```
   **Solution**: Check token permissions (needs `repo` and `workflow` scopes)

## PR Creation Failures

### Authentication Failed

**Symptom**: "401 Unauthorized" or "Bad credentials"

**Solutions**:
```bash
# Check token is correct
echo $GITHUB_TOKEN

# Regenerate token if needed
# https://github.com/settings/tokens

# Update .env
GITHUB_TOKEN=ghp_new_token_here

# Restart agent
sudo systemctl restart kimi-github-agent
```

### Branch Already Exists

**Symptom**: "Error: branch 'kimi/issue-123' already exists"

**Solutions**:
```bash
# Delete remote branch
git push origin --delete kimi/issue-123

# Or use GitHub UI:
# Go to repo → Branches → Delete branch
```

### PR Already Exists

**Symptom**: "A pull request already exists"

**Solution**: This is normal. Agent won't create duplicate PRs. Close existing PR if you want to recreate.

## CI/CD Integration Problems

### Workflows Not Triggering

**Symptom**: PR created but no CI checks run

**Solutions**:
1. Check workflow files exist in `.github/workflows/`
2. Check workflow triggers include `pull_request`
3. Check PR is from correct branch prefix (`kimi/*`)

### Auto-merge Not Working

**Symptom**: Tests pass, PR approved, but not merged

**Check**:
```yaml
# In .github/workflows/auto-merge.yml
# Ensure these conditions are met:
- All checks passed
- At least one approval
- No change requests
- Branch starts with 'kimi/'
- PR is mergeable (no conflicts)
```

**Solutions**:
1. Check workflow logs in Actions tab
2. Ensure required checks are configured in branch protection
3. Check PR branch name starts with `kimi/`

### Handle PR Failure Workflow Not Triggering

**Symptom**: CI fails but agent doesn't attempt fix

**Check**:
```bash
# Does workflow file exist?
ls -la .github/workflows/handle-pr-failure.yml

# Check workflow runs
# GitHub → Actions → "Handle PR Failures"
```

**Solutions**:
1. Workflow might be disabled
2. Check `workflow_run` permissions
3. Verify branch name matches pattern

## Performance Issues

### Agent Running Slow

**Symptoms**:
- High CPU usage
- Tasks take very long
- Memory usage growing

**Solutions**:

1. **Check Disk Space**
   ```bash
   df -h
   du -sh workspaces/
   
   # Clean old workspaces
   rm -rf workspaces/old-repo/
   ```

2. **Check Memory**
   ```bash
   free -h
   
   # If low, restart agent
   sudo systemctl restart kimi-github-agent
   ```

3. **Monitor Process**
   ```bash
   # CPU and memory usage
   top -p $(pgrep -f "node.*index.js")
   
   # or
   htop
   ```

4. **Increase Timeout**
   ```bash
   # In .env
   TASK_TIMEOUT_MS=1800000  # 30 minutes
   ```

### Repository Cloning Too Slow

**Symptoms**: Takes forever to clone large repos

**Solutions**:
1. **Use Shallow Clone** (modify workspace-manager.js):
   ```bash
   git clone --depth 1 <url>
   ```

2. **Use Local Mirror** (for frequently used repos):
   ```bash
   # Clone once to /opt/mirrors/
   # Then use: git clone file:///opt/mirrors/repo
   ```

3. **Check Network**:
   ```bash
   # Test GitHub connectivity
   curl -I https://github.com
   
   # Test download speed
   wget --output-document=/dev/null https://github.com
   ```

## Debugging Tips

### Enable Verbose Logging

Modify `src/index.js`:
```javascript
// Add at the top
const DEBUG = process.env.DEBUG === 'true';

// Use throughout
if (DEBUG) console.log('Debug info:', data);
```

Then:
```bash
# In .env
DEBUG=true

# Restart
sudo systemctl restart kimi-github-agent
```

### Check Agent Logs

**Systemd service**:
```bash
# Recent logs
journalctl -u kimi-github-agent -n 100

# Follow logs (live)
journalctl -u kimi-github-agent -f

# Today's logs
journalctl -u kimi-github-agent --since today

# Errors only
journalctl -u kimi-github-agent -p err
```

**Terminal/dev mode**:
Logs appear in console directly

### Check GitHub Webhook Deliveries

If using webhooks:
1. Go to repo Settings → Webhooks
2. Click on your webhook
3. Click "Recent Deliveries"
4. Check request/response

### Test Health Endpoint

```bash
# Basic check
curl http://localhost:3000/health

# Pretty print
curl http://localhost:3000/health | jq .

# Check from outside
curl https://your-domain.com/health
```

### Manually Trigger Workflow

```bash
# Using GitHub CLI
gh workflow run process-ready-issues.yml

# Or use GitHub UI:
# Actions → Process Ready Issues → Run workflow
```

### Check Context Sessions

```bash
# View sessions
ls -lh sessions/

# Check session file
cat sessions/owner-repo-issue-123.json | jq .

# Check token usage
jq '.tokenCount, .maxTokens' sessions/*.json
```

### Test Kimi CLI Directly

```bash
# Go to a test repo
cd workspaces/test-repo/

# Run Kimi with a simple prompt
kimi "List all JavaScript files in this directory"

# Check Kimi configuration
kimi config list
```

### Inspect Queue

Check agent's internal state:
```javascript
// Add endpoint to src/index.js
app.get('/debug/queue', (req, res) => {
  res.json({
    queue: relay.queue,
    isProcessing: relay.isProcessing,
    currentTask: relay.currentTask
  });
});
```

### Common Error Messages

#### "No changes were made by Kimi"

**Cause**: Kimi completed but didn't modify any files

**Solutions**:
- Issue description may be unclear
- Kimi may have determined no changes needed
- Check Kimi CLI logs for reasoning

#### "Failed to execute Kimi: spawn ENOENT"

**Cause**: Kimi CLI not found

**Solution**: Install Kimi or set `KIMI_PATH` in `.env`

#### "GitHub API error (403): rate limit exceeded"

**Cause**: Too many API requests

**Solution**: Wait for reset, or use token with higher rate limit

#### "Context approaching limit"

**Cause**: Session has too many tokens

**This is normal** - Agent will automatically summarize and reset context

## Getting More Help

### Collect Information

When asking for help, provide:
1. Agent version: `git rev-parse HEAD`
2. Node.js version: `node --version`
3. OS: `uname -a`
4. Error messages (full stack trace)
5. Relevant logs
6. Steps to reproduce

### Where to Ask

1. **GitHub Issues**: https://github.com/drbobber/Kimi-github-agent/issues
2. **Discussions**: Check repo discussions
3. **Logs**: Include relevant logs (redact sensitive info!)

### Before Opening an Issue

1. Search existing issues
2. Check this troubleshooting guide
3. Try the debugging tips above
4. Include reproduction steps

## Maintenance

### Regular Maintenance Tasks

```bash
# Weekly: Clean old sessions (older than 30 days)
find sessions/ -name "*.json" -mtime +30 -delete

# Monthly: Clean old workspaces
# (Manual review recommended)
ls -lt workspaces/

# Check disk space
df -h

# Update dependencies
npm outdated
npm update
```

### Health Monitoring Script

Add to crontab:
```bash
# Run health check every hour
0 * * * * /path/to/kimi-github-agent/scripts/health-check.sh || mail -s "Kimi Agent Down" admin@example.com
```

## Recovery Procedures

### If Agent Crashes

```bash
# Check why it crashed
journalctl -u kimi-github-agent -n 200

# Restart
sudo systemctl restart kimi-github-agent

# Check status
sudo systemctl status kimi-github-agent
```

### If Queue is Stuck

```bash
# Stop agent
sudo systemctl stop kimi-github-agent

# Clear queue (if needed - this loses queued tasks!)
# Delete task files if you implement persistence

# Restart
sudo systemctl start kimi-github-agent
```

### If Workspace is Corrupted

```bash
# Remove corrupted workspace
rm -rf workspaces/owner-repo/

# Agent will re-clone on next run
```

## Prevention

### Monitoring Setup

```bash
# Add to monitoring system
# Check these metrics:
- /health endpoint responds
- Disk space > 20%
- Memory usage < 80%
- Process is running
- No errors in last hour
```

### Backup Configuration

```bash
# Backup important files
tar -czf kimi-agent-config-$(date +%Y%m%d).tar.gz \
  .env \
  config/ \
  .github/workflows/

# Store securely
```

### Update Regularly

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm install

# Restart
sudo systemctl restart kimi-github-agent
```
