import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * WorkspaceManager handles git operations and repository management
 */
export class WorkspaceManager {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir);
    
    // Ensure base directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      console.log(`📁 Created workspaces directory: ${this.baseDir}`);
    }
  }

  /**
   * Get the local path for a repository
   */
  getRepoPath(repoFullName) {
    return path.join(this.baseDir, repoFullName);
  }

  /**
   * Check if a repository is cloned
   */
  isRepoCloned(repoFullName) {
    const repoPath = this.getRepoPath(repoFullName);
    const gitDir = path.join(repoPath, '.git');
    return fs.existsSync(gitDir);
  }

  /**
   * Clone repository if not already present
   */
  async cloneIfNeeded(repoFullName, token = process.env.GITHUB_TOKEN) {
    if (this.isRepoCloned(repoFullName)) {
      console.log(`✅ Repository already cloned: ${repoFullName}`);
      return this.getRepoPath(repoFullName);
    }

    console.log(`📥 Cloning repository: ${repoFullName}`);
    const repoPath = this.getRepoPath(repoFullName);
    const repoDir = path.dirname(repoPath);

    // Create parent directory if needed
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
    }

    const cloneUrl = token
      ? `https://${token}@github.com/${repoFullName}.git`
      : `https://github.com/${repoFullName}.git`;

    try {
      execSync(`git clone ${cloneUrl} ${repoPath}`, {
        stdio: 'inherit',
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
      });
      console.log(`✅ Cloned successfully: ${repoFullName}`);
      return repoPath;
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Sync repository (fetch and pull)
   */
  async syncRepo(repoFullName, branch = null) {
    const repoPath = await this.cloneIfNeeded(repoFullName);
    console.log(`🔄 Syncing repository: ${repoFullName}`);

    try {
      // Fetch all branches
      execSync('git fetch --all', { cwd: repoPath, stdio: 'inherit' });

      // Get current branch if not specified
      if (!branch) {
        branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath })
          .toString()
          .trim();
      }

      // Pull latest changes
      execSync(`git pull origin ${branch}`, { cwd: repoPath, stdio: 'inherit' });
      console.log(`✅ Synced to latest: ${branch}`);

      return repoPath;
    } catch (error) {
      console.error(`⚠️  Sync warning: ${error.message}`);
      return repoPath; // Continue even if sync fails
    }
  }

  /**
   * Create a new branch for an issue
   */
  createIssueBranch(repoFullName, issueNumber, baseBranch = 'main') {
    const repoPath = this.getRepoPath(repoFullName);
    const branchPrefix = process.env.BRANCH_PREFIX || 'kimi';
    const branchName = `${branchPrefix}/issue-${issueNumber}`;

    console.log(`🌿 Creating branch: ${branchName}`);

    try {
      // Ensure we're on base branch and up to date
      execSync(`git checkout ${baseBranch}`, { cwd: repoPath, stdio: 'pipe' });
      execSync(`git pull origin ${baseBranch}`, { cwd: repoPath, stdio: 'pipe' });

      // Create and checkout new branch
      execSync(`git checkout -b ${branchName}`, { cwd: repoPath, stdio: 'pipe' });
      console.log(`✅ Created branch: ${branchName}`);

      return branchName;
    } catch (error) {
      // Branch might already exist, try to check it out
      try {
        execSync(`git checkout ${branchName}`, { cwd: repoPath, stdio: 'pipe' });
        console.log(`✅ Switched to existing branch: ${branchName}`);
        return branchName;
      } catch (checkoutError) {
        throw new Error(`Failed to create/checkout branch: ${error.message}`);
      }
    }
  }

  /**
   * Commit and push changes
   */
  async commitAndPush(repoFullName, message, branch) {
    const repoPath = this.getRepoPath(repoFullName);
    console.log(`📤 Committing and pushing changes...`);

    try {
      // Stage all changes
      execSync('git add .', { cwd: repoPath, stdio: 'pipe' });

      // Check if there are changes to commit
      try {
        execSync('git diff --cached --quiet', { cwd: repoPath, stdio: 'pipe' });
        console.log('ℹ️  No changes to commit');
        return false;
      } catch {
        // There are changes, continue with commit
      }

      // Commit
      execSync(`git commit -m "${message}"`, { cwd: repoPath, stdio: 'inherit' });

      // Push
      execSync(`git push -u origin ${branch}`, { cwd: repoPath, stdio: 'inherit' });
      console.log(`✅ Pushed to ${branch}`);

      return true;
    } catch (error) {
      throw new Error(`Failed to commit and push: ${error.message}`);
    }
  }

  /**
   * Install dependencies based on detected package manager
   */
  async installDependencies(repoFullName) {
    const repoPath = this.getRepoPath(repoFullName);
    console.log(`📦 Installing dependencies...`);

    // Detect package manager
    let packageManager = 'npm';
    if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
      packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
      packageManager = 'yarn';
    } else if (fs.existsSync(path.join(repoPath, 'package-lock.json'))) {
      packageManager = 'npm';
    }

    // Check if package.json exists
    if (!fs.existsSync(path.join(repoPath, 'package.json'))) {
      console.log('ℹ️  No package.json found, skipping dependency installation');
      return;
    }

    try {
      console.log(`📦 Using ${packageManager}...`);
      const installCmd = packageManager === 'yarn' ? 'yarn install' : `${packageManager} install`;
      execSync(installCmd, { cwd: repoPath, stdio: 'inherit' });
      console.log(`✅ Dependencies installed`);
    } catch (error) {
      console.error(`⚠️  Dependency installation failed: ${error.message}`);
      // Don't throw - some repos might not need deps
    }
  }

  /**
   * Get repository status
   */
  getStatus(repoFullName) {
    try {
      const repoPath = this.getRepoPath(repoFullName);
      
      if (!this.isRepoCloned(repoFullName)) {
        return { cloned: false };
      }

      const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: repoPath })
        .toString()
        .trim();
      
      const status = execSync('git status --porcelain', { cwd: repoPath })
        .toString()
        .trim();

      return {
        cloned: true,
        branch,
        hasChanges: status.length > 0,
        changes: status
      };
    } catch (error) {
      return { error: error.message };
    }
  }
}
