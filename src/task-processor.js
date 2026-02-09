import { spawn } from 'child_process';
import { buildImplementationPrompt, buildFixPrompt, buildReviewResponsePrompt } from './prompt-builder.js';
import { createPullRequest, addComment, addLabels, removeLabel } from './github-api.js';
import { notifyHumanRequired, notifyTaskFailure } from './notifier.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Error types for categorization
 */
export const ErrorType = {
  QUOTA_EXCEEDED: 'quota_exceeded',
  CONTEXT_OVERFLOW: 'context_overflow',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  GIT_CONFLICT: 'git_conflict',
  UNKNOWN: 'unknown'
};

/**
 * Categorize error based on error message and context
 */
function categorizeError(error) {
  const message = error.message.toLowerCase();
  
  // Check for quota/token errors
  if (message.includes('quota') || message.includes('rate limit') || 
      message.includes('token limit') || message.includes('insufficient credits')) {
    return ErrorType.QUOTA_EXCEEDED;
  }
  
  // Check for context overflow
  if (message.includes('context') && (message.includes('too large') || message.includes('overflow') ||
      message.includes('token limit exceeded') || message.includes('context window'))) {
    return ErrorType.CONTEXT_OVERFLOW;
  }
  
  // Check for network errors
  if (message.includes('network') || message.includes('econnrefused') || 
      message.includes('enotfound') || message.includes('etimedout') ||
      message.includes('econnreset') || message.includes('fetch failed')) {
    return ErrorType.NETWORK_ERROR;
  }
  
  // Check for timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return ErrorType.TIMEOUT;
  }
  
  // Check for git conflict errors
  if (message.includes('conflict') || message.includes('merge') || 
      message.includes('diverged') || message.includes('rejected')) {
    return ErrorType.GIT_CONFLICT;
  }
  
  return ErrorType.UNKNOWN;
}

/**
 * Get error details for user-friendly display
 */
function getErrorDetails(errorType) {
  const details = {
    [ErrorType.QUOTA_EXCEEDED]: {
      title: '💳 Quota/Token Limit Exceeded',
      description: 'The Kimi CLI has run out of tokens or hit a quota limit.',
      suggestions: [
        'Wait for quota to reset (usually hourly or daily)',
        'Check Kimi account credit balance',
        'Consider upgrading Kimi subscription if this happens frequently',
        'Break down large tasks into smaller sub-issues'
      ]
    },
    [ErrorType.CONTEXT_OVERFLOW]: {
      title: '📊 Context Window Overflow',
      description: 'The task is too large for the AI context window.',
      suggestions: [
        'Break the issue into smaller, focused sub-tasks',
        'Reduce the scope of changes required',
        'Simplify the implementation requirements',
        'Consider manual implementation for very large changes'
      ]
    },
    [ErrorType.NETWORK_ERROR]: {
      title: '🌐 Network Error',
      description: 'A network connection error prevented task completion.',
      suggestions: [
        'This is typically a transient error - retry should work',
        'Check if Kimi API is accessible',
        'Verify network connectivity',
        'Check for firewall or proxy issues'
      ]
    },
    [ErrorType.TIMEOUT]: {
      title: '⏱️ Task Timeout',
      description: 'The task took longer than the maximum allowed time.',
      suggestions: [
        'Break the issue into smaller tasks',
        'Simplify the requirements',
        'Increase TASK_TIMEOUT_MS if appropriate',
        'Consider if the task is too complex for automation'
      ]
    },
    [ErrorType.GIT_CONFLICT]: {
      title: '🔀 Git Conflict',
      description: 'Changes could not be pushed due to conflicts or diverged branches.',
      suggestions: [
        'Someone else may have pushed to the same branch',
        'The base branch may have been updated',
        'Manual intervention may be needed to resolve conflicts',
        'Check the branch state in the repository'
      ]
    },
    [ErrorType.UNKNOWN]: {
      title: '❓ Unknown Error',
      description: 'An unexpected error occurred.',
      suggestions: [
        'Check the error logs for more details',
        'Review the task requirements for issues',
        'Verify all dependencies are available',
        'Contact support if the issue persists'
      ]
    }
  };
  
  return details[errorType] || details[ErrorType.UNKNOWN];
}

/**
 * Load error handling configuration
 */
async function loadErrorConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config.errorHandling || {};
  } catch (error) {
    console.warn('⚠️  Could not load config.json, using defaults');
    return {};
  }
}

/**
 * Handle task error with proper logging, labeling, and notifications
 */
