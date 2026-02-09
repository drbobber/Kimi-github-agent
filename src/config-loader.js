import fs from 'fs/promises';
import path from 'path';

/**
 * Shared configuration loader
 */
let cachedConfig = null;

/**
 * Load configuration from config.json with caching
 */
export async function loadConfig() {
  // Return cached config if available
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const content = await fs.readFile(configPath, 'utf-8');
    cachedConfig = JSON.parse(content);
    return cachedConfig;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn('⚠️  config.json not found, using defaults');
    } else if (error instanceof SyntaxError) {
      console.error('❌ config.json has invalid JSON syntax:', error.message);
      console.warn('⚠️  Using default configuration due to parse error');
    } else {
      console.error('⚠️  Error loading config.json:', error.message);
    }
    cachedConfig = {};
    return cachedConfig;
  }
}

/**
 * Get error handling configuration
 */
export async function getErrorConfig() {
  const config = await loadConfig();
  return config.errorHandling || {};
}

/**
 * Get max retries with fallback to environment variable
 */
export function getMaxRetries(config) {
  return config?.maxRetries || parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
}

/**
 * Get retry delay in minutes with defaults
 */
export function getRetryDelayMinutes(config) {
  return config?.retryDelayMinutes || [5, 15, 30];
}

/**
 * Check if auto-retry is enabled
 */
export function isAutoRetryEnabled(config) {
  return config?.enableAutoRetry !== false;
}

/**
 * Clear cached configuration (useful for testing or config reload)
 */
export function clearConfigCache() {
  cachedConfig = null;
}
