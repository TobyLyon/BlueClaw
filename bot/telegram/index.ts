// BlueClaw - Telegram Bot Entry Point
// Alpha signal caller for Telegram (Clawcord reskin)

import type { TelegramChatConfig, TelegramCommandContext, CallbackQueryData } from "../../lib/clawcord/telegram-types";
import { BLUECLAW_COMMANDS } from "../../lib/clawcord/telegram-types";
import { getTelegramStorage, getOrCreateChatConfig } from "../../lib/clawcord/telegram-storage";
import { createPolicy, getPolicyPresets } from "../../lib/clawcord/policies";
import { GraduationWatcher, DEFAULT_GRADUATION_FILTER } from "../../lib/clawcord/dexscreener-provider";
import { scoreToken } from "../../lib/clawcord/scoring";
import { generateCallCard } from "../../lib/clawcord/call-card";
import {
  formatGraduationCall,
  formatCallCardForTelegram,
  formatHelpMessage,
  formatStatusMessage,
  formatScanResults,
  generateCallCardKeyboard,
  generateConfigKeyboard,
  generatePolicyKeyboard,
} from "../../lib/clawcord/telegram-formatter";
import { TelegramAutopostService } from "./autopost";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

// Telegram API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Types for Telegram API
interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  entities?: Array<{ type: string; offset: number; length: number }>;
  reply_to_message?: TelegramMessage;
}

interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  chat_instance: string;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
  my_chat_member?: {
    chat: TelegramChat;
    from: TelegramUser;
    new_chat_member: { status: string };
  };
}

interface TelegramChatMember {
  status: "creator" | "administrator" | "member" | "restricted" | "left" | "kicked";
  user: TelegramUser;
}

// API call helper
async function telegramAPI(method: string, params: Record<string, unknown> = {}): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const result = await response.json() as { ok: boolean; description?: string; result?: any };
    if (!result.ok) {
      console.error(`Telegram API error (${method}):`, result.description);
      return null;
    }
    return result.result;
  } catch (error) {
    console.error(`Telegram API call failed (${method}):`, error);
    return null;
  }
}

// Send message to chat (uses HTML parse_mode per OpenClaw spec)
async function sendMessage(
  chatId: string | number,
  text: string,
  options: {
    parseMode?: "Markdown" | "HTML";
    replyToMessageId?: number;
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
    disableWebPagePreview?: boolean;
    messageThreadId?: number; // For forum topic support
  } = {}
): Promise<TelegramMessage | null> {
  const params: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || "HTML", // HTML per OpenClaw spec
    disable_web_page_preview: options.disableWebPagePreview ?? true,
  };

  if (options.messageThreadId) {
    params.message_thread_id = options.messageThreadId;
  }

  if (options.replyToMessageId) {
    params.reply_to_message_id = options.replyToMessageId;
  }

  if (options.inlineKeyboard) {
    params.reply_markup = {
      inline_keyboard: options.inlineKeyboard,
    };
  }

  return telegramAPI("sendMessage", params);
}

// Edit existing message
async function editMessage(
  chatId: string | number,
  messageId: number,
  text: string,
  options: {
    parseMode?: "Markdown" | "HTML";
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  } = {}
): Promise<boolean> {
  const params: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parseMode || "Markdown",
    disable_web_page_preview: true,
  };

  if (options.inlineKeyboard) {
    params.reply_markup = { inline_keyboard: options.inlineKeyboard };
  }

  const result = await telegramAPI("editMessageText", params);
  return result !== null;
}

