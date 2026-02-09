import fs from 'fs';
import path from 'path';

/**
 * ContextManager handles context window management and overflow prevention
 */
export class ContextManager {
  constructor(options = {}) {
    this.contextDir = path.resolve(options.contextDir || './sessions');
    this.maxTokens = options.maxTokens || 100000;
    this.summarizationThreshold = 0.8; // Trigger summary at 80% capacity

    // Ensure context directory exists
    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
      console.log(`📁 Created sessions directory: ${this.contextDir}`);
    }
  }

  /**
   * Estimate token count (rough approximation: 1 token ≈ 4 characters)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get session file path
   */
  getSessionPath(sessionId) {
    return path.join(this.contextDir, `${sessionId}.json`);
  }

  /**
   * Load session from disk
   */
  loadSession(sessionId) {
    const sessionPath = this.getSessionPath(sessionId);
    
    if (!fs.existsSync(sessionPath)) {
      return {
        id: sessionId,
        history: [],
        tokenCount: 0,
        summaries: [],
        createdAt: new Date().toISOString()
      };
    }

    try {
      const data = fs.readFileSync(sessionPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`⚠️  Failed to load session ${sessionId}:`, error.message);
      return this.createNewSession(sessionId);
    }
  }

  /**
   * Save session to disk
   */
  saveSession(session) {
    const sessionPath = this.getSessionPath(session.id);
    
    try {
      fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
      console.log(`💾 Session saved: ${session.id}`);
    } catch (error) {
      console.error(`⚠️  Failed to save session ${session.id}:`, error.message);
    }
  }

  /**
   * Add message to session and check for overflow
   */
  addMessage(sessionId, role, content) {
    const session = this.loadSession(sessionId);
    
    const message = {
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens: this.estimateTokens(content)
    };

    session.history.push(message);
    session.tokenCount += message.tokens;
    session.updatedAt = new Date().toISOString();

    // Check if we need to summarize
    if (this.shouldSummarize(session)) {
      console.log(`⚠️  Context approaching limit (${session.tokenCount}/${this.maxTokens} tokens)`);
      session.needsSummary = true;
    }

    this.saveSession(session);
    return session;
  }

  /**
   * Check if session needs summarization
   */
  shouldSummarize(session) {
    return session.tokenCount >= (this.maxTokens * this.summarizationThreshold);
  }

  /**
   * Generate summarization prompt
   */
  generateSummaryPrompt(session) {
    const messagesToSummarize = session.history.slice(0, -5); // Keep last 5 messages
    const messageText = messagesToSummarize
      .map(m => `${m.role}: ${m.content}`)
      .join('\n\n');

    return `Please provide a concise summary of the following conversation history, focusing on key decisions, outcomes, and context needed for continuing the task:

${messageText}

Summary:`;
  }

  /**
   * Reset session with summary
   */
  resetWithSummary(sessionId, summary) {
    const session = this.loadSession(sessionId);
    
    // Create summary record
    const summaryRecord = {
      content: summary,
      summarizedAt: new Date().toISOString(),
      messageCount: session.history.length,
      tokenCount: session.tokenCount
    };

    session.summaries.push(summaryRecord);

    // Keep only recent messages and summary
    const recentMessages = session.history.slice(-5);
    session.history = [
      {
        role: 'system',
        content: `Previous conversation summary:\n${summary}`,
        timestamp: new Date().toISOString(),
        tokens: this.estimateTokens(summary)
      },
      ...recentMessages
    ];

    // Recalculate token count
    session.tokenCount = session.history.reduce((sum, msg) => sum + msg.tokens, 0);
    session.needsSummary = false;
    session.lastReset = new Date().toISOString();

    this.saveSession(session);
    console.log(`🔄 Session reset with summary (${session.tokenCount} tokens)`);
    
    return session;
  }

  /**
   * Create new session
   */
  createNewSession(sessionId) {
    return {
      id: sessionId,
      history: [],
      tokenCount: 0,
      summaries: [],
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.loadSession(sessionId);
    
    return {
      id: session.id,
      tokenCount: session.tokenCount,
      maxTokens: this.maxTokens,
      utilization: (session.tokenCount / this.maxTokens * 100).toFixed(1) + '%',
      messageCount: session.history.length,
      summaryCount: session.summaries.length,
      needsSummary: session.needsSummary || false
    };
  }

  /**
   * Delete old sessions
   */
  cleanupOldSessions(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    try {
      const files = fs.readdirSync(this.contextDir);
      let deleted = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(this.contextDir, file);
        const stats = fs.statSync(filePath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deleted++;
        }
      }

      if (deleted > 0) {
        console.log(`🧹 Cleaned up ${deleted} old session(s)`);
      }
    } catch (error) {
      console.error(`⚠️  Session cleanup failed:`, error.message);
    }
  }
}
