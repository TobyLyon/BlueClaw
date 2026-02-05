// BlueClaw - Telegram Autopost Service
// Parallel to Discord autopost - scans and posts to Telegram chats

import type { GraduationCandidate, CallLog } from "../../lib/clawcord/types";
import type { TelegramChatConfig, TelegramCallLog } from "../../lib/clawcord/telegram-types";
import { GraduationWatcher, DEFAULT_GRADUATION_FILTER } from "../../lib/clawcord/dexscreener-provider";
import { scoreToken } from "../../lib/clawcord/scoring";
import { generateCallCard } from "../../lib/clawcord/call-card";
import { getTelegramStorage } from "../../lib/clawcord/telegram-storage";
import { formatCompactSignalCard, generateSignalKeyboard, signalKeyboardToTelegram } from "../../lib/clawcord/telegram-formatter";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

interface AutopostConfig {
  enabled: boolean;
  intervalMs: number;
  minScore: number;
}

const DEFAULT_CONFIG: AutopostConfig = {
  enabled: false,
  intervalMs: 60_000, // 1 minute
  minScore: 6.5,
};

export class TelegramAutopostService {
  private watcher: GraduationWatcher;
  private intervalId: NodeJS.Timeout | null = null;
  private config: AutopostConfig;
  private seenTokens: Set<string> = new Set(); // Track posted tokens to avoid duplicates