// Answer callback query
async function answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<boolean> {
  const result = await telegramAPI("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
  return result !== null;
}

// Check if user is admin in chat
async function isUserAdmin(chatId: string | number, userId: number): Promise<boolean> {
  const member = await telegramAPI("getChatMember", { chat_id: chatId, user_id: userId }) as TelegramChatMember | null;
  if (!member) return false;
  return member.status === "creator" || member.status === "administrator";
}

// Parse command from message
function parseCommand(message: TelegramMessage): { command: string; args: string[] } | null {
  if (!message.text) return null;

  const botCommandEntity = message.entities?.find(e => e.type === "bot_command" && e.offset === 0);
  if (!botCommandEntity) return null;

  const commandText = message.text.substring(0, botCommandEntity.length);
  const command = commandText.split("@")[0].substring(1).toLowerCase(); // Remove / and @botname
  const argsText = message.text.substring(botCommandEntity.length).trim();
  const args = argsText ? argsText.split(/\s+/) : [];

  return { command, args };
}

// Watcher instance for scanning
const watcher = new GraduationWatcher();

// Command Handlers
async function handleStart(ctx: TelegramCommandContext): Promise<void> {
  const config = await getOrCreateChatConfig({
    chatId: ctx.chatId,
    chatTitle: "Telegram Chat",
    chatType: "group",
    userId: ctx.userId,
  });

  const welcomeMsg = [
    `🦞 *BlueClaw Activated*`,
    ``,
    `Alpha signal caller, now on Telegram.`,
    ``,
    `Use /help to see commands.`,
    `Admins can run /config to set up.`,
    ``,
    `_Clawcord, but born on Telegram._`,
  ].join("\n");

  await sendMessage(ctx.chatId, welcomeMsg);
}

async function handleHelp(ctx: TelegramCommandContext): Promise<void> {
  await sendMessage(ctx.chatId, formatHelpMessage());
}

async function handleScan(ctx: TelegramCommandContext): Promise<void> {
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId, userId: ctx.userId });

  // Send "scanning" message
  const scanningMsg = await sendMessage(ctx.chatId, "🔍 Scanning for graduations...");

  try {
    const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
    const minScore = config.display?.minScore || config.policy.thresholds.minConfidenceScore;
    const filtered = candidates.filter(c => c.passesFilter && c.score >= minScore);

    const resultText = formatScanResults(filtered, config.vibeMode);

    if (scanningMsg) {
      await editMessage(ctx.chatId, scanningMsg.message_id, resultText);
    } else {
      await sendMessage(ctx.chatId, resultText);
    }

    // If we have results, show top one with keyboard
    if (filtered.length > 0) {
      const top = filtered[0];
      const callText = formatGraduationCall(top, config.vibeMode);
      const keyboard = [
        [
          { text: "📊 DexScreener", url: top.pair.url },
          { text: "📋 Copy CA", callback_data: `copy:${top.graduation.mint}` },
        ],
      ];
      await sendMessage(ctx.chatId, callText, { inlineKeyboard: keyboard });
    }
  } catch (error) {
    console.error("Scan error:", error);
    if (scanningMsg) {
      await editMessage(ctx.chatId, scanningMsg.message_id, "❌ Scan failed. Try again.");
    }
  }
}

async function handleAlpha(ctx: TelegramCommandContext): Promise<void> {
  // Same as scan but only shows top result
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId, userId: ctx.userId });

  await sendMessage(ctx.chatId, "🔥 Fetching alpha...");

  try {
    const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
    const minScore = config.display?.minScore || 6.5;
    const filtered = candidates.filter(c => c.passesFilter && c.score >= minScore);

    if (filtered.length === 0) {
      const noAlpha = config.vibeMode === "aggressive" 
        ? "nothing hitting rn 🏜️"
        : "No alpha at the moment.";
      await sendMessage(ctx.chatId, noAlpha);
      return;
    }

    const top = filtered[0];
    const callText = formatGraduationCall(top, config.vibeMode);
    const keyboard = [
      [
        { text: "📊 DexScreener", url: top.pair.url },
      ],
      [
        { text: "🔄 Refresh", callback_data: "refresh:alpha" },
        { text: "📋 More", callback_data: "more:signals" },
      ],
    ];

    await sendMessage(ctx.chatId, callText, { inlineKeyboard: keyboard });
  } catch (error) {
    console.error("Alpha error:", error);
    await sendMessage(ctx.chatId, "❌ Failed to fetch alpha.");
  }
}

async function handleSignals(ctx: TelegramCommandContext): Promise<void> {
  const storage = getTelegramStorage();
  const logs = await storage.getCallLogs(ctx.chatId, 5);

  if (logs.length === 0) {
    await sendMessage(ctx.chatId, "No recent signals in this chat.");
    return;
  }

  const lines = ["*Recent Signals*", ""];
  logs.forEach((log, i) => {
    const card = log.callCard;
    lines.push(`${i + 1}. *$${card.token.symbol}* — ${card.confidence}/10`);
    lines.push(`   ${new Date(log.createdAt).toLocaleDateString()}`);
  });

  await sendMessage(ctx.chatId, lines.join("\n"));
}