async function handleTaskError(task, error) {
  const errorType = categorizeError(error);
  const errorDetails = getErrorDetails(errorType);
  const config = await loadErrorConfig();
  
  console.error(`❌ Task failed with ${errorType}:`, error.message);
  
  // Prepare error comment for GitHub issue
  const retryInfo = task.retries ? ` (Attempt ${task.retries + 1})` : '';
  let commentBody = `## ${errorDetails.title}${retryInfo}\n\n`;
  commentBody += `**Description:** ${errorDetails.description}\n\n`;
  commentBody += `**Error Message:**\n\`\`\`\n${error.message}\n\`\`\`\n\n`;
  commentBody += `**Suggestions:**\n`;
  errorDetails.suggestions.forEach(suggestion => {
    commentBody += `- ${suggestion}\n`;
  });
  
  const maxRetries = config.maxRetries || parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
  const willRetry = task.retries < maxRetries && config.enableAutoRetry !== false;
  
  if (willRetry) {
    const nextRetry = task.retries + 1;
    const delays = config.retryDelayMinutes || [5, 15, 30];
    const delayMinutes = delays[Math.min(nextRetry - 1, delays.length - 1)] || 5;
    commentBody += `\n**Auto-retry:** This task will be retried automatically in approximately ${delayMinutes} minutes.\n`;
    commentBody += `Retry ${nextRetry} of ${maxRetries}\n`;
  } else if (task.retries >= maxRetries) {
    commentBody += `\n**⚠️ Maximum retries reached.** Human intervention is required.\n`;
  }
  
  // Add comment to issue
  if (task.issue) {
    try {
      await addComment(task.repository, task.issue.number, commentBody);
    } catch (err) {
      console.error('Failed to add error comment:', err);
    }
  }
  
  // Update labels
  const labelsToAdd = [`error-${errorType}`];
  const labelsToRemove = ['kimi-working', 'in-progress'];
  
  if (!willRetry) {
    labelsToAdd.push('kimi-failed');
    if (task.retries >= maxRetries) {
      labelsToAdd.push('needs-human-review');
    }
  } else {
    // Add retry label
    labelsToAdd.push(`retry-${task.retries + 1}`);
  }
  
  if (task.issue) {
    try {
      await addLabels(task.repository, task.issue.number, labelsToAdd);
      for (const label of labelsToRemove) {
        await removeLabel(task.repository, task.issue.number, label).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to update labels:', err);
    }
  }
  
  // Send notifications
  if (config.notifyOnFailure !== false) {
    try {
      await notifyTaskFailure(task, error, errorType, willRetry);
    } catch (err) {
      console.error('Failed to send failure notification:', err);
    }
  }
  
  return {
    errorType,
    errorDetails,
    willRetry,
    handled: true
  };
}

/**
 * Process a task using Kimi CLI
 */
export async function processTask(task, workspaceManager, contextManager) {
  const { action, repository, issue, pullRequest, workflowRun } = task;

  try {
    // Step 1: Clone/sync repository
    console.log(`📥 Syncing repository: ${repository}`);
    await workspaceManager.cloneIfNeeded(repository);
    await workspaceManager.syncRepo(repository);

    // Step 2: Install dependencies
    await workspaceManager.installDependencies(repository);

    // Step 3: Handle different task types
    switch (action) {
      case 'implement_issue':
        return await handleImplementIssue(task, workspaceManager, contextManager);
      
      case 'fix_pr_failures':
        return await handleFixPRFailures(task, workspaceManager, contextManager);
      
      case 'respond_to_review':
        return await handleReviewResponse(task, workspaceManager, contextManager);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Task processing failed:`, error);
    
    // Handle error with categorization, labeling, and notifications
    await handleTaskError(task, error);
    
    // Re-throw to allow retry logic in github-relay
    throw error;
  }
}

/**
 * Handle issue implementation
 */
async function handleImplementIssue(task, workspaceManager, contextManager) {
  const { repository, issue } = task;
  const issueNumber = issue.number;

  console.log(`🎯 Implementing issue #${issueNumber}`);

  // Create issue branch
  const branchName = workspaceManager.createIssueBranch(repository, issueNumber);
  const repoPath = workspaceManager.getRepoPath(repository);

  // Build prompt
  const prompt = buildImplementationPrompt(task, branchName);
  
  // Execute Kimi CLI
  const sessionId = `${repository.replace('/', '-')}-issue-${issueNumber}`;
  await executeKimi(repoPath, prompt, sessionId, contextManager);

  // Commit and push
  const commitMessage = `feat: implement issue #${issueNumber}\n\n${issue.title}`;
  const hasChanges = await workspaceManager.commitAndPush(repository, commitMessage, branchName);

  if (!hasChanges) {
    throw new Error('No changes were made by Kimi');
  }

  // Create pull request
  const prTitle = `[Kimi] ${issue.title}`;
  const prBody = `Closes #${issueNumber}\n\nThis PR was automatically generated by Kimi GitHub Agent.\n\n## Changes\n\nImplemented solution for issue #${issueNumber}.`;
  
  const pr = await createPullRequest(
    repository,
    branchName,
    prTitle,
    prBody,
    process.env.DEFAULT_BASE_BRANCH || 'main'
  );

  console.log(`✅ Pull request created: #${pr.number}`);

  // Update labels
  await addLabels(repository, issueNumber, ['kimi-implemented']);
  await removeLabel(repository, issueNumber, 'kimi-working').catch(() => {});

  return {
    success: true,
    branch: branchName,
    pr: pr.number,
    url: pr.html_url
  };
}

/**
 * Handle PR failure fixes
 */
async function handleFixPRFailures(task, workspaceManager, contextManager) {
  const { repository, pullRequest, workflowRun } = task;
  const prNumber = pullRequest.number;

  console.log(`🔧 Fixing PR #${prNumber} failures`);

  // Get PR branch and check it out
  const branch = pullRequest.head.ref;
  const repoPath = workspaceManager.getRepoPath(repository);
  
  await workspaceManager.syncRepo(repository, branch);

  // Build fix prompt with error logs
  const prompt = buildFixPrompt(task);
  
  // Execute Kimi CLI
  const sessionId = `${repository.replace('/', '-')}-pr-${prNumber}`;
  await executeKimi(repoPath, prompt, sessionId, contextManager);

  // Commit and push fixes
  const attempt = task.retries + 1;
  const commitMessage = `fix: address CI failures in PR #${prNumber} (attempt ${attempt})`;
  const hasChanges = await workspaceManager.commitAndPush(repository, commitMessage, branch);

  if (!hasChanges) {
    // No changes made - might need human intervention
    await notifyHumanRequired(task, 'Kimi could not produce fixes for the CI failures');
    await addComment(
      repository,
      prNumber,
      '⚠️ Automated fix attempt did not produce changes. Human review may be needed.'
    );
  }

  return {
    success: hasChanges,
    branch,
    attempt
  };
}

/**
 * Handle review comments response
 */
async function handleReviewResponse(task, workspaceManager, contextManager) {
  const { repository, pullRequest, review } = task;
  const prNumber = pullRequest.number;

  console.log(`💬 Responding to review on PR #${prNumber}`);

  // Get PR branch
  const branch = pullRequest.head.ref;
  await workspaceManager.syncRepo(repository, branch);

  // Build response prompt
  const prompt = buildReviewResponsePrompt(task);
  const repoPath = workspaceManager.getRepoPath(repository);
  
  // Execute Kimi CLI
  const sessionId = `${repository.replace('/', '-')}-pr-${prNumber}-review`;
  await executeKimi(repoPath, prompt, sessionId, contextManager);

  // Commit changes
  const commitMessage = `fix: address review comments in PR #${prNumber}`;
  await workspaceManager.commitAndPush(repository, commitMessage, branch);

  return {
    success: true,
    branch
  };
}

/**
 * Execute Kimi CLI with the given prompt
 */
async function executeKimi(workingDir, prompt, sessionId, contextManager) {
  return new Promise((resolve, reject) => {
    const kimiPath = process.env.KIMI_PATH || 'kimi';
    const timeout = parseInt(process.env.TASK_TIMEOUT_MS || '900000'); // 15 minutes default

    console.log(`🤖 Executing Kimi CLI in ${workingDir}...`);

    // Track context
    contextManager.addMessage(sessionId, 'user', prompt);

    const kimi = spawn(kimiPath, [prompt], {
      cwd: workingDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let errorOutput = '';

    kimi.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text); // Stream output to console
    });

    kimi.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      kimi.kill('SIGTERM');
      reject(new Error(`Kimi execution timed out after ${timeout}ms`));
    }, timeout);

    kimi.on('close', (code) => {
      clearTimeout(timeoutId);
      
      // Track response in context
      contextManager.addMessage(sessionId, 'assistant', output || errorOutput);

      if (code === 0) {
        console.log(`✅ Kimi execution completed successfully`);
        resolve({ output, exitCode: code });
      } else {
        reject(new Error(`Kimi exited with code ${code}: ${errorOutput}`));
      }
    });

    kimi.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to execute Kimi: ${error.message}`));
    });
  });
}
