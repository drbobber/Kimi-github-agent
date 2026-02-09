import express from 'express';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { GitHubRelay } from './github-relay.js';
import { WorkspaceManager } from './workspace-manager.js';
import { ContextManager } from './context-manager.js';
import { validateStartupEnvironment, validateKimiCli } from './validators.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

// Rate limiting for webhook endpoint
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const PORT = process.env.PORT || 3000;

// Validate environment before starting
async function startup() {
  try {
    console.log('🔍 Validating startup environment...');
    
    // Validate required environment variables
    const envValidation = validateStartupEnvironment();
    if (!envValidation.valid) {
      console.error('❌ Environment validation failed:');
      envValidation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
    
    // Validate Kimi CLI installation
    const kimiValidation = await validateKimiCli();
    if (!kimiValidation.valid) {
      console.error('❌ Kimi CLI validation failed:', kimiValidation.error);
      console.error('\n📖 Installation instructions:');
      console.error('   Visit: https://github.com/moonbit/kimi-cli');
      console.error('   Or run: npm install -g @moonbit/kimi-cli');
      process.exit(1);
    }
    
    console.log(`✅ Kimi CLI validated: ${kimiValidation.version}`);
    console.log('✅ Environment validation passed');
    
  } catch (error) {
    console.error('❌ Startup validation failed:', error.message);
    process.exit(1);
  }
}

const workspaceManager = new WorkspaceManager(process.env.WORKSPACES_DIR || './workspaces');
const contextManager = new ContextManager({ 
  contextDir: process.env.SESSIONS_DIR || './sessions',
  maxTokens: parseInt(process.env.MAX_CONTEXT_TOKENS || '100000')
});
const relay = new GitHubRelay(workspaceManager, contextManager);

// Enhanced health check
app.get('/health', async (req, res) => {
  const queueStatus = relay.getQueueStatus();
  const kimiValidation = await validateKimiCli().catch(() => ({ valid: false }));
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    queue: queueStatus,
    kimi: {
      available: kimiValidation.valid,
      version: kimiValidation.version || 'unknown'
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB'
    }
  });
});

// GitHub webhook endpoint with rate limiting and validation
app.post('/webhook/github', webhookLimiter, async (req, res) => {
  // Validate authorization
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (token !== process.env.KIMI_RELAY_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Validate request body
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  
  // Validate required fields
  const { action, repository } = req.body;
  if (!action || !repository) {
    return res.status(400).json({ 
      error: 'Missing required fields: action, repository' 
    });
  }
  
  // Validate repository format
  if (typeof repository !== 'string' || !repository.includes('/')) {
    return res.status(400).json({ 
      error: 'Invalid repository format. Expected: owner/repo' 
    });
  }
  
  try {
    relay.addTask(req.body);
    res.json({ 
      queued: true, 
      position: relay.getQueueLength(),
      taskId: req.body.id || Date.now()
    });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ error: 'Failed to queue task' });
  }
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
  console.log('🛑 Shutting down gracefully...');
  // Give ongoing tasks a chance to complete
  setTimeout(() => {
    process.exit(0);
  }, 5000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start server after validation
await startup();

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           🤖 Kimi GitHub Agent                             ║
╠════════════════════════════════════════════════════════════╣
║  Status:      ✅ Running                                    ║
║  Port:        ${PORT.toString().padEnd(44)}║
║  Workspaces:  ${(process.env.WORKSPACES_DIR || './workspaces').padEnd(44)}║
║  Sessions:    ${(process.env.SESSIONS_DIR || './sessions').padEnd(44)}║
║  Rate Limit:  100 requests / 15 minutes                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});
