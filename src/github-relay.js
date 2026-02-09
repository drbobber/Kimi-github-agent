import { processTask } from './task-processor.js';
import { notifyTaskStart, notifyTaskComplete, notifyTaskFailed, notifyRetry } from './notifier.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Load configuration from config.json
 */
async function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn('⚠️  Could not load config.json, using defaults');
    return {};
  }
}

/**
 * GitHubRelay manages the task queue and processes GitHub webhook events
 */
export class GitHubRelay {
  constructor(workspaceManager, contextManager) {
    this.workspaceManager = workspaceManager;
    this.contextManager = contextManager;
    this.queue = [];
    this.isProcessing = false;
    this.currentTask = null;
  }

  /**
   * Add a task to the queue
   */
  addTask(task) {
    console.log('📥 Task queued:', task.action || task.type);
    this.queue.push({
      ...task,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      retries: 0
    });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process tasks from the queue sequentially
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      this.currentTask = task;

      try {
        console.log(`\n🚀 Processing task ${task.id}...`);
        
        // Notify retry if this is not the first attempt
        if (task.retries > 0) {
          const config = await loadConfig();
          const maxRetries = config.errorHandling?.maxRetries || parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
          await notifyRetry(task, task.retries + 1, maxRetries);
        } else {
          await notifyTaskStart(task);
        }

        const result = await processTask(
          task,
          this.workspaceManager,
          this.contextManager
        );

        console.log('✅ Task completed successfully');
        await notifyTaskComplete(task, result);

      } catch (error) {
        console.error('❌ Task failed:', error.message);

        // Retry logic with exponential backoff
        const config = await loadConfig();
        const maxRetries = config.errorHandling?.maxRetries || parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
        const enableAutoRetry = config.errorHandling?.enableAutoRetry !== false;
        
        if (task.retries < maxRetries && enableAutoRetry && this.shouldRetry(error)) {
          task.retries++;
          
          // Calculate delay with exponential backoff
          const delayMinutes = config.errorHandling?.retryDelayMinutes || [5, 15, 30];
          const delayIndex = Math.min(task.retries - 1, delayMinutes.length - 1);
          const delayMs = delayMinutes[delayIndex] * 60 * 1000;
          
          console.log(`🔄 Scheduling retry ${task.retries}/${maxRetries} in ${delayMinutes[delayIndex]} minutes...`);
          
          // Schedule retry with delay
          setTimeout(() => {
            console.log(`⏰ Retry delay complete, re-queuing task ${task.id}...`);
            this.queue.unshift(task); // Re-add to front of queue
            if (!this.isProcessing) {
              this.processQueue();
            }
          }, delayMs);
        } else {
          // Max retries reached or non-retryable error
          await notifyTaskFailed(task, error);
        }
      } finally {
        this.currentTask = null;
      }
    }

    this.isProcessing = false;
  }

  /**
   * Determine if an error is retryable
   */
  shouldRetry(error) {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'rate limit',
      'network error'
    ];

    return retryableErrors.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Get current queue status
   */
  getQueueStatus() {
    return {
      length: this.queue.length,
      isProcessing: this.isProcessing,
      currentTask: this.currentTask ? {
        id: this.currentTask.id,
        action: this.currentTask.action,
        retries: this.currentTask.retries
      } : null
    };
  }

  /**
   * Get queue length
   */
  getQueueLength() {
    return this.queue.length;
  }
}
