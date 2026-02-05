// BlueClaw - Telegram Types
// Transport-layer adaptation for Telegram (mirrors Discord types)

import type { Policy, WatchlistItem, DisplaySettings, CallCard } from "./types";

// DM Policy (per OpenClaw spec)
export type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

// Group Policy (per OpenClaw spec)
export type GroupPolicy = "open" | "allowlist" | "disabled";

// Telegram Channel Config (aligns with OpenClaw channels.telegram)
export interface TelegramChannelConfig {
  enabled: boolean;
  botToken?: string;
  dmPolicy: DmPolicy;
  allowFrom: string[]; // DM allowlist (user IDs or @usernames)
  groupPolicy: GroupPolicy;
  groupAllowFrom: string[]; // Group sender allowlist
  textChunkLimit: number; // Default 4000
  linkPreview: boolean;
  capabilities: {
    inlineButtons: "off" | "dm" | "group" | "all" | "allowlist";
  };
}

// Telegram Chat Config (equivalent to GuildConfig for Discord)
export interface TelegramChatConfig {
  chatId: string; // Telegram chat/group ID (equivalent to guildId)
  chatTitle: string; // Group name
  chatType: "private" | "group" | "supergroup" | "channel";
  isForum?: boolean; // Forum supergroup with topics
  policy: Policy;
  watchlist: WatchlistItem[];
  adminUsers: string[]; // Telegram user IDs
  allowFrom?: string[]; // Per-group sender allowlist override
  requireMention: boolean; // Require @mention to respond
  createdAt: Date;
  updatedAt: Date;
  callCount: number;
  lastCallAt?: Date;
  display?: DisplaySettings;
  // Telegram-specific
  topicId?: number; // For forum/topic support in supergroups
  vibeMode: "aggressive" | "neutral" | "cautious";
  // Topic configs (for forum supergroups)
  topics?: Record<string, TopicConfig>;
}

// Topic configuration for forum supergroups
export interface TopicConfig {
  threadId: number;
  name?: string;
  enabled: boolean;
  requireMention?: boolean;
  allowFrom?: string[];
}

// Telegram Command Context
export interface TelegramCommandContext {
  chatId: string;
  userId: string;
  username?: string;
  firstName?: string;
  messageId: number;
  isAdmin: boolean;
  isCreator: boolean;
  args: string[];
  replyToMessageId?: number;
}

// Telegram Inline Keyboard Button
export interface InlineButton {
  text: string;
  callbackData: string;
}

// Telegram Keyboard Row
export type InlineKeyboardRow = InlineButton[];

// Telegram Message Options
export interface TelegramMessageOptions {
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  disableWebPagePreview?: boolean;
  disableNotification?: boolean;
  replyToMessageId?: number;
  inlineKeyboard?: InlineKeyboardRow[];
}

// Callback Query Data Structure
export interface CallbackQueryData {
  action: string;
  chatId: string;
  payload?: string;
  userId?: string;
}

// Command definitions for Telegram
export type TelegramCommand =
  | "start"
  | "help"
  | "alpha"
  | "scan"
  | "signals"
  | "lastcall"
  | "setrisk"
  | "config"
  | "status"
  | "autopost"
  | "setchannel"
  | "policy"
  | "mute"
  | "unmute"
  | "whale"
  | "holders"
  | "fresh"
  | "momentum"
  | "risk";

// Command Metadata
export interface CommandMetadata {
  command: TelegramCommand;
  description: string;
  adminOnly: boolean;
}

// All BlueClaw commands
export const BLUECLAW_COMMANDS: CommandMetadata[] = [
  { command: "start", description: "Initialize BlueClaw in this chat", adminOnly: false },
  { command: "help", description: "Show available commands", adminOnly: false },
  { command: "alpha", description: "Get latest alpha signal", adminOnly: false },
  { command: "scan", description: "Scan for new PumpFun graduations", adminOnly: false },
  { command: "whale", description: "Track whale activity for a token", adminOnly: false },
  { command: "holders", description: "Analyze holder distribution", adminOnly: false },
  { command: "fresh", description: "View freshest graduations (15m)", adminOnly: false },
  { command: "momentum", description: "Check volume/price momentum", adminOnly: false },
  { command: "risk", description: "Get risk score breakdown", adminOnly: false },
  { command: "signals", description: "View recent signals", adminOnly: false },
  { command: "lastcall", description: "Show the last call made", adminOnly: false },
  { command: "setrisk", description: "Set risk level (1-10)", adminOnly: true },
  { command: "config", description: "View/edit configuration", adminOnly: true },
  { command: "status", description: "Check bot status and stats", adminOnly: false },
  { command: "autopost", description: "Toggle automatic posting", adminOnly: true },
  { command: "policy", description: "View or change policy preset", adminOnly: true },
  { command: "mute", description: "Mute signals for this chat", adminOnly: true },
  { command: "unmute", description: "Unmute signals", adminOnly: true },
];

// Vibe Mode Messages (caller personality)
export const VIBE_MESSAGES = {
  aggressive: {
    signalPrefix: "🔥 SENDING IT",
    callPrefix: "FRESH GRAD JUST HIT",
    riskWarning: "high risk high reward szn",
    noSignals: "dry rn, scanning...",
  },
  neutral: {
    signalPrefix: "📊 Signal",
    callPrefix: "New graduation detected",
    riskWarning: "DYOR - check the metrics",
    noSignals: "No signals at the moment",
  },
  cautious: {
    signalPrefix: "👀 Watching",
    callPrefix: "Graduation spotted - proceed carefully",
    riskWarning: "Multiple risk flags - be careful",
    noSignals: "Nothing meeting criteria right now",
  },
} as const;

// Rate limiting config per chat
export interface RateLimitConfig {
  maxCallsPerHour: number;
  maxCallsPerDay: number;
  cooldownSeconds: number;
}

export const DEFAULT_RATE_LIMITS: RateLimitConfig = {
  maxCallsPerHour: 10,
  maxCallsPerDay: 50,
  cooldownSeconds: 60,
};

// Telegram Call Log (extends base CallLog concept)
export interface TelegramCallLog {
  id: string;
  chatId: string;
  callCard: CallCard;
  triggeredBy: "manual" | "auto" | "reply";
  userId?: string;
  messageId?: number;
  createdAt: Date;
}

// Platform type for unified storage
export type Platform = "discord" | "telegram";

// Unified config wrapper for multi-platform support
export interface PlatformConfig {
  platform: Platform;
  platformId: string; // guildId for Discord, chatId for Telegram
  config: TelegramChatConfig;
}