async function handleLastCall(ctx: TelegramCommandContext): Promise<void> {
  const storage = getTelegramStorage();
  const logs = await storage.getCallLogs(ctx.chatId, 1);

  if (logs.length === 0) {
    await sendMessage(ctx.chatId, "No calls yet in this chat.");
    return;
  }

  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  const callText = formatCallCardForTelegram(logs[0].callCard, config.vibeMode);
  const keyboard = [
    [{ text: "📊 DexScreener", url: `https://dexscreener.com/solana/${logs[0].callCard.token.mint}` }],
  ];

  await sendMessage(ctx.chatId, callText, { inlineKeyboard: keyboard });
}

async function handleStatus(ctx: TelegramCommandContext): Promise<void> {
  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  const stats = await storage.getStats();

  const statusText = formatStatusMessage(config, { 
    totalCalls: stats.totalCalls, 
    activeChats: stats.activeChats 
  });

  await sendMessage(ctx.chatId, statusText);
}

async function handleConfig(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  const autopostStatus = config.policy.autopostEnabled ? "ON" : "OFF";

  const configText = [
    `*Configuration*`,
    ``,
    `Policy: ${config.policy.name}`,
    `Min Score: ${config.display?.minScore || config.policy.thresholds.minConfidenceScore}/10`,
    `Autopost: ${autopostStatus}`,
    `Vibe: ${config.vibeMode}`,
  ].join("\n");

  const keyboard = [
    [
      { text: "📊 Set Risk", callback_data: "config:risk" },
      { text: config.policy.autopostEnabled ? "🔕 Disable Auto" : "🔔 Enable Auto", callback_data: "config:autopost" },
    ],
    [
      { text: "📜 Change Policy", callback_data: "config:policy" },
      { text: "🎭 Vibe Mode", callback_data: "config:vibe" },
    ],
    [{ text: "❌ Close", callback_data: "close" }],
  ];

  await sendMessage(ctx.chatId, configText, { inlineKeyboard: keyboard });
}

async function handleSetRisk(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const score = parseInt(ctx.args[0], 10);
  if (isNaN(score) || score < 1 || score > 10) {
    await sendMessage(ctx.chatId, "Usage: `/setrisk <1-10>`\nExample: `/setrisk 7`");
    return;
  }

  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  
  if (!config.display) {
    config.display = { minScore: score, showVolume: true, showHolders: true, showLinks: true };
  } else {
    config.display.minScore = score;
  }
  config.policy.thresholds.minConfidenceScore = score;
  
  await storage.saveChatConfig(config);
  await sendMessage(ctx.chatId, `✅ Min score set to *${score}/10*`);
}

async function handleAutopost(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  
  config.policy.autopostEnabled = !config.policy.autopostEnabled;
  await storage.saveChatConfig(config);

  const status = config.policy.autopostEnabled 
    ? "✅ *Autopost enabled*\nSignals will be posted automatically."
    : "❌ *Autopost disabled*\nUse /scan for manual scans.";
  
  await sendMessage(ctx.chatId, status);
}

async function handlePolicy(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const presets = getPolicyPresets();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });

  const lines = [
    `*Current Policy:* ${config.policy.name}`,
    ``,
    `*Available Presets:*`,
  ];

  presets.forEach(p => {
    const current = p.preset === config.policy.preset ? " ✓" : "";
    lines.push(`• *${p.name}*${current}`);
    lines.push(`  ${p.description}`);
  });

  const keyboard = generatePolicyKeyboard().map(row =>
    row.map(btn => ({ text: btn.text, callback_data: btn.callbackData }))
  );

  await sendMessage(ctx.chatId, lines.join("\n"), { inlineKeyboard: keyboard });
}

async function handleMute(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  config.policy.autopostEnabled = false;
  await storage.saveChatConfig(config);
  
  await sendMessage(ctx.chatId, "🔕 Signals muted. Use /unmute to resume.");
}

