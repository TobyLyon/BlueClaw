// BlueClaw - Telegram Webhook API Route
// Handles incoming updates from Telegram Bot API

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Cache for scan results (allows clicking tickers to show details)
// Key: chatId, Value: { candidates, timestamp }
const scanCache = new Map<string, { candidates: any[]; timestamp: number }>();

// Clean old cache entries (older than 10 minutes)
function cleanScanCache() {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutes
  for (const [key, value] of scanCache.entries()) {
    if (now - value.timestamp > maxAge) {
      scanCache.delete(key);
    }
  }
}

// Import types inline to avoid build issues
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

// Telegram API helper
async function telegramAPI(method: string, params: Record<string, unknown> = {}): Promise<any> {
  if (!TELEGRAM_BOT_TOKEN) return null;
  
  try {
    const response = await fetch(`${TELEGRAM_API}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    const result = await response.json() as { ok: boolean; result?: any };
    return result.ok ? result.result : null;
  } catch {
    return null;
  }
}

// Send message
async function sendMessage(
  chatId: string | number,
  text: string,
  options: {
    parseMode?: string;
    inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
  } = {}
): Promise<void> {
  const params: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || "Markdown",
    disable_web_page_preview: true,
  };

  if (options.inlineKeyboard) {
    params.reply_markup = { inline_keyboard: options.inlineKeyboard };
  }

  await telegramAPI("sendMessage", params);
}

// Check admin status
async function isUserAdmin(chatId: string | number, userId: number): Promise<boolean> {
  const member = await telegramAPI("getChatMember", { chat_id: chatId, user_id: userId });
  if (!member) return false;
  return member.status === "creator" || member.status === "administrator";
}

// Parse command
function parseCommand(message: TelegramMessage): { command: string; args: string[] } | null {
  if (!message.text) return null;
  const entity = message.entities?.find(e => e.type === "bot_command" && e.offset === 0);
  if (!entity) return null;
  
  const commandText = message.text.substring(0, entity.length);
  const command = commandText.split("@")[0].substring(1).toLowerCase();
  const argsText = message.text.substring(entity.length).trim();
  const args = argsText ? argsText.split(/\s+/) : [];
  
  return { command, args };
}

// Dynamic imports for heavy modules (avoid edge runtime issues)
async function getModules() {
  const [
    { getTelegramStorage, getOrCreateChatConfig },
    { createPolicy, getPolicyPresets },
    { GraduationWatcher, DEFAULT_GRADUATION_FILTER },
    { scoreToken },
    { generateCallCard },
    formatter,
  ] = await Promise.all([
    import("@/lib/clawcord/telegram-storage"),
    import("@/lib/clawcord/policies"),
    import("@/lib/clawcord/dexscreener-provider"),
    import("@/lib/clawcord/scoring"),
    import("@/lib/clawcord/call-card"),
    import("@/lib/clawcord/telegram-formatter"),
  ]);

  return {
    getTelegramStorage,
    getOrCreateChatConfig,
    createPolicy,
    getPolicyPresets,
    GraduationWatcher,
    DEFAULT_GRADUATION_FILTER,
    scoreToken,
    generateCallCard,
    ...formatter,
  };
}

// Main webhook handler
export async function POST(request: NextRequest) {
  // Verify webhook secret if configured
  if (TELEGRAM_WEBHOOK_SECRET) {
    const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "Bot not configured" }, { status: 500 });
  }

  try {
    // Clean stale scan cache entries
    cleanScanCache();

    const update: TelegramUpdate = await request.json();
    
    // Handle callback queries
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return NextResponse.json({ ok: true });
    }

    // Handle messages
    if (update.message) {
      await handleMessage(update.message);
      return NextResponse.json({ ok: true });
    }

    // Handle bot membership changes
    if (update.my_chat_member) {
      const chat = update.my_chat_member.chat;
      const status = update.my_chat_member.new_chat_member.status;
      
      if (status === "member" || status === "administrator") {
        const { getOrCreateChatConfig } = await getModules();
        await getOrCreateChatConfig({
          chatId: chat.id.toString(),
          chatTitle: chat.title,
          chatType: chat.type,
          userId: update.my_chat_member.from.id.toString(),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: true }); // Always return 200 to prevent retries
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const parsed = parseCommand(message);
  if (!parsed) return;

  const chatId = message.chat.id.toString();
  const userId = message.from?.id.toString() || "";
  const isAdmin = message.from ? await isUserAdmin(chatId, message.from.id) : false;

  const modules = await getModules();
  const { getOrCreateChatConfig, getTelegramStorage, GraduationWatcher, DEFAULT_GRADUATION_FILTER } = modules;

  switch (parsed.command) {
    case "start": {
      await getOrCreateChatConfig({ chatId, userId });
      await sendMessage(chatId, [
        "🦞 *BlueClaw Activated*",
        "",
        "Whale tracking. Holder analysis. On-chain signals.",
        "",
        "Use /help to see commands.",
      ].join("\n"));
      break;
    }

    case "help": {
      await sendMessage(chatId, modules.formatHelpMessage(), { parseMode: "HTML" });
      break;
    }

    case "scan": {
      const config = await getOrCreateChatConfig({ chatId, userId });
      await sendMessage(chatId, "🔍 Scanning for graduations...");
      
      try {
        const watcher = new GraduationWatcher();
        const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
        
        if (candidates.length === 0) {
          await sendMessage(chatId, "📊 No tokens found. DexScreener may be rate-limited or no new graduations available.\n\nTry again in a minute.");
          break;
        }
        
        // Show all candidates sorted by score, not just filtered ones
        const minScore = config.display?.minScore || 5;
        const sorted = candidates.sort((a: any, b: any) => b.score - a.score);
        const filtered = sorted.filter((c: any) => c.score >= minScore).slice(0, 10);
        
        if (filtered.length === 0) {
          await sendMessage(chatId, `📊 Found ${candidates.length} tokens but none scored above ${minScore}/10.\n\nTop token: ${candidates[0]?.graduation?.symbol || "N/A"} (${candidates[0]?.score?.toFixed(1) || "?"}/10)`);
          break;
        }
        
        // Store candidates in memory for callback retrieval
        scanCache.set(chatId, { candidates: filtered, timestamp: Date.now() });
        
        // Send scan results with clickable ticker buttons
        const tickerKeyboard = modules.generateTickerKeyboard(filtered);
        await sendMessage(chatId, modules.formatScanResults(filtered, config.vibeMode), { 
          parseMode: "HTML",
          inlineKeyboard: modules.signalKeyboardToTelegram(tickerKeyboard),
        });
      } catch (error) {
        console.error("Scan error:", error);
        await sendMessage(chatId, "❌ Error scanning. Please try again in a moment.");
      }
      break;
    }

    case "alpha": {
      await sendMessage(chatId, "🔍 Finding alpha...");
      try {
        const config = await getOrCreateChatConfig({ chatId, userId });
        const watcher = new GraduationWatcher();
        const candidates = await watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
        
        if (candidates.length === 0) {
          await sendMessage(chatId, "📊 No tokens available. Try again in a moment.");
          break;
        }
        
        // Only show tokens that pass ALL filters — strict for alpha
        const minScore = config.display?.minScore || 7;
        const filtered = candidates
          .filter((c: any) => c.passesFilter && c.score >= minScore)
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5);
        
        if (filtered.length === 0) {
          const passingFilter = candidates.filter((c: any) => c.passesFilter);
          if (passingFilter.length === 0) {
            await sendMessage(chatId, "🔍 No tokens passing scam filters right now.\n\nAll candidates failed liquidity ratio, buy/sell ratio, or other safety checks.");
          } else {
            await sendMessage(chatId, `📊 ${passingFilter.length} tokens passed filters but none scored ${minScore}+.\n\nTop: $${passingFilter[0]?.graduation?.symbol} (${passingFilter[0]?.score?.toFixed(1)}/10)`);
          }
          break;
        }
        
        // Cache and show with ticker buttons
        scanCache.set(chatId, { candidates: filtered, timestamp: Date.now() });
        const tickerKeyboard = modules.generateTickerKeyboard(filtered);
        await sendMessage(chatId, modules.formatScanResults(filtered, config.vibeMode), {
          parseMode: "HTML",
          inlineKeyboard: modules.signalKeyboardToTelegram(tickerKeyboard),
        });
      } catch (error) {
        console.error("Alpha command error:", error);
        await sendMessage(chatId, "❌ Error fetching alpha. Try again.");
      }
      break;
    }

    case "status": {
      const config = await getOrCreateChatConfig({ chatId });
      const stats = await getTelegramStorage().getStats();
      await sendMessage(chatId, modules.formatStatusMessage(config, stats), { parseMode: "HTML" });
      break;
    }

    case "config": {
      if (!isAdmin) {
        await sendMessage(chatId, "⚠️ Admin only.");
        return;
      }
      
      const config = await getOrCreateChatConfig({ chatId });
      const autoStatus = config.policy.autopostEnabled ? "ON" : "OFF";
      
      await sendMessage(chatId, [
        "<b>Configuration</b>",
        "",
        `Policy: ${config.policy.name}`,
        `Min Score: ${config.display?.minScore || config.policy.thresholds.minConfidenceScore}/10`,
        `Autopost: ${autoStatus}`,
        `Vibe: ${config.vibeMode}`,
      ].join("\n"), {
        parseMode: "HTML",
        inlineKeyboard: [
          [
            { text: "📊 Set Risk", callback_data: "config:risk" },
            { text: config.policy.autopostEnabled ? "🔕 Disable" : "🔔 Enable", callback_data: "config:autopost" },
          ],
          [
            { text: "📜 Policy", callback_data: "config:policy" },
            { text: "🎭 Vibe", callback_data: "config:vibe" },
          ],
          [{ text: "❌ Close", callback_data: "close" }],
        ],
      });
      break;
    }

    case "setrisk": {
      if (!isAdmin) {
        await sendMessage(chatId, "⚠️ Admin only.");
        return;
      }
      
      const score = parseInt(parsed.args[0], 10);
      if (isNaN(score) || score < 1 || score > 10) {
        await sendMessage(chatId, "Usage: `/setrisk <1-10>`");
        return;
      }
      
      const config = await getOrCreateChatConfig({ chatId });
      if (!config.display) {
        config.display = { minScore: score, showVolume: true, showHolders: true, showLinks: true };
      } else {
        config.display.minScore = score;
      }
      config.policy.thresholds.minConfidenceScore = score;
      await getTelegramStorage().saveChatConfig(config);
      await sendMessage(chatId, `✅ Min score set to <b>${score}/10</b>`, { parseMode: "HTML" });
      break;
    }

    case "autopost": {
      if (!isAdmin) {
        await sendMessage(chatId, "⚠️ Admin only.");
        return;
      }
      
      const config = await getOrCreateChatConfig({ chatId });
      config.policy.autopostEnabled = !config.policy.autopostEnabled;
      await getTelegramStorage().saveChatConfig(config);
      
      await sendMessage(chatId, config.policy.autopostEnabled 
        ? "✅ <b>Autopost enabled</b>" 
        : "❌ <b>Autopost disabled</b>",
        { parseMode: "HTML" }
      );
      break;
    }

    case "policy": {
      if (!isAdmin) {
        await sendMessage(chatId, "⚠️ Admin only.");
        return;
      }
      
      const config = await getOrCreateChatConfig({ chatId });
      const presets = modules.getPolicyPresets();
      
      const lines = [`<b>Current:</b> ${config.policy.name}`, "", "<b>Available:</b>"];
      presets.forEach((p: any) => lines.push(`• ${p.name}`));
      
      await sendMessage(chatId, lines.join("\n"), {
        parseMode: "HTML",
        inlineKeyboard: modules.generatePolicyKeyboard().map((row: any) =>
          row.map((btn: any) => ({ text: btn.text, callback_data: btn.callbackData }))
        ),
      });
      break;
    }

    case "mute":
    case "unmute": {
      if (!isAdmin) {
        await sendMessage(chatId, "⚠️ Admin only.");
        return;
      }
      
      const config = await getOrCreateChatConfig({ chatId });
      config.policy.autopostEnabled = parsed.command === "unmute";
      await getTelegramStorage().saveChatConfig(config);
      
      await sendMessage(chatId, parsed.command === "unmute" 
        ? "🔔 Signals unmuted." 
        : "🔕 Signals muted."
      );
      break;
    }

    case "whale": {
      const mint = parsed.args[0];
      if (!mint) {
        await sendMessage(chatId, "Usage: `/whale <mint_address>`\n\nExample: `/whale 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr`");
        return;
      }
      
      await sendMessage(chatId, "🔍 Analyzing whale activity...");
      
      try {
        const signals = await import("../../../../lib/clawcord/signals-analyzer");
        const whaleData = await signals.analyzeWhaleActivity(mint);
        
        // Get symbol from DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const dexData = await dexRes.json();
        const symbol = dexData.pairs?.[0]?.baseToken?.symbol || "TOKEN";
        
        const message = signals.formatWhaleMessage(symbol, mint, whaleData);
        await sendMessage(chatId, message, {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(mint, "whale"),
        });
      } catch (error) {
        console.error("Whale analysis error:", error);
        await sendMessage(chatId, "❌ Error analyzing whale activity. Please try again.");
      }
      break;
    }

    case "holders": {
      const mint = parsed.args[0];
      if (!mint) {
        await sendMessage(chatId, "Usage: `/holders <mint_address>`\n\nExample: `/holders 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr`");
        return;
      }
      
      await sendMessage(chatId, "🔍 Analyzing holder distribution...");
      
      try {
        const signals = await import("../../../../lib/clawcord/signals-analyzer");
        const holderData = await signals.analyzeHolders(mint);
        
        // Get symbol from DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const dexData = await dexRes.json();
        const symbol = dexData.pairs?.[0]?.baseToken?.symbol || "TOKEN";
        
        const message = signals.formatHoldersMessage(symbol, mint, holderData);
        await sendMessage(chatId, message, {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(mint, "holders"),
        });
      } catch (error) {
        console.error("Holder analysis error:", error);
        await sendMessage(chatId, "❌ Error analyzing holders. Please try again.");
      }
      break;
    }

    case "fresh": {
      await sendMessage(chatId, "🔍 Scanning for fresh graduations...");
      
      try {
        const watcher = new GraduationWatcher();
        // Relaxed filter - focus on genuinely new tokens
        const freshFilter = {
          minLiquidity: 5000,
          minVolume5m: 100,
          minHolders: 10, // Low threshold for very new tokens
          maxAgeMinutes: 60, // Last hour only
          excludeRuggedDeployers: false,
        };
        
        // Use the fresh-specific scanner that hits /latest/dex/pairs/solana
        const graduations = await watcher.scanFreshGraduations(freshFilter);
        const config = await getOrCreateChatConfig({ chatId });
        
        if (graduations.length === 0) {
          await sendMessage(chatId, "🆕 No fresh graduations in the last hour.\n\nTokens must be <60 min old with minimum liquidity. Try again soon.");
          break;
        }
        
        const top = graduations.slice(0, 5);
        
        // Store for ticker callback
        scanCache.set(chatId, { candidates: top, timestamp: Date.now() });
        
        // Format fresh graduations
        const lines = [`🆕 <b>${top.length} Fresh Token${top.length > 1 ? "s" : ""}</b>\n`];
        
        for (let i = 0; i < top.length; i++) {
          const g = top[i];
          const age = Math.round((Date.now() - (g.pair.pairCreatedAt || Date.now())) / 60000);
          const mcap = g.pair.marketCap ? `$${(g.pair.marketCap / 1000).toFixed(0)}K` : "N/A";
          const scoreEmoji = g.score >= 8 ? "🔥" : g.score >= 7 ? "✨" : "";
          
          lines.push(`<b>${i + 1}. ◎ $${g.graduation.symbol}</b> — ${g.score.toFixed(1)}/10 ${scoreEmoji}`);
          lines.push(`   ${age}m old | ${mcap} MC`);
          lines.push(``);
        }
        
        // Add clickable ticker buttons
        const tickerKeyboard = modules.generateTickerKeyboard(top);
        
        await sendMessage(chatId, lines.join("\n"), {
          parseMode: "HTML",
          inlineKeyboard: modules.signalKeyboardToTelegram(tickerKeyboard),
        });
      } catch (error) {
        console.error("Fresh scan error:", error);
        await sendMessage(chatId, "❌ Error scanning. Please try again in a moment.");
      }
      break;
    }

    case "momentum": {
      const mint = parsed.args[0];
      if (!mint) {
        await sendMessage(chatId, "Usage: `/momentum <mint_address>`\n\nExample: `/momentum 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr`");
        return;
      }
      
      await sendMessage(chatId, "🔍 Analyzing momentum...");
      
      try {
        const signals = await import("../../../../lib/clawcord/signals-analyzer");
        
        // Get pair data from DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];
        
        if (!pair) {
          await sendMessage(chatId, "❌ Token not found on DexScreener.");
          return;
        }
        
        const symbol = pair.baseToken?.symbol || "TOKEN";
        const momentumData = signals.analyzeMomentum(pair);
        
        const message = signals.formatMomentumMessage(symbol, mint, momentumData, pair);
        await sendMessage(chatId, message, {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(mint, "momentum"),
        });
      } catch (error) {
        console.error("Momentum analysis error:", error);
        await sendMessage(chatId, "❌ Error analyzing momentum. Please try again.");
      }
      break;
    }

    case "risk": {
      const mint = parsed.args[0];
      if (!mint) {
        await sendMessage(chatId, "Usage: `/risk <mint_address>`\n\nExample: `/risk 7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr`");
        return;
      }
      
      await sendMessage(chatId, "🔍 Analyzing risk factors...");
      
      try {
        const signals = await import("../../../../lib/clawcord/signals-analyzer");
        
        // Get pair data from DexScreener
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];
        
        if (!pair) {
          await sendMessage(chatId, "❌ Token not found on DexScreener.");
          return;
        }
        
        const symbol = pair.baseToken?.symbol || "TOKEN";
        const riskData = await signals.analyzeRisk(mint, pair);
        
        const message = signals.formatRiskMessage(symbol, mint, riskData);
        await sendMessage(chatId, message, {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(mint, "risk"),
        });
      } catch (error) {
        console.error("Risk analysis error:", error);
        await sendMessage(chatId, "❌ Error analyzing risk. Please try again.");
      }
      break;
    }
  }
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  if (!query.data || !query.message) {
    await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
    return;
  }

  const chatId = query.message.chat.id.toString();
  const messageId = query.message.message_id;
  const [action, ...payloadParts] = query.data.split(":");
  const payload = payloadParts.join(":");
  const isAdmin = await isUserAdmin(chatId, query.from.id);

  const modules = await getModules();
  const { getTelegramStorage, getOrCreateChatConfig, createPolicy } = modules;

  switch (action) {
    case "close":
      await telegramAPI("deleteMessage", { chat_id: chatId, message_id: messageId });
      break;

    case "config":
      if (!isAdmin) {
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: "Admin only", 
          show_alert: true 
        });
        return;
      }

      if (payload === "autopost") {
        const config = await getOrCreateChatConfig({ chatId });
        config.policy.autopostEnabled = !config.policy.autopostEnabled;
        await getTelegramStorage().saveChatConfig(config);
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: config.policy.autopostEnabled ? "Autopost ON" : "Autopost OFF" 
        });
      } else if (payload === "vibe") {
        const config = await getOrCreateChatConfig({ chatId });
        const vibes = ["neutral", "aggressive", "cautious"] as const;
        const idx = vibes.indexOf(config.vibeMode);
        config.vibeMode = vibes[(idx + 1) % vibes.length];
        await getTelegramStorage().saveChatConfig(config);
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: `Vibe: ${config.vibeMode}` 
        });
      } else if (payload === "risk") {
        // Show risk level selection keyboard
        const config = await getOrCreateChatConfig({ chatId });
        const currentScore = config.display?.minScore || config.policy.thresholds.minConfidenceScore || 5;
        await telegramAPI("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `📊 <b>Set Min Score</b>\n\nCurrent: <b>${currentScore}/10</b>\nHigher = stricter (fewer, safer picks)`,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [
            [
              { text: "3 🎰", callback_data: "setrisk:3" },
              { text: "5 📊", callback_data: "setrisk:5" },
              { text: "7 ✨", callback_data: "setrisk:7" },
              { text: "9 🔥", callback_data: "setrisk:9" },
            ],
            [{ text: "❌ Cancel", callback_data: "close" }],
          ]},
        });
        await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
      }
      break;

    case "policy":
      if (!isAdmin) {
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: "Admin only", 
          show_alert: true 
        });
        return;
      }

      const config = await getOrCreateChatConfig({ chatId });
      const newPolicy = createPolicy(chatId, payload as any);
      config.policy = { ...newPolicy, autopostEnabled: config.policy.autopostEnabled };
      await getTelegramStorage().saveChatConfig(config);
      
      await telegramAPI("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `✅ Policy: *${newPolicy.name}*`,
        parse_mode: "Markdown",
      });
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
      break;

    case "setrisk": {
      if (!isAdmin) {
        await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Admin only", show_alert: true });
        return;
      }
      const newScore = parseInt(payload, 10);
      if (!isNaN(newScore) && newScore >= 1 && newScore <= 10) {
        const cfg = await getOrCreateChatConfig({ chatId });
        if (!cfg.display) {
          cfg.display = { minScore: newScore, showVolume: true, showHolders: true, showLinks: true };
        } else {
          cfg.display.minScore = newScore;
        }
        cfg.policy.thresholds.minConfidenceScore = newScore;
        await getTelegramStorage().saveChatConfig(cfg);
        await telegramAPI("editMessageText", {
          chat_id: chatId,
          message_id: messageId,
          text: `✅ Min score set to <b>${newScore}/10</b>`,
          parse_mode: "HTML",
        });
      }
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
      break;
    }

    case "refresh":
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Refreshing..." });
      break;

    case "whale": {
      // Signal button: run whale analysis inline
      const wMint = payload;
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Analyzing whales..." });
      try {
        const signals = await import("@/lib/clawcord/signals-analyzer");
        const whaleData = await signals.analyzeWhaleActivity(wMint);
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${wMint}`);
        const dexData = await dexRes.json();
        const symbol = dexData.pairs?.[0]?.baseToken?.symbol || "TOKEN";
        await sendMessage(chatId, signals.formatWhaleMessage(symbol, wMint, whaleData), {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(wMint, "whale"),
        });
      } catch {
        await sendMessage(chatId, "❌ Error analyzing whales.");
      }
      break;
    }

    case "holders": {
      const hMint = payload;
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Analyzing holders..." });
      try {
        const signals = await import("@/lib/clawcord/signals-analyzer");
        const holderData = await signals.analyzeHolders(hMint);
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${hMint}`);
        const dexData = await dexRes.json();
        const symbol = dexData.pairs?.[0]?.baseToken?.symbol || "TOKEN";
        await sendMessage(chatId, signals.formatHoldersMessage(symbol, hMint, holderData), {
          parseMode: "HTML",
          inlineKeyboard: signals.generateSignalKeyboard(hMint, "holders"),
        });
      } catch {
        await sendMessage(chatId, "❌ Error analyzing holders.");
      }
      break;
    }

    case "momentum": {
      const mMint = payload;
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Analyzing momentum..." });
      try {
        const signals = await import("@/lib/clawcord/signals-analyzer");
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mMint}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];
        if (pair) {
          const symbol = pair.baseToken?.symbol || "TOKEN";
          const momentumData = signals.analyzeMomentum(pair);
          await sendMessage(chatId, signals.formatMomentumMessage(symbol, mMint, momentumData, pair), {
            parseMode: "HTML",
            inlineKeyboard: signals.generateSignalKeyboard(mMint, "momentum"),
          });
        }
      } catch {
        await sendMessage(chatId, "❌ Error analyzing momentum.");
      }
      break;
    }

    case "risk": {
      const rMint = payload;
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id, text: "Analyzing risk..." });
      try {
        const signals = await import("@/lib/clawcord/signals-analyzer");
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${rMint}`);
        const dexData = await dexRes.json();
        const pair = dexData.pairs?.[0];
        if (pair) {
          const symbol = pair.baseToken?.symbol || "TOKEN";
          const riskData = await signals.analyzeRisk(rMint, pair);
          await sendMessage(chatId, signals.formatRiskMessage(symbol, rMint, riskData), {
            parseMode: "HTML",
            inlineKeyboard: signals.generateSignalKeyboard(rMint, "risk"),
          });
        }
      } catch {
        await sendMessage(chatId, "❌ Error analyzing risk.");
      }
      break;
    }

    case "ticker": {
      // User clicked on a ticker - show detailed card with PFP
      const mint = payload;
      const cached = scanCache.get(chatId);
      
      if (!cached) {
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: "Scan expired. Run /scan again.",
          show_alert: true 
        });
        return;
      }
      
      const candidate = cached.candidates.find((c: any) => c.graduation.mint === mint);
      if (!candidate) {
        await telegramAPI("answerCallbackQuery", { 
          callback_query_id: query.id, 
          text: "Token not found in scan results.",
          show_alert: true 
        });
        return;
      }
      
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
      
      // Get token image URL from DexScreener pair info
      const imageUrl = candidate.pair.info?.imageUrl;
      const config = await getOrCreateChatConfig({ chatId });
      
      // Generate signal keyboard with all links
      const signalKeyboard = modules.generateSignalKeyboard(
        candidate.graduation.mint,
        candidate.pair.url,
        candidate.pair.info?.socials,
        candidate.pair.info?.websites
      );
      
      // Format detailed card
      const cardText = modules.formatDetailedTokenCard(candidate, config.vibeMode);
      
      if (imageUrl) {
        // Send photo with caption and keyboard
        await telegramAPI("sendPhoto", {
          chat_id: chatId,
          photo: imageUrl,
          caption: cardText,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: modules.signalKeyboardToTelegram(signalKeyboard) },
        });
      } else {
        // No image, send text message
        await sendMessage(chatId, cardText, {
          parseMode: "HTML",
          inlineKeyboard: modules.signalKeyboardToTelegram(signalKeyboard),
        });
      }
      break;
    }

    default:
      await telegramAPI("answerCallbackQuery", { callback_query_id: query.id });
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    bot: "teleclaw",
    configured: !!TELEGRAM_BOT_TOKEN 
  });
}
