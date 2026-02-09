import { processTask } from './task-processor.js';
import { notifyTaskStart, notifyTaskComplete, notifyTaskFailed } from './notifier.js';

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
        await notifyTaskStart(task);

        const result = await processTask(
          task,
          this.workspaceManager,
          this.contextManager
        );

        console.log('✅ Task completed successfully');
        await notifyTaskComplete(task, result);

      } catch (error) {
        console.error('❌ Task failed:', error.message);

        // Retry logic
        const maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
        if (task.retries < maxRetries && this.shouldRetry(error)) {
          task.retries++;
          console.log(`🔄 Retrying task (attempt ${task.retries}/${maxRetries})...`);
          this.queue.unshift(task); // Re-add to front of queue
        } else {
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