async function handleUnmute(ctx: TelegramCommandContext): Promise<void> {
  if (!ctx.isAdmin && !ctx.isCreator) {
    await sendMessage(ctx.chatId, "⚠️ Admin only.");
    return;
  }

  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId: ctx.chatId });
  config.policy.autopostEnabled = true;
  await storage.saveChatConfig(config);
  
  await sendMessage(ctx.chatId, "🔔 Signals unmuted.");
}

// Callback Query Handler
async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  if (!query.data || !query.message) {
    await answerCallbackQuery(query.id);
    return;
  }

  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const [action, ...payloadParts] = query.data.split(":");
  const payload = payloadParts.join(":");

  const storage = getTelegramStorage();
  const config = await getOrCreateChatConfig({ chatId });
  const isAdmin = await isUserAdmin(chatId, query.from.id);

  switch (action) {
    case "close":
      await telegramAPI("deleteMessage", { chat_id: chatId, message_id: messageId });
      await answerCallbackQuery(query.id);
      break;

    case "refresh":
      if (payload === "alpha") {
        await answerCallbackQuery(query.id, "Refreshing...");
        // Trigger new alpha scan
        const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
        const minScore = config.display?.minScore || 6.5;
        const filtered = candidates.filter(c => c.passesFilter && c.score >= minScore);
        
        if (filtered.length > 0) {
          const callText = formatGraduationCall(filtered[0], config.vibeMode);
          await editMessage(chatId, messageId, callText, {
            inlineKeyboard: [
              [{ text: "📊 DexScreener", url: filtered[0].pair.url }],
              [
                { text: "🔄 Refresh", callback_data: "refresh:alpha" },
                { text: "📋 More", callback_data: "more:signals" },
              ],
            ],
          });
        }
      }
      break;

    case "config":
      if (!isAdmin) {
        await answerCallbackQuery(query.id, "Admin only", true);
        return;
      }

      if (payload === "autopost") {
        config.policy.autopostEnabled = !config.policy.autopostEnabled;
        await storage.saveChatConfig(config);
        await answerCallbackQuery(query.id, config.policy.autopostEnabled ? "Autopost enabled" : "Autopost disabled");
        
        // Update the config message
        const autopostStatus = config.policy.autopostEnabled ? "ON" : "OFF";
        const configText = [
          `*Configuration*`,
          ``,
          `Policy: ${config.policy.name}`,
          `Min Score: ${config.display?.minScore || config.policy.thresholds.minConfidenceScore}/10`,
          `Autopost: ${autopostStatus}`,
          `Vibe: ${config.vibeMode}`,
        ].join("\n");

        await editMessage(chatId, messageId, configText, {
          inlineKeyboard: [
            [
              { text: "📊 Set Risk", callback_data: "config:risk" },
              { text: config.policy.autopostEnabled ? "🔕 Disable Auto" : "🔔 Enable Auto", callback_data: "config:autopost" },
            ],
            [
              { text: "📜 Change Policy", callback_data: "config:policy" },
              { text: "🎭 Vibe Mode", callback_data: "config:vibe" },
            ],
            [{ text: "❌ Close", callback_data: "close" }],
          ],
        });
      } else if (payload === "vibe") {
        // Cycle through vibe modes
        const vibes: Array<TelegramChatConfig["vibeMode"]> = ["neutral", "aggressive", "cautious"];
        const currentIndex = vibes.indexOf(config.vibeMode);
        config.vibeMode = vibes[(currentIndex + 1) % vibes.length];
        await storage.saveChatConfig(config);
        await answerCallbackQuery(query.id, `Vibe: ${config.vibeMode}`);
      } else if (payload === "policy") {
        const presets = getPolicyPresets();
        const lines = ["*Select Policy:*"];
        const keyboard = generatePolicyKeyboard().map(row =>
          row.map(btn => ({ text: btn.text, callback_data: btn.callbackData }))
        );
        await editMessage(chatId, messageId, lines.join("\n"), { inlineKeyboard: keyboard });
        await answerCallbackQuery(query.id);
      }
      break;

    case "policy":
      if (!isAdmin) {
        await answerCallbackQuery(query.id, "Admin only", true);
        return;
      }

      const newPolicy = createPolicy(chatId, payload as any);
      config.policy = { ...newPolicy, autopostEnabled: config.policy.autopostEnabled };
      await storage.saveChatConfig(config);
      await answerCallbackQuery(query.id, `Policy: ${newPolicy.name}`);
      await editMessage(chatId, messageId, `✅ Policy set to *${newPolicy.name}*`, { inlineKeyboard: [] });
      break;

    case "more":
      if (payload === "signals") {
        // Show more signals
        const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
        const minScore = config.display?.minScore || 6.5;
        const filtered = candidates.filter(c => c.passesFilter && c.score >= minScore);
        const resultText = formatScanResults(filtered, config.vibeMode);
        await sendMessage(chatId, resultText);
        await answerCallbackQuery(query.id);
      }
      break;

    default:
      await answerCallbackQuery(query.id);
  }
}