  constructor(config?: Partial<AutopostConfig>) {
    this.watcher = new GraduationWatcher();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async sendTelegramMessage(
    chatId: string,
    text: string,
    options: {
      parseMode?: "Markdown" | "HTML";
      inlineKeyboard?: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
      disableWebPagePreview?: boolean;
    } = {}
  ): Promise<{ ok: boolean; messageId?: number }> {
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("❌ No Telegram bot token configured");
      return { ok: false };
    }

    try {
      const params: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || "Markdown",
        disable_web_page_preview: options.disableWebPagePreview ?? true,
      };

      if (options.inlineKeyboard) {
        params.reply_markup = { inline_keyboard: options.inlineKeyboard };
      }

      const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json() as any;

      if (!result.ok) {
        console.error(`❌ Telegram API error: ${result.description}`);
        if (result.error_code === 403) {
          console.error(`   → Bot was blocked or removed from chat ${chatId}`);
        } else if (result.error_code === 400) {
          console.error(`   → Bad request - chat ${chatId} may not exist`);
        }
        return { ok: false };
      }

      return { ok: true, messageId: result.result?.message_id };
    } catch (error) {
      console.error("❌ Failed to send Telegram message:", error);
      return { ok: false };
    }
  }

  async scanAndNotify(): Promise<{ sent: number; candidates: number }> {
    const scanStart = new Date().toISOString();
    console.log(`\n🔍 [${scanStart}] Telegram autopost scan cycle...`);

    const storage = getTelegramStorage();
    const chats = await storage.getActiveChats();
    console.log(`📋 Found ${chats.length} active Telegram chats`);

    if (chats.length === 0) {
      console.log(`⚠️ No chats have autopost enabled`);
      return { sent: 0, candidates: 0 };
    }

    // Scan for graduations
    console.log(`🎓 Scanning for PumpFun graduations...`);
    const candidates = await this.watcher.scanForGraduations(DEFAULT_GRADUATION_FILTER);
    console.log(`📊 Found ${candidates.length} graduation candidates`);

    // Filter to high-potential, unseen candidates
    const highPotential = candidates.filter(c => {
      const isNew = !this.seenTokens.has(c.graduation.mint);
      const passesScore = c.passesFilter && c.score >= this.config.minScore;
      return isNew && passesScore;
    });

    console.log(`✅ ${highPotential.length} new high-potential candidates`);

    if (highPotential.length > 0) {
      console.log(`🏆 New tokens:`);
      highPotential.forEach((c, i) => {
        console.log(`   ${i + 1}. $${c.graduation.symbol} | Score: ${c.score.toFixed(1)} | MCap: $${(c.pair.marketCap || 0).toLocaleString()}`);
        // Mark as seen
        this.seenTokens.add(c.graduation.mint);
      });

      // Limit seen tokens cache
      if (this.seenTokens.size > 500) {
        const toRemove = this.seenTokens.size - 500;
        const iterator = this.seenTokens.values();
        for (let i = 0; i < toRemove; i++) {
          const val = iterator.next().value;
          if (val) this.seenTokens.delete(val);
        }
      }
    }

    let sent = 0;

    // Send to all subscribed chats
    for (const chat of chats) {
      console.log(`\n📱 Processing chat: ${chat.chatTitle} (${chat.chatId})`);

      // Check quiet hours (if implemented)
      if (this.isQuietHours(chat)) {
        console.log(`   🌙 Skipping - quiet hours`);
        continue;
      }

      // Check daily limit
      const today = new Date().toDateString();
      const logs = await storage.getCallLogs(chat.chatId, 100);
      const callsToday = logs.filter(log => new Date(log.createdAt).toDateString() === today).length;

      console.log(`   📈 Calls today: ${callsToday}/${chat.policy.maxCallsPerDay}`);

      if (callsToday >= chat.policy.maxCallsPerDay) {
        console.log(`   ⏸️ Daily limit reached`);
        continue;
      }

      if (highPotential.length === 0) {
        console.log(`   📭 No new candidates to post`);
        continue;
      }

      // Get chat-specific min score
      const chatMinScore = chat.display?.minScore || chat.policy.thresholds.minConfidenceScore;
      const chatCandidates = highPotential.filter(c => c.score >= chatMinScore);

      for (const candidate of chatCandidates) {
        // Check if already posted to this chat
        const alreadyPosted = logs.some(
          log => log.callCard.token.mint === candidate.graduation.mint
        );

        if (alreadyPosted) {
          console.log(`   ⏭️ Already posted $${candidate.graduation.symbol} to this chat`);
          continue;
        }

        console.log(`   📤 Sending $${candidate.graduation.symbol}...`);

        const message = formatCompactSignalCard(candidate, chat.vibeMode);
        const signalKeyboard = generateSignalKeyboard(
          candidate.graduation.mint,
          candidate.pair.url,
          candidate.pair.info?.socials,
          candidate.pair.info?.websites
        );

        const result = await this.sendTelegramMessage(chat.chatId, message, {
          parseMode: "HTML",
          inlineKeyboard: signalKeyboardToTelegram(signalKeyboard),
        });

        if (result.ok) {
          sent++;
          console.log(`   ✅ Sent!`);

          // Log the call
          const scoringResult = scoreToken(candidate.metrics, chat.policy);
          const callCard = generateCallCard(candidate.metrics, chat.policy, scoringResult);

          const callLog: TelegramCallLog = {
            id: `tg-auto-${Date.now()}-${candidate.graduation.mint.slice(0, 8)}`,
            chatId: chat.chatId,
            callCard,
            triggeredBy: "auto",
            messageId: result.messageId,
            createdAt: new Date(),
          };

          await storage.addCallLog(chat.chatId, callLog);

          // Update chat call count
          chat.callCount++;
          chat.lastCallAt = new Date();
          await storage.saveChatConfig(chat);
        } else {
          console.log(`   ❌ Failed to send`);
        }

        // Small delay between messages to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      }
    }

    console.log(`\n📊 Scan complete: ${sent} messages sent`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return { sent, candidates: highPotential.length };
  }

  private isQuietHours(chat: TelegramChatConfig): boolean {
    if (chat.policy.quietHoursStart === undefined) return false;
    if (chat.policy.quietHoursEnd === undefined) return false;

    const hour = new Date().getUTCHours();
    const start = chat.policy.quietHoursStart;
    const end = chat.policy.quietHoursEnd;

    if (start < end) {
      return hour >= start && hour < end;
    } else {
      return hour >= start || hour < end;
    }
  }

  start(): void {
    if (this.intervalId) {
      console.log("⚠️ Telegram autopost already running");
      return;
    }

    console.log("🚀 Starting Telegram Autopost Service...");
    console.log(`   ⏱️ Scan interval: ${this.config.intervalMs / 1000}s`);
    console.log(`   📊 Min score: ${this.config.minScore}`);
    console.log(`   🔑 Token: ${TELEGRAM_BOT_TOKEN ? "SET" : "MISSING"}`);

    this.config.enabled = true;
    this.intervalId = setInterval(
      () => this.scanAndNotify(),
      this.config.intervalMs
    );

    // Run immediately
    console.log("🔄 Running initial scan...");
    this.scanAndNotify();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config.enabled = false;
    console.log("⏹️ Telegram autopost stopped");
  }

  isRunning(): boolean {
    return this.config.enabled && this.intervalId !== null;
  }
}

// Singleton instance
let autopostInstance: TelegramAutopostService | null = null;

export function getTelegramAutopostService(): TelegramAutopostService {
  if (!autopostInstance) {
    autopostInstance = new TelegramAutopostService();
  }
  return autopostInstance;
}
