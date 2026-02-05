// BlueClaw - Telegram Storage Adapter
// Extends existing storage to support Telegram chat configs

import { createClient } from "@supabase/supabase-js";
import type { Policy, WatchlistItem, DisplaySettings, CallCard } from "./types";
import type { TelegramChatConfig, TelegramCallLog, RateLimitConfig, DEFAULT_RATE_LIMITS } from "./telegram-types";
import { createPolicy } from "./policies";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null;

// Default display settings
const DEFAULT_DISPLAY: DisplaySettings = {
  minScore: 6.5,
  showVolume: true,
  showHolders: true,
  showLinks: true,
};

// Telegram chat settings row (database schema)
type TelegramChatRow = {
  chat_id: string;
  chat_title: string | null;
  chat_type: string | null;
  topic_id: number | null;
  policy_preset: string | null;
  policy: Policy | null;
  watchlist: WatchlistItem[] | null;
  admin_users: string[] | null;
  call_count: number | null;
  last_call_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  autopost: boolean | null;
  min_score: number | null;
  show_volume: boolean | null;
  show_holders: boolean | null;
  show_links: boolean | null;
  vibe_mode: string | null;
  muted_until: string | null;
};

// Telegram call history row
type TelegramCallRow = {
  id: string;
  chat_id: string;
  call_id: string | null;
  call_card: CallCard | null;
  triggered_by: string | null;
  user_id: string | null;
  token_address: string;
  token_symbol: string | null;
  score: number | null;
  market_cap: number | null;
  liquidity: number | null;
  message_id: number | null;
  posted_at: string | null;
};

function parseDate(value?: string | Date | null): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function mapChatRow(row: TelegramChatRow): TelegramChatConfig {
  const policy = row.policy || createPolicy(row.chat_id, "momentum");
  
  return {
    chatId: row.chat_id,
    chatTitle: row.chat_title || "Unknown Chat",
    chatType: (row.chat_type as TelegramChatConfig["chatType"]) || "group",
    topicId: row.topic_id || undefined,
    policy: {
      ...policy,
      autopostEnabled: row.autopost ?? policy.autopostEnabled,
    },
    watchlist: Array.isArray(row.watchlist) ? row.watchlist : [],
    adminUsers: Array.isArray(row.admin_users) ? row.admin_users : [],
    requireMention: true, // Per OpenClaw spec: require @mention in groups by default
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
    callCount: parseNumber(row.call_count, 0),
    lastCallAt: row.last_call_at ? parseDate(row.last_call_at) : undefined,
    display: {
      minScore: parseNumber(row.min_score, policy.thresholds.minConfidenceScore),
      showVolume: row.show_volume ?? DEFAULT_DISPLAY.showVolume,
      showHolders: row.show_holders ?? DEFAULT_DISPLAY.showHolders,
      showLinks: row.show_links ?? DEFAULT_DISPLAY.showLinks,
    },
    vibeMode: (row.vibe_mode as TelegramChatConfig["vibeMode"]) || "neutral",
  };
}

export interface TelegramStorage {
  getChatConfig(chatId: string): Promise<TelegramChatConfig | null>;
  saveChatConfig(config: TelegramChatConfig): Promise<void>;
  deleteChatConfig(chatId: string): Promise<void>;
  addCallLog(chatId: string, log: TelegramCallLog): Promise<void>;
  getCallLogs(chatId: string, limit?: number): Promise<TelegramCallLog[]>;
  getAllChats(): Promise<TelegramChatConfig[]>;
  getActiveChats(): Promise<TelegramChatConfig[]>;
  getStats(): Promise<{ totalChats: number; totalCalls: number; activeChats: number }>;
}

// In-memory storage for development
class InMemoryTelegramStorage implements TelegramStorage {
  private chats: Map<string, TelegramChatConfig> = new Map();
  private callLogs: Map<string, TelegramCallLog[]> = new Map();

  async getChatConfig(chatId: string): Promise<TelegramChatConfig | null> {
    return this.chats.get(chatId) || null;
  }

  async saveChatConfig(config: TelegramChatConfig): Promise<void> {
    this.chats.set(config.chatId, { ...config, updatedAt: new Date() });
  }

  async deleteChatConfig(chatId: string): Promise<void> {
    this.chats.delete(chatId);
    this.callLogs.delete(chatId);
  }

  async addCallLog(chatId: string, log: TelegramCallLog): Promise<void> {
    const logs = this.callLogs.get(chatId) || [];
    logs.unshift(log);
    if (logs.length > 100) logs.pop();
    this.callLogs.set(chatId, logs);
  }

  async getCallLogs(chatId: string, limit = 20): Promise<TelegramCallLog[]> {
    const logs = this.callLogs.get(chatId) || [];
    return logs.slice(0, limit);
  }

  async getAllChats(): Promise<TelegramChatConfig[]> {
    return Array.from(this.chats.values());
  }

  async getActiveChats(): Promise<TelegramChatConfig[]> {
    return Array.from(this.chats.values()).filter(c => c.policy.autopostEnabled);
  }

  async getStats(): Promise<{ totalChats: number; totalCalls: number; activeChats: number }> {
    const chats = Array.from(this.chats.values());
    const totalCalls = Array.from(this.callLogs.values()).reduce((sum, logs) => sum + logs.length, 0);
    return {
      totalChats: chats.length,
      totalCalls,
      activeChats: chats.filter(c => c.policy.autopostEnabled).length,
    };
  }
}

// Supabase storage for production
class SupabaseTelegramStorage implements TelegramStorage {
  async getChatConfig(chatId: string): Promise<TelegramChatConfig | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("telegram_chats")
      .select("*")
      .eq("chat_id", chatId)
      .single();

