import dotenv from 'dotenv';
dotenv.config();

const GITHUB_API = 'https://api.github.com';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN environment variable is required');
}

/**
 * Make authenticated request to GitHub API with error handling
 */
async function githubRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers
    }
  });

  // Handle rate limiting
  if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
    const resetTime = new Date(parseInt(response.headers.get('x-ratelimit-reset')) * 1000);
    throw new Error(`GitHub API rate limit exceeded. Resets at ${resetTime.toISOString()}`);
  }

  // Handle other errors
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`GitHub API error (${response.status}): ${error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Check if a label exists in a repository
 */
export async function labelExists(repository, labelName) {
  try {
    await githubRequest(`/repos/${repository}/labels/${encodeURIComponent(labelName)}`);
    return true;
  } catch (error) {
    if (error.message.includes('404')) {
      return false;
    }
    throw error;
  }
}

/**
 * Create a label if it doesn't exist
 */
export async function ensureLabel(repository, labelName, color = 'ededed', description = '') {
  const exists = await labelExists(repository, labelName);
  if (exists) return true;
  
  try {
    await githubRequest(`/repos/${repository}/labels`, {
      method: 'POST',
      body: JSON.stringify({
        name: labelName,
        color: color.replace('#', ''),
        description
      })
    });
    console.log(`✅ Created label: ${labelName}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  Could not create label ${labelName}:`, error.message);
    return false;
  }
}

/**
 * Add labels to an issue (with existence check)
 */
export async function addLabels(repository, issueNumber, labels) {
  if (!Array.isArray(labels) || labels.length === 0) return;
  
  // Ensure all labels exist
  const labelColors = {
    'kimi-ready': '0E8A16',
    'kimi-working': '1D76DB',
    'in-progress': 'FBCA04',
    'pr-created': '6F42C1',
    'kimi-failed': 'D93F0B',
    'kimi-recovered': 'FFA500',
    'needs-human-review': 'B60205',
    'kimi-implemented': '0E8A16'
  };
  
  for (const label of labels) {
    const color = labelColors[label] || 'ededed';
    await ensureLabel(repository, label, color);
  }
  
  try {
    await githubRequest(`/repos/${repository}/issues/${issueNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels })
    });
  } catch (error) {
    console.error(`Failed to add labels to #${issueNumber}:`, error.message);
    throw error;
  }
}

/**
 * Remove a label from an issue
 */
export async function removeLabel(repository, issueNumber, label) {
  try {
    await githubRequest(
      `/repos/${repository}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    // Ignore 404 errors (label doesn't exist)
    if (!error.message.includes('404')) {
      console.error(`Failed to remove label ${label} from #${issueNumber}:`, error.message);
      throw error;
    }
  }
}

/**
 * Add a comment to an issue
 */
export async function addComment(repository, issueNumber, body) {
  return githubRequest(`/repos/${repository}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

/**
 * Create a pull request
 */
export async function createPullRequest(repository, head, title, body, base = 'main') {
  return githubRequest(`/repos/${repository}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      head,
      base
    })
  });
}

/**
 * Get issue details
 */
export async function getIssue(repository, issueNumber) {
  return githubRequest(`/repos/${repository}/issues/${issueNumber}`);
}

/**
 * Get pull request details
 */
export async function getPullRequest(repository, prNumber) {
  return githubRequest(`/repos/${repository}/pulls/${prNumber}`);
}
