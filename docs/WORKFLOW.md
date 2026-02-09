# 🔄 Workflow Documentation

This document explains how the Kimi GitHub Agent autopilot system works.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐                │
│  │  Issues   │  │    PRs    │  │ Workflows│                │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘                │
└────────┼──────────────┼─────────────┼──────────────────────┘
         │              │             │
         │ labels       │ status      │ triggers
         ↓              ↓             ↓
┌────────────────────────────────────────────────────────────┐
│             GitHub Actions Workflows                        │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Process Ready    │  │Handle PR     │  │Auto-merge    │  │
│  │Issues (cron)    │  │Failures      │  │              │  │
│  └────────┬────────┘  └──────┬───────┘  └──────┬───────┘  │
└───────────┼────────────────────┼───────────────┼───────────┘
            │                    │               │
            │ webhook call       │ webhook       │ merge
            ↓                    ↓               ↓
┌───────────────────────────────────────────────────────────┐
│                  Kimi GitHub Agent                         │
│  ┌──────────────┐    ┌─────────────────┐                  │
│  │  API Server  │────│  Task Queue     │                  │
│  └──────────────┘    └────────┬────────┘                  │
│                               │                            │
│  ┌────────────────────────────┼────────────────────────┐  │
│  │        Task Processor                               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │  │
│  │  │  Workspace   │  │   Context    │  │ Notifier │  │  │
│  │  │  Manager     │  │   Manager    │  │          │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────┘  │  │
│  └────────────────────┬───────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────┘
                        │
                        ↓
              ┌─────────────────┐
              │   Kimi CLI      │
              │  (AI Assistant) │
              └─────────────────┘
```

## Complete Workflow Cycle

### Phase 1: Issue Creation and Preparation

1. **Developer creates issue** using the Kimi Task template
   - Fills in description, dependencies, acceptance criteria
   - Issue gets `kimi-ready` label automatically

2. **Dependency tracking** (if applicable)
   - Issue lists dependencies as checkboxes: `- [ ] #123`
   - Agent waits until all dependencies are closed
   - Workflow auto-updates checkboxes when dependencies close

3. **Issue becomes ready**
   - All dependency checkboxes are checked (or none exist)
   - Issue still has `kimi-ready` label
   - Issue doesn't have `in-progress` or `kimi-working` labels

### Phase 2: Automated Processing

4. **Scheduled workflow detects ready issue**
   - `process-ready-issues.yml` runs every 30 minutes
   - Scans for ready issues
   - Adds `in-progress` and `kimi-working` labels
   - Sends webhook to agent

5. **Agent receives task**
   - Webhook authenticated via `KIMI_RELAY_TOKEN`
   - Task added to queue
   - Agent begins processing sequentially

6. **Task processing**
   ```
   ┌─→ Clone/sync repository
   │  ↓
   │  Install dependencies (npm/pnpm/yarn)
   │  ↓
   │  Create branch: kimi/issue-{number}
   │  ↓
   │  Build Kimi prompt with issue details
   │  ↓
   │  Execute Kimi CLI (AI implements solution)
   │  ↓
   │  Commit changes
   │  ↓
   │  Push to GitHub
   │  ↓
   │  Create Pull Request
   │  ↓
   │  Add labels: kimi-implemented
   │  ↓
   └─ Success ✓
   ```

### Phase 3: CI/CD and Feedback Loop

7. **Pull Request created**
   - PR links to original issue: "Closes #123"
   - CI/CD workflows run automatically
   - Tests, linting, builds execute

8. **Scenario A: All checks pass** ✅
   ```
   Checks pass
     ↓
   Awaits review
     ↓
   Reviewer approves
     ↓
   Auto-merge workflow triggers
     ↓
   PR merged
     ↓
   Issue closed automatically
     ↓
   Dependent issues updated
   ```

9. **Scenario B: Checks fail** ❌
   ```
   Checks fail
     ↓
   handle-pr-failure.yml triggered
     ↓
   Extracts failure logs
     ↓
   Sends fix request to agent (if retries < 3)
     ↓
   Agent analyzes failures
     ↓
   Kimi CLI fixes issues
     ↓
   Pushes fix
     ↓
   CI runs again
     ↓
   [Back to step 7]
   
   If 3 attempts fail:
     ↓
   Add comment requesting human help
     ↓
   Add 'needs-human-review' label
     ↓
   Send Telegram notification (if configured)
   ```