    if (!data || error) {
      if (error && error.code !== "PGRST116") {
        console.error("Supabase telegram chat lookup failed:", error);
      }
      return null;
    }

    return mapChatRow(data as TelegramChatRow);
  }

  async saveChatConfig(config: TelegramChatConfig): Promise<void> {
    if (!supabase) return;

    const payload = {
      chat_id: config.chatId,
      chat_title: config.chatTitle,
      chat_type: config.chatType,
      topic_id: config.topicId || null,
      policy_preset: config.policy.preset,
      policy: config.policy,
      watchlist: config.watchlist,
      admin_users: config.adminUsers,
      call_count: config.callCount,
      last_call_at: config.lastCallAt?.toISOString() || null,
      autopost: config.policy.autopostEnabled,
      min_score: config.display?.minScore || config.policy.thresholds.minConfidenceScore,
      show_volume: config.display?.showVolume ?? true,
      show_holders: config.display?.showHolders ?? true,
      show_links: config.display?.showLinks ?? true,
      vibe_mode: config.vibeMode,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("telegram_chats")
      .upsert(payload, { onConflict: "chat_id" });

    if (error) {
      console.error("Supabase telegram chat upsert failed:", error);
    }
  }

  async deleteChatConfig(chatId: string): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from("telegram_chats")
      .delete()
      .eq("chat_id", chatId);

    if (error) {
      console.error("Supabase telegram chat delete failed:", error);
    }
  }

  async addCallLog(chatId: string, log: TelegramCallLog): Promise<void> {
    if (!supabase) return;

    const { error } = await supabase
      .from("telegram_call_history")
      .insert({
        chat_id: chatId,
        call_id: log.id,
        call_card: log.callCard,
        triggered_by: log.triggeredBy,
        user_id: log.userId || null,
        token_address: log.callCard.token.mint,
        token_symbol: log.callCard.token.symbol,
        score: log.callCard.confidence,
        liquidity: log.callCard.metrics.liquidity,
        message_id: log.messageId || null,
        posted_at: log.createdAt.toISOString(),
      });

    if (error) {
      console.error("Supabase telegram call log insert failed:", error);
    }
  }

  async getCallLogs(chatId: string, limit = 20): Promise<TelegramCallLog[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("telegram_call_history")
      .select("*")
      .eq("chat_id", chatId)
      .order("posted_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase telegram call log lookup failed:", error);
      return [];
    }

    return (data || []).map((row: TelegramCallRow) => ({
      id: row.call_id || row.id,
      chatId: row.chat_id,
      callCard: row.call_card!,
      triggeredBy: (row.triggered_by || "manual") as TelegramCallLog["triggeredBy"],
      userId: row.user_id || undefined,
      messageId: row.message_id || undefined,
      createdAt: row.posted_at ? parseDate(row.posted_at) : new Date(),
    }));
  }

  async getAllChats(): Promise<TelegramChatConfig[]> {
    if (!supabase) return [];

    const { data, error } = await supabase.from("telegram_chats").select("*");

    if (error) {
      console.error("Supabase telegram chat list failed:", error);
      return [];
    }

    return (data || []).map((row: TelegramChatRow) => mapChatRow(row));
  }

  async getActiveChats(): Promise<TelegramChatConfig[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("telegram_chats")
      .select("*")
      .eq("autopost", true);

    if (error) {
      console.error("Supabase active chats lookup failed:", error);
      return [];
    }

    return (data || []).map((row: TelegramChatRow) => mapChatRow(row));
  }

  async getStats(): Promise<{ totalChats: number; totalCalls: number; activeChats: number }> {
    if (!supabase) return { totalChats: 0, totalCalls: 0, activeChats: 0 };

    const [chatCount, callCount, activeCount] = await Promise.all([
      supabase.from("telegram_chats").select("chat_id", { count: "exact", head: true }),
      supabase.from("telegram_call_history").select("id", { count: "exact", head: true }),
      supabase.from("telegram_chats").select("chat_id", { count: "exact", head: true }).eq("autopost", true),
    ]);

    return {
      totalChats: chatCount.count || 0,
      totalCalls: callCount.count || 0,
      activeChats: activeCount.count || 0,
    };
  }
}

// Singleton instance
let telegramStorageInstance: TelegramStorage | null = null;

export function getTelegramStorage(): TelegramStorage {
  if (!telegramStorageInstance) {
    telegramStorageInstance = supabase ? new SupabaseTelegramStorage() : new InMemoryTelegramStorage();
  }
  return telegramStorageInstance;
}

// Helper: Get or create chat config
export async function getOrCreateChatConfig(options: {
  chatId: string;
  chatTitle?: string;
  chatType?: TelegramChatConfig["chatType"];
  userId?: string;
}): Promise<TelegramChatConfig> {
  const storage = getTelegramStorage();
  const existing = await storage.getChatConfig(options.chatId);

  if (existing) {
    return existing;
  }

  const config: TelegramChatConfig = {
    chatId: options.chatId,
    chatTitle: options.chatTitle || "Telegram Chat",
    chatType: options.chatType || "group",
    policy: createPolicy(options.chatId, "momentum"),
    watchlist: [],
    adminUsers: options.userId ? [options.userId] : [],
    requireMention: true, // Per OpenClaw spec: require @mention in groups by default
    createdAt: new Date(),
    updatedAt: new Date(),
    callCount: 0,
    display: {
      minScore: 6.5,
      showVolume: true,
      showHolders: true,
      showLinks: true,
    },
    vibeMode: "neutral",
  };

  await storage.saveChatConfig(config);
  return config;
}