// Main update handler
async function handleUpdate(update: TelegramUpdate): Promise<void> {
  // Handle callback queries (button presses)
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  // Handle bot added/removed from chat
  if (update.my_chat_member) {
    const chat = update.my_chat_member.chat;
    const status = update.my_chat_member.new_chat_member.status;
    
    if (status === "member" || status === "administrator") {
      console.log(`➕ Added to ${chat.type}: ${chat.title || chat.id}`);
      await getOrCreateChatConfig({
        chatId: chat.id.toString(),
        chatTitle: chat.title,
        chatType: chat.type,
        userId: update.my_chat_member.from.id.toString(),
      });
    } else if (status === "left" || status === "kicked") {
      console.log(`➖ Removed from: ${chat.title || chat.id}`);
    }
    return;
  }

  // Handle messages
  if (!update.message) return;

  const message = update.message;
  const parsed = parseCommand(message);
  if (!parsed) return;

  const chatId = message.chat.id.toString();
  const userId = message.from?.id.toString() || "";
  const isAdmin = await isUserAdmin(chatId, message.from?.id || 0);

  const ctx: TelegramCommandContext = {
    chatId,
    userId,
    username: message.from?.username,
    firstName: message.from?.first_name,
    messageId: message.message_id,
    isAdmin,
    isCreator: false, // Would need to check chat creator
    args: parsed.args,
    replyToMessageId: message.reply_to_message?.message_id,
  };

  console.log(`📨 Command /${parsed.command} from ${ctx.username || ctx.userId} in ${chatId}`);

  // Route to handlers
  switch (parsed.command) {
    case "start":
      await handleStart(ctx);
      break;
    case "help":
      await handleHelp(ctx);
      break;
    case "scan":
      await handleScan(ctx);
      break;
    case "alpha":
      await handleAlpha(ctx);
      break;
    case "signals":
      await handleSignals(ctx);
      break;
    case "lastcall":
      await handleLastCall(ctx);
      break;
    case "status":
      await handleStatus(ctx);
      break;
    case "config":
      await handleConfig(ctx);
      break;
    case "setrisk":
      await handleSetRisk(ctx);
      break;
    case "autopost":
      await handleAutopost(ctx);
      break;
    case "policy":
      await handlePolicy(ctx);
      break;
    case "mute":
      await handleMute(ctx);
      break;
    case "unmute":
      await handleUnmute(ctx);
      break;
    default:
      // Unknown command - ignore
      break;
  }
}

// Set bot commands in Telegram
async function setBotCommands(): Promise<void> {
  const commands = BLUECLAW_COMMANDS
    .filter(c => !c.adminOnly)
    .map(c => ({ command: c.command, description: c.description }));

  await telegramAPI("setMyCommands", { commands });
  console.log("✅ Bot commands registered");
}

// Polling mode (for development)
async function startPolling(): Promise<void> {
  console.log("🚀 Starting BlueClaw in polling mode...");
  
  await setBotCommands();
  
  let offset = 0;
  
  // Start autopost service
  const autopost = new TelegramAutopostService();
  autopost.start();
  console.log("🔄 Autopost service started");

  while (true) {
    try {
      const updates = await telegramAPI("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query", "my_chat_member"],
      });

      if (updates && Array.isArray(updates)) {
        for (const update of updates) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
      await new Promise(r => setTimeout(r, 5000)); // Wait before retry
    }
  }
}

// Webhook handler (for production)
export async function handleWebhook(body: TelegramUpdate): Promise<void> {
  await handleUpdate(body);
}

// Export for Next.js API route
export { sendMessage, telegramAPI };

// Start polling if running directly
if (require.main === module) {
  startPolling().catch(console.error);
}