### Phase 4: Review and Merge

10. **Human review** (required)
    - Reviewer examines changes
    - Can request changes via PR review
    - Agent responds to review comments (future feature)

11. **Auto-merge conditions**
    - All CI checks passed
    - At least one approval
    - No change requests
    - PR from `kimi/*` branch
    
12. **Post-merge**
    - Branch deleted automatically
    - Issue closed via "Closes #" in PR
    - Dependent issues get checkboxes updated
    - New dependent issues may become ready

## Task Types

### 1. Implement Issue (`implement_issue`)

**Trigger**: Issue with `kimi-ready` label, no blockers

**Process**:
1. Clone repository
2. Create feature branch
3. Analyze issue requirements
4. Implement solution
5. Create pull request

**Prompt includes**:
- Issue title and description
- Acceptance criteria
- Technical notes
- Files to modify (if specified)

### 2. Fix PR Failures (`fix_pr_failures`)

**Trigger**: CI workflow fails on Kimi-created PR

**Process**:
1. Checkout PR branch
2. Analyze failure logs
3. Identify root cause
4. Implement fixes
5. Push changes

**Prompt includes**:
- Failure logs
- Workflow run details
- Previous attempt count
- PR context

### 3. Respond to Review (`respond_to_review`)

**Trigger**: Review comments on Kimi PR (future feature)

**Process**:
1. Checkout PR branch
2. Parse review comments
3. Address each comment
4. Push changes
5. Respond to reviewer

## Context Management

The agent manages conversation context to avoid token limits:

```
Session Start (0 tokens)
  ↓
Add messages to history
  ↓
Monitor token count
  ↓
At 80% capacity? ─No→ Continue
  │
  Yes
  ↓
Generate summary of conversation
  ↓
Reset context with:
  - Summary of previous context
  - Last 5 messages
  - Current task details
  ↓
Continue with reduced tokens
```

## Queue Management

Tasks are processed sequentially:

```
Queue: [Task A] [Task B] [Task C]
         ↓
Processing: Task A (others wait)
         ↓
Complete Task A
         ↓
Queue: [Task B] [Task C]
         ↓
Processing: Task B
```

**Benefits**:
- No resource conflicts
- Predictable behavior
- Simpler debugging
- Lower resource usage

## Error Handling

### Retryable Errors

Automatically retried (up to 3 times):
- Network timeouts
- GitHub API rate limits
- Temporary connection issues

### Non-retryable Errors

Immediate failure + notification:
- Invalid credentials
- Permission denied
- Missing repository
- Syntax errors in prompts

### Human Escalation

Triggered when:
- 3 retry attempts exhausted
- Kimi unable to fix CI failures
- Unrecognized error type
- Manual intervention explicitly needed

**Actions**:
1. Add GitHub comment
2. Add `needs-human-review` label
3. Send Telegram notification
4. Log detailed error information

## Monitoring and Observability

### Health Check Endpoint

```bash
GET /health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "queue": {
    "length": 2,
    "isProcessing": true,
    "currentTask": {
      "id": "1234567890-abc",
      "action": "implement_issue",
      "retries": 0
    }
  }
}
```

### Logs

- Console output with emoji prefixes
- Structured JSON logs (optional)
- Systemd journal (when running as service)

### Telegram Notifications

Real-time updates on:
- Task started
- Task completed
- Task failed
- Human intervention needed

## Best Practices

### For Issue Authors

1. **Write clear descriptions** - Be specific about what needs to be done
2. **Define acceptance criteria** - Make success measurable
3. **List dependencies** - Use checkbox format: `- [ ] #123`
4. **Provide context** - Include links, examples, constraints
5. **Start small** - Break large features into smaller issues

### For Reviewers

1. **Review promptly** - Agent-created PRs are typically focused
2. **Be specific** - Clear feedback helps future improvements
3. **Check tests** - Ensure adequate test coverage
4. **Verify acceptance criteria** - Does it meet the requirements?

### For Operators

1. **Monitor disk space** - Workspaces can grow large
2. **Rotate logs** - Configure log rotation
3. **Update dependencies** - Keep Node.js and packages current
4. **Backup configurations** - Save `.env` and `config/` securely
5. **Monitor API limits** - GitHub has rate limits

## Troubleshooting Workflows

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed debugging steps.
