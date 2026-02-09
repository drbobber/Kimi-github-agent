import { Bot } from 'grammy';

let bot = null;

/**
 * Initialize Telegram bot if credentials are available
 */
function initBot() {
  if (bot) return bot;
  
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log('ℹ️  Telegram notifications disabled (no TELEGRAM_BOT_TOKEN)');
    return null;
  }

  try {
    bot = new Bot(token);
    console.log('✅ Telegram bot initialized');
    return bot;
  } catch (error) {
    console.error('⚠️  Failed to initialize Telegram bot:', error.message);
    return null;
  }
}

/**
 * Send a message via Telegram
 */
export async function sendTelegramMessage(message) {
  const telegramBot = initBot();
  if (!telegramBot) return;

  const userId = process.env.TELEGRAM_USER_ID;
  if (!userId) {
    console.log('ℹ️  No TELEGRAM_USER_ID configured');
    return;
  }

  try {
    await telegramBot.api.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    console.log('📤 Telegram notification sent');
  } catch (error) {
    console.error('⚠️  Failed to send Telegram message:', error.message);
  }
}

/**
 * Notify task start
 */
export async function notifyTaskStart(task) {
  const { action, repository, issue, pullRequest } = task;
  
  let message = `🚀 *Task Started*\n\n`;
  message += `*Repository:* ${repository}\n`;
  message += `*Action:* ${action}\n`;
  
  if (issue) {
    message += `*Issue:* #${issue.number} - ${issue.title}\n`;
    message += `*Link:* ${issue.html_url}\n`;
  }
  
  if (pullRequest) {
    message += `*PR:* #${pullRequest.number} - ${pullRequest.title}\n`;
    message += `*Link:* ${pullRequest.html_url}\n`;
  }
  
  await sendTelegramMessage(message);
}

/**
 * Notify task completion
 */
export async function notifyTaskComplete(task, result) {
  const { action, repository, issue, pullRequest } = task;
  
  let message = `✅ *Task Completed Successfully*\n\n`;
  message += `*Repository:* ${repository}\n`;
  message += `*Action:* ${action}\n`;
  
  if (issue) {
    message += `*Issue:* #${issue.number}\n`;
  }
  
  if (result.pr) {
    message += `*Pull Request:* #${result.pr}\n`;
  }
  
  if (result.url) {
    message += `*Link:* ${result.url}\n`;
  }
  
  await sendTelegramMessage(message);
}

/**
 * Notify task failure
 */
export async function notifyTaskFailed(task, error) {
  const { action, repository, issue, pullRequest } = task;
  const retries = task.retries || 0;
  const maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS || '3');
  
  let message = `❌ *Task Failed*\n\n`;
  message += `*Repository:* ${repository}\n`;
  message += `*Action:* ${action}\n`;
  
  if (issue) {
    message += `*Issue:* #${issue.number} - ${issue.title}\n`;
  }
  
  if (pullRequest) {
    message += `*PR:* #${pullRequest.number} - ${pullRequest.title}\n`;
  }
  
  message += `*Attempts:* ${retries}/${maxRetries}\n`;
  message += `*Error:* ${error.message}\n`;
  
  if (retries >= maxRetries) {
    message += `\n⚠️ *Max retries reached. Human intervention required.*`;
  }
  
  await sendTelegramMessage(message);
}

/**
 * Notify that human intervention is required
 */
export async function notifyHumanRequired(task, reason) {
  const { action, repository, issue, pullRequest } = task;
  
  let message = `⚠️ *Human Intervention Required*\n\n`;
  message += `*Repository:* ${repository}\n`;
  message += `*Action:* ${action}\n`;
  
  if (issue) {
    message += `*Issue:* #${issue.number} - ${issue.title}\n`;
    message += `*Link:* ${issue.html_url}\n`;
  }
  
  if (pullRequest) {
    message += `*PR:* #${pullRequest.number} - ${pullRequest.title}\n`;
    message += `*Link:* ${pullRequest.html_url}\n`;
  }
  
  message += `\n*Reason:* ${reason}`;
  
  await sendTelegramMessage(message);
}

/**
 * Send status update
 */
export async function sendStatusUpdate(status) {
  const message = `📊 *Status Update*\n\n${status}`;
  await sendTelegramMessage(message);
}
