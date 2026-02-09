import express from 'express';
import dotenv from 'dotenv';
import { GitHubRelay } from './github-relay.js';
import { WorkspaceManager } from './workspace-manager.js';
import { ContextManager } from './context-manager.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3000;
const workspaceManager = new WorkspaceManager(process.env.WORKSPACES_DIR || './workspaces');
const contextManager = new ContextManager({ 
  contextDir: process.env.SESSIONS_DIR || './sessions',
  maxTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '100000')
});
const relay = new GitHubRelay(workspaceManager, contextManager);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    queue: relay.getQueueStatus()
  });
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== process.env.KIMI_RELAY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  relay.addTask(req.body);
  res.json({ queued: true, position: relay.getQueueLength() });
});

// Manual sync endpoint
app.post('/sync/:owner/:repo', async (req, res) => {
  const repository = `${req.params.owner}/${req.params.repo}`;
  try {
    await workspaceManager.syncRepo(repository);
    res.json({ success: true, status: workspaceManager.getStatus(repository) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutting down...');
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🤖 Kimi GitHub Agent                             ║
╠════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                          ║
║  Workspaces:  ${process.env.WORKSPACES_DIR || './workspaces'}
║  Sessions:    ${process.env.SESSIONS_DIR || './sessions'}
╚════════════════════════════════════════════════════════════╝
  `);
});
