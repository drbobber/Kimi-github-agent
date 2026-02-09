import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Validate required environment variables
 */
export function validateStartupEnvironment() {
  const errors = [];
  
  // Required variables
  if (!process.env.GITHUB_TOKEN) {
    errors.push('GITHUB_TOKEN is required');
  } else if (!process.env.GITHUB_TOKEN.startsWith('ghp_') && 
             !process.env.GITHUB_TOKEN.startsWith('github_pat_')) {
    errors.push('GITHUB_TOKEN format appears invalid');
  }
  
  if (!process.env.KIMI_RELAY_TOKEN) {
    errors.push('KIMI_RELAY_TOKEN is required');
  } else if (process.env.KIMI_RELAY_TOKEN.length < 32) {
    errors.push('KIMI_RELAY_TOKEN should be at least 32 characters for security');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Kimi CLI installation and get version
 */
export async function validateKimiCli() {
  const kimiPath = process.env.KIMI_PATH || 'kimi';
  
  try {
    const { stdout, stderr } = await execAsync(`${kimiPath} --version`, {
      timeout: 5000
    });
    
    const output = stdout || stderr;
    const versionMatch = output.match(/\d+\.\d+\.\d+/);
    
    return {
      valid: true,
      version: versionMatch ? versionMatch[0] : output.trim(),
      path: kimiPath
    };
  } catch (error) {
    return {
      valid: false,
      error: error.code === 'ENOENT' 
        ? `Kimi CLI not found at path: ${kimiPath}`
        : `Kimi CLI error: ${error.message}`
    };
  }
}

/**
 * Validate webhook payload
 */
export function validateWebhookPayload(payload) {
  const errors = [];
  
  if (!payload.action) {
    errors.push('Missing required field: action');
  }
  
  if (!payload.repository) {
    errors.push('Missing required field: repository');
  } else if (typeof payload.repository !== 'string' || !payload.repository.includes('/')) {
    errors.push('Invalid repository format. Expected: owner/repo');
  }
  
  // Validate action-specific requirements
  if (payload.action === 'implement_issue' && !payload.issue) {
    errors.push('Missing required field for implement_issue: issue');
  }
  
  if (payload.action === 'fix_pr_failures' && !payload.pullRequest) {
    errors.push('Missing required field for fix_pr_failures: pullRequest');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string to prevent injection attacks
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[;$`\\|&<>]/g, '')
    .trim()
    .substring(0, 10000); // Limit length
}
