/**
 * GitHub API wrapper functions
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Make a GitHub API request
 */
async function githubRequest(method, path, body = null) {
  const url = `${GITHUB_API_BASE}${path}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`GitHub API error (${response.status}): ${error.message}`);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ GitHub API request failed: ${method} ${path}`, error);
    throw error;
  }
}

/**
 * Create a pull request
 */
export async function createPullRequest(repository, headBranch, title, body, baseBranch = 'main') {
  console.log(`📝 Creating pull request: ${title}`);
  
  const [owner, repo] = repository.split('/');
  
  const data = {
    title,
    body,
    head: headBranch,
    base: baseBranch
  };

  const pr = await githubRequest('POST', `/repos/${owner}/${repo}/pulls`, data);
  console.log(`✅ Pull request created: #${pr.number}`);
  
  return pr;
}

/**
 * Add a comment to an issue or pull request
 */
export async function addComment(repository, issueNumber, body) {
  console.log(`💬 Adding comment to #${issueNumber}`);
  
  const [owner, repo] = repository.split('/');
  
  const data = { body };
  
  const comment = await githubRequest('POST', `/repos/${owner}/${repo}/issues/${issueNumber}/comments`, data);
  console.log(`✅ Comment added`);
  
  return comment;
}

/**
 * Add labels to an issue or pull request
 */
export async function addLabels(repository, issueNumber, labels) {
  if (!labels || labels.length === 0) return;
  
  console.log(`🏷️  Adding labels to #${issueNumber}: ${labels.join(', ')}`);
  
  const [owner, repo] = repository.split('/');
  
  const data = { labels };
  
  await githubRequest('POST', `/repos/${owner}/${repo}/issues/${issueNumber}/labels`, data);
  console.log(`✅ Labels added`);
}

/**
 * Remove a label from an issue or pull request
 */
export async function removeLabel(repository, issueNumber, label) {
  console.log(`🏷️  Removing label from #${issueNumber}: ${label}`);
  
  const [owner, repo] = repository.split('/');
  
  try {
    await githubRequest('DELETE', `/repos/${owner}/${repo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`);
    console.log(`✅ Label removed`);
  } catch (error) {
    // Ignore 404 errors (label doesn't exist)
    if (!error.message.includes('404')) {
      throw error;
    }
  }
}

/**
 * Get pull request details
 */
export async function getPullRequest(repository, prNumber) {
  const [owner, repo] = repository.split('/');
  return await githubRequest('GET', `/repos/${owner}/${repo}/pulls/${prNumber}`);
}

/**
 * Get issue details
 */
export async function getIssue(repository, issueNumber) {
  const [owner, repo] = repository.split('/');
  return await githubRequest('GET', `/repos/${owner}/${repo}/issues/${issueNumber}`);
}

/**
 * Update pull request
 */
export async function updatePullRequest(repository, prNumber, data) {
  const [owner, repo] = repository.split('/');
  return await githubRequest('PATCH', `/repos/${owner}/${repo}/pulls/${prNumber}`, data);
}

/**
 * Merge pull request
 */
export async function mergePullRequest(repository, prNumber, commitMessage = null) {
  console.log(`🔀 Merging pull request #${prNumber}`);
  
  const [owner, repo] = repository.split('/');
  
  const data = {};
  if (commitMessage) {
    data.commit_message = commitMessage;
  }
  
  const result = await githubRequest('PUT', `/repos/${owner}/${repo}/pulls/${prNumber}/merge`, data);
  console.log(`✅ Pull request merged`);
  
  return result;
}

/**
 * List workflow runs for a repository
 */
export async function listWorkflowRuns(repository, options = {}) {
  const [owner, repo] = repository.split('/');
  
  const params = new URLSearchParams();
  if (options.branch) params.append('branch', options.branch);
  if (options.status) params.append('status', options.status);
  if (options.perPage) params.append('per_page', options.perPage);
  
  const queryString = params.toString();
  const path = `/repos/${owner}/${repo}/actions/runs${queryString ? '?' + queryString : ''}`;
  
  return await githubRequest('GET', path);
}

/**
 * Get workflow run details
 */
export async function getWorkflowRun(repository, runId) {
  const [owner, repo] = repository.split('/');
  return await githubRequest('GET', `/repos/${owner}/${repo}/actions/runs/${runId}`);
}
