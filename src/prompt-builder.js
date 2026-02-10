/**
 * Build implementation prompt for new issues
 */
export function buildImplementationPrompt(task, branch) {
  const { issue, repository } = task;
  
  return `You are an autonomous GitHub agent working on repository ${repository}.

## Task: Implement Issue #${issue.number}

**Title:** ${issue.title}

**Description:**
${issue.body || 'No description provided'}

**Branch:** ${branch}

## Instructions

1. Analyze the issue requirements carefully
2. Implement the solution following best practices
3. Write clean, well-documented code
4. Include appropriate tests if applicable
5. Ensure all existing tests still pass
6. Follow the existing code style and conventions

## Important Notes

- Make minimal, focused changes that directly address the issue
- Preserve existing functionality
- Add comments where necessary
- DO NOT commit or push - the agent will handle this automatically
- DO NOT create a pull request - the agent will handle this automatically
- Simply create/modify the files needed to implement the solution

Please implement this issue now.`;
}

/**
 * Build fix prompt for CI failures
 */
export function buildFixPrompt(task) {
  const { pullRequest, workflowRun, repository } = task;
  const logs = workflowRun?.logs || 'No logs available';
  const attempt = task.retries + 1;

  return `You are an autonomous GitHub agent working on repository ${repository}.

## Task: Fix CI Failures in PR #${pullRequest.number}

**PR Title:** ${pullRequest.title}

**Attempt:** ${attempt} of ${process.env.MAX_RETRY_ATTEMPTS || 3}

**Workflow Run:** ${workflowRun?.name || 'Unknown'}
**Status:** ${workflowRun?.conclusion || 'failed'}

## Failure Logs

\`\`\`
${logs}
\`\`\`

## Instructions

1. Analyze the failure logs carefully
2. Identify the root cause of the failures
3. Implement fixes for the identified issues
4. Ensure all tests pass after your changes
5. Do not introduce new issues

## Important Notes

- Focus on fixing the specific failures shown in the logs
- Make minimal changes necessary to fix the issues
- Test your changes thoroughly
- DO NOT commit or push - the agent will handle this automatically
- If the issue is not fixable automatically, explain why

Please fix these CI failures now.`;
}

/**
 * Build response prompt for review comments
 */
export function buildReviewResponsePrompt(task) {
  const { pullRequest, review, repository } = task;
  const comments = review?.comments || [];

  const commentText = comments
    .map((c, i) => `### Comment ${i + 1} (${c.path}:${c.line})
${c.body}
`)
    .join('\n\n');

  return `You are an autonomous GitHub agent working on repository ${repository}.

## Task: Address Review Comments on PR #${pullRequest.number}

**PR Title:** ${pullRequest.title}

**Reviewer:** ${review?.user?.login || 'Unknown'}

## Review Comments

${commentText || 'No specific comments provided'}

## Instructions

1. Read and understand each review comment
2. Implement the requested changes
3. Ensure the changes address the reviewer's concerns
4. Maintain code quality and consistency
5. Test your changes

## Important Notes

- Address all review comments thoroughly
- Make only the changes requested by the reviewer
- Preserve existing functionality
- Follow project conventions

Please address these review comments now.`;
}

/**
 * Build general task prompt
 */
export function buildGeneralPrompt(task) {
  const { action, description, repository } = task;

  return `You are an autonomous GitHub agent working on repository ${repository}.

## Task: ${action}

${description || 'No additional details provided'}

## Instructions

Please analyze the task and implement the necessary changes following best practices.`;
}
