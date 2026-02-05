// BlueClaw - Telegram Message Formatter
// Caller-style messaging for Telegram (trencher vibes, not robotic)

import type { CallCard, GraduationCandidate } from "./types";
import type { TelegramChatConfig, InlineKeyboardRow, InlineButton } from "./telegram-types";

type VibeMode = "aggressive" | "neutral" | "cautious";

// Chain icons mapping
const CHAIN_ICONS: Record<string, string> = {
  solana: "◎",      // Solana logo-like circle
  ethereum: "Ξ",    // ETH symbol
  base: "🔵",       // Base blue
  bsc: "🟡",        // BSC yellow
  polygon: "🟣",    // Polygon purple
  arbitrum: "🔷",   // Arbitrum blue diamond
  avalanche: "🔺",  // Avalanche red triangle
  optimism: "🔴",   // Optimism red
  fantom: "👻",     // Fantom ghost
  sui: "💧",        // Sui water drop
  ton: "💎",        // TON diamond
};

// Get chain icon from chainId or pair data
export function getChainIcon(chainId?: string): string {
  if (!chainId) return "◎"; // Default to Solana
  const chain = chainId.toLowerCase();
  return CHAIN_ICONS[chain] || "🔗";
}

// Escape special characters for Telegram HTML (per OpenClaw spec: parse_mode: "HTML")
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Format number for display (compact)
function formatNum(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(0);
}

// Format price (handles very small decimals)
function formatPrice(price: number): string {
  if (price < 0.00001) return price.toExponential(2);
  if (price < 0.01) return price.toFixed(8);
  if (price < 1) return price.toFixed(4);
  return price.toFixed(2);
}

// Generate caller-style graduation message (aggressive vibe) - HTML format
export function formatGraduationCallAggressive(candidate: GraduationCandidate): string {
  const { graduation, pair, score } = candidate;
  const priceChange = pair.priceChange?.m5 || 0;
  const changeEmoji = priceChange > 0 ? "📈" : priceChange < 0 ? "📉" : "➡️";
  const symbol = escapeHtml(graduation.symbol);
  
  const lines = [
    `🔥 <b>FRESH GRAD</b> | <code>$${symbol}</code>`,
    ``,
    `${changeEmoji} <b>${formatPrice(parseFloat(pair.priceUsd))}</b> (${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}% 5m)`,
    `💰 MCap: <b>$${formatNum(pair.marketCap || 0)}</b>`,
    `💧 Liq: <b>$${formatNum(pair.liquidity?.usd || 0)}</b>`,
    `📊 Vol 5m: <b>$${formatNum(pair.volume?.m5 || 0)}</b>`,
    ``,
    `Score: <b>${score.toFixed(1)}/10</b>`,
    ``,
    `<code>${graduation.mint}</code>`,
  ];

  // Risk callouts (trencher style)
  const warnings: string[] = [];
  if ((pair.liquidity?.usd || 0) < 10000) warnings.push("low liq");
  if (priceChange < -10) warnings.push("dumping");
  if (warnings.length > 0) {
    lines.push(`⚠️ ${warnings.join(" | ")}`);
  }

  return lines.join("\n");
}

// Generate caller-style graduation message (neutral vibe) - HTML format
export function formatGraduationCallNeutral(candidate: GraduationCandidate): string {
  const { graduation, pair, score } = candidate;
  const priceChange = pair.priceChange?.m5 || 0;
  const symbol = escapeHtml(graduation.symbol);

  const lines = [
    `📊 <b>New Graduation</b> — $${symbol}`,
    ``,
    `Price: $${formatPrice(parseFloat(pair.priceUsd))} (${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%)`,
    `MCap: $${formatNum(pair.marketCap || 0)}`,
    `Liquidity: $${formatNum(pair.liquidity?.usd || 0)}`,
    `Volume 5m: $${formatNum(pair.volume?.m5 || 0)}`,
    ``,
    `Confidence: ${score.toFixed(1)}/10`,
    ``,
    `CA: <code>${graduation.mint}</code>`,
  ];

  return lines.join("\n");
}

// Generate caller-style graduation message (cautious vibe) - HTML format
export function formatGraduationCallCautious(candidate: GraduationCandidate): string {
  const { graduation, pair, score } = candidate;
  const priceChange = pair.priceChange?.m5 || 0;
  const symbol = escapeHtml(graduation.symbol);

  const lines = [
    `👀 <b>Watching</b> — $${symbol}`,
    ``,
    `Price: $${formatPrice(parseFloat(pair.priceUsd))}`,
    `5m Change: ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    `MCap: $${formatNum(pair.marketCap || 0)}`,
    `Liq: $${formatNum(pair.liquidity?.usd || 0)}`,
    ``,
    `Score: ${score.toFixed(1)}/10`,
  ];

  // Add extra warnings for cautious mode
  const risks: string[] = [];
  if ((pair.liquidity?.usd || 0) < 15000) risks.push("Liquidity below $15K");
  if (priceChange < -5) risks.push("Price declining");
  if (score < 7) risks.push("Score below 7");
  
  if (risks.length > 0) {
    lines.push(``);
    lines.push(`⚠️ <b>Risks:</b>`);
    risks.forEach(r => lines.push(`• ${r}`));
  }

  lines.push(``);
  lines.push(`<code>${graduation.mint}</code>`);

  return lines.join("\n");
}

// Main graduation formatter (picks vibe)
export function formatGraduationCall(
  candidate: GraduationCandidate,
  vibeMode: VibeMode = "neutral"
): string {
  switch (vibeMode) {
    case "aggressive":
      return formatGraduationCallAggressive(candidate);
    case "cautious":
      return formatGraduationCallCautious(candidate);
    default:
      return formatGraduationCallNeutral(candidate);
  }
}

// Format full CallCard for Telegram - HTML format
export function formatCallCardForTelegram(card: CallCard, vibeMode: VibeMode = "neutral"): string {
  const confidenceBar = "█".repeat(Math.round(card.confidence)) +
    "░".repeat(10 - Math.round(card.confidence));

  const riskIcons = { high: "🔴", medium: "🟡", low: "🟢" };
  const symbol = escapeHtml(card.token.symbol);

  let prefix = "";
  if (vibeMode === "aggressive") prefix = "🔥 ";
  if (vibeMode === "cautious") prefix = "👀 ";

  const lines = [
    `${prefix}<b>$${symbol}</b>`,
    `<code>${card.token.mint}</code>`,
    ``,
    `<b>Confidence:</b> ${confidenceBar} ${card.confidence}/10`,
    ``,
    `<b>Triggers:</b>`,
    ...card.triggers.slice(0, 3).map(t => `• ${escapeHtml(t)}`),
    ``,
    `<b>Metrics:</b>`,
    `• Price: $${formatPrice(card.metrics.price)} (${card.metrics.priceChange24h >= 0 ? "+" : ""}${card.metrics.priceChange24h.toFixed(1)}%)`,
    `• Vol 24h: $${formatNum(card.metrics.volume24h)}`,
    `• Liq: $${formatNum(card.metrics.liquidity)}`,
    `• Holders: ${card.metrics.holders}`,
  ];

  // Add risks
  if (card.risks.length > 0) {
    lines.push(``);
    lines.push(`<b>Risks:</b>`);
    card.risks.slice(0, 3).forEach(r => {
      lines.push(`${riskIcons[r.type]} ${escapeHtml(r.message)}`);
    });
  }

  lines.push(``);
  lines.push(`<i>${card.callId} | ${card.policy.name}</i>`);

  return lines.join("\n");
}

// Generate inline keyboard for call card
export function generateCallCardKeyboard(callId: string, mint: string): InlineKeyboardRow[] {
  return [
    [
      { text: "📊 DexScreener", callbackData: `dex:${mint}` },
      { text: "🔄 Refresh", callbackData: `refresh:${callId}` },
    ],
    [
      { text: "🔕 Mute 1h", callbackData: `mute:1h` },
      { text: "⚙️ Settings", callbackData: `settings` },
    ],
  ];
}

// Generate inline keyboard for signal card with 1-click access to key links
export function generateSignalKeyboard(
  mint: string,
  dexUrl: string,
  socials?: { type: string; url: string }[],
  websites?: { url: string }[]
): Array<Array<{ text: string; url?: string; callbackData?: string }>> {
  const keyboard: Array<Array<{ text: string; url?: string; callbackData?: string }>> = [];
  
  // Row 1: Primary actions - Copy CA button + PumpFun + DexScreener
  const row1: Array<{ text: string; url?: string; callbackData?: string }> = [];
  
  // PumpFun link (pump.fun/{mint})
  row1.push({ text: "🎰 Pump", url: `https://pump.fun/${mint}` });
  
  // DexScreener
  row1.push({ text: "📊 Dex", url: dexUrl });
  
  // Photon (trading)
  row1.push({ text: "⚡ Photon", url: `https://photon-sol.tinyastro.io/en/lp/${mint}` });
  
  keyboard.push(row1);
  
  // Row 2: Socials (if available)
  const row2: Array<{ text: string; url?: string; callbackData?: string }> = [];
  
  if (socials && socials.length > 0) {
    for (const social of socials.slice(0, 3)) {
      const icon = social.type === "twitter" ? "𝕏" : 
                   social.type === "telegram" ? "✈️" : 
                   social.type === "discord" ? "💬" : "🔗";
      const label = social.type === "twitter" ? "Twitter" :
                    social.type === "telegram" ? "TG" :
                    social.type === "discord" ? "Discord" : "Link";
      row2.push({ text: `${icon} ${label}`, url: social.url });
    }
  }
  
  // Add website if available and we have room
  if (websites && websites.length > 0 && row2.length < 3) {
    row2.push({ text: "🌐 Web", url: websites[0].url });
  }
  
  if (row2.length > 0) {
    keyboard.push(row2);
  }
  
  // Row 3: Birdeye + Solscan
  keyboard.push([
    { text: "🦅 Birdeye", url: `https://birdeye.so/token/${mint}?chain=solana` },
    { text: "🔍 Solscan", url: `https://solscan.io/token/${mint}` },
  ]);
  
  return keyboard;
}

// Compact signal card format - prioritizes quick info and 1-click access
export function formatCompactSignalCard(
  candidate: GraduationCandidate,
  vibeMode: VibeMode = "neutral"
): string {
  const { graduation, pair, score } = candidate;
  const priceChange = pair.priceChange?.m5 || 0;
  const symbol = escapeHtml(graduation.symbol);
  const mcapRaw = pair.marketCap || 0;
  const liqRaw = pair.liquidity?.usd || 0;
  const mcap = formatNum(mcapRaw);
  const liq = formatNum(liqRaw);
  const chainIcon = getChainIcon(pair.chainId);
  
  // Calculate liquidity ratio - critical for PumpFun tokens
  const liqRatio = mcapRaw > 0 ? ((liqRaw / mcapRaw) * 100) : 0;
  const liqRatioEmoji = liqRatio >= 15 ? "✅" : liqRatio >= 10 ? "⚠️" : "🚨";
  
  // Emoji based on score
  const scoreEmoji = score >= 8 ? "🔥" : score >= 7 ? "✨" : score >= 6 ? "👀" : "📊";
  const changeEmoji = priceChange > 10 ? "🚀" : priceChange > 0 ? "📈" : priceChange < -10 ? "📉" : "";
  
  // Compact format - all key info in minimal lines
  const lines = [
    `${scoreEmoji} ${chainIcon} <b>$${symbol}</b> ${changeEmoji}`,
    ``,
    `💰 $${mcap} MCap · 💧 $${liq} Liq`,
    `${liqRatioEmoji} Liq/MC: ${liqRatio.toFixed(1)}% · ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    `⭐ <b>${score.toFixed(1)}/10</b>`,
    ``,
    `<code>${graduation.mint}</code>`,
  ];
  
  return lines.join("\n");
}

// Generate inline keyboard for config
export function generateConfigKeyboard(chatId: string): InlineKeyboardRow[] {
  return [
    [
      { text: "📊 Set Risk Level", callbackData: `config:risk:${chatId}` },
      { text: "🔔 Autopost", callbackData: `config:autopost:${chatId}` },
    ],
    [
      { text: "📜 Policy", callbackData: `config:policy:${chatId}` },
      { text: "🔗 Chain", callbackData: `config:chain:${chatId}` },
    ],
    [
      { text: "❌ Close", callbackData: `close` },
    ],
  ];
}

// Generate policy selection keyboard
export function generatePolicyKeyboard(): InlineKeyboardRow[] {
  return [
    [
      { text: "🔥 Fresh Scanner", callbackData: "policy:fresh-scanner" },
      { text: "📈 Momentum", callbackData: "policy:momentum" },
    ],
    [
      { text: "📉 Dip Hunter", callbackData: "policy:dip-hunter" },
      { text: "🐋 Whale Follow", callbackData: "policy:whale-follow" },
    ],
    [
      { text: "👤 Deployer Rep", callbackData: "policy:deployer-reputation" },
      { text: "👥 Community", callbackData: "policy:community-strength" },
    ],
  ];
}

// Format status message - HTML format
export function formatStatusMessage(
  chatConfig: TelegramChatConfig,
  stats: { totalCalls: number; activeChats: number }
): string {
  const autopostStatus = chatConfig.policy.autopostEnabled ? "✅ ON" : "❌ OFF";
  
  return [
    `<b>BlueClaw Status</b>`,
    ``,
    `<b>This Chat:</b>`,
    `• Policy: ${chatConfig.policy.name}`,
    `• Autopost: ${autopostStatus}`,
    `• Min Score: ${chatConfig.display?.minScore || chatConfig.policy.thresholds.minConfidenceScore}/10`,
    `• Vibe: ${chatConfig.vibeMode}`,
    `• Calls Today: ${chatConfig.callCount}`,
    ``,
    `<b>Global:</b>`,
    `• Active Chats: ${stats.activeChats}`,
    `• Total Calls: ${stats.totalCalls}`,
    ``,
    `<i>Running • v1.0.0</i>`,
  ].join("\n");
}

// Format help message - HTML format
export function formatHelpMessage(): string {
  return [
    `<b>BlueClaw Commands</b>`,
    ``,
    `<b>🔍 Signal Analysis:</b>`,
    `/whale &lt;mint&gt; — Track whale activity`,
    `/holders &lt;mint&gt; — Holder distribution`,
    `/momentum &lt;mint&gt; — Price/volume momentum`,
    `/risk &lt;mint&gt; — Risk score breakdown`,
    ``,
    `<b>📊 Discovery:</b>`,
    `/fresh — Freshest graduations (15m)`,
    `/scan — Scan all graduations`,
    `/alpha — Get top signal`,
    ``,
    `<b>📋 Info:</b>`,
    `/signals — View recent signals`,
    `/lastcall — Show last call`,
    `/status — Bot status`,
    ``,
    `<b>⚙️ Admin:</b>`,
    `/config — Configure settings`,
    `/setrisk &lt;1-10&gt; — Set min score`,
    `/autopost — Toggle auto-posting`,
    `/policy — Change policy preset`,
    `/mute — Mute signals`,
    `/unmute — Unmute signals`,
    ``,
    `<i>BlueClaw • On-chain signals that work</i>`,
  ].join("\n");
}

// Format scan results (multiple graduations) - HTML format
export function formatScanResults(
  candidates: GraduationCandidate[],
  vibeMode: VibeMode = "neutral"
): string {
  if (candidates.length === 0) {
    const noResultsMsg = {
      aggressive: "dry rn, nothing hitting the scanner 🏜️",
      neutral: "No graduations found meeting criteria.",
      cautious: "Nothing passing filters at the moment. Waiting.",
    };
    return noResultsMsg[vibeMode];
  }

  const header = vibeMode === "aggressive" 
    ? `🎓 <b>${candidates.length} Fresh Grads</b>`
    : `📊 <b>${candidates.length} Graduation${candidates.length > 1 ? "s" : ""} Found</b>`;

  const lines = [header, ``];

  candidates.slice(0, 5).forEach((c, i) => {
    const mcapRaw = c.pair.marketCap || 0;
    const liqRaw = c.pair.liquidity?.usd || 0;
    const mcap = formatNum(mcapRaw);
    const liq = formatNum(liqRaw);
    const symbol = escapeHtml(c.graduation.symbol);
    const chainIcon = getChainIcon(c.pair.chainId);
    
    // Calculate liquidity ratio
    const liqRatio = mcapRaw > 0 ? ((liqRaw / mcapRaw) * 100) : 0;
    const liqEmoji = liqRatio >= 15 ? "✅" : liqRatio >= 10 ? "⚠️" : "🚨";
    
    lines.push(
      `<b>${i + 1}. ${chainIcon} $${symbol}</b> — ${c.score.toFixed(1)}/10`
    );
    lines.push(
      `   $${mcap} MC | $${liq} Liq | ${liqEmoji}${liqRatio.toFixed(0)}%`
    );
    lines.push(``);
  });

  if (candidates.length > 5) {
    lines.push(`<i>+${candidates.length - 5} more...</i>`);
  }

  return lines.join("\n");
}

// Convert signal keyboard to Telegram API format
export function signalKeyboardToTelegram(
  keyboard: Array<Array<{ text: string; url?: string; callbackData?: string }>>
): Array<Array<{ text: string; url?: string; callback_data?: string }>> {
  return keyboard.map(row => 
    row.map(btn => ({
      text: btn.text,
      ...(btn.url ? { url: btn.url } : {}),
      ...(btn.callbackData ? { callback_data: btn.callbackData } : {}),
    }))
  );
}

// Generate clickable ticker buttons for scan results
export function generateTickerKeyboard(
  candidates: GraduationCandidate[]
): InlineKeyboardRow[] {
  const keyboard: InlineKeyboardRow[] = [];
  const tokens = candidates.slice(0, 5);
  
  // Create rows of 2 buttons each
  for (let i = 0; i < tokens.length; i += 2) {
    const row: InlineButton[] = [];
    for (let j = i; j < Math.min(i + 2, tokens.length); j++) {
      const c = tokens[j];
      row.push({
        text: `${j + 1}. $${c.graduation.symbol}`,
        callbackData: `ticker:${c.graduation.mint}`,
      });
    }
    keyboard.push(row);
  }
  
  return keyboard;
}

// Format detailed token card with image caption
export function formatDetailedTokenCard(
  candidate: GraduationCandidate,
  vibeMode: VibeMode = "neutral"
): string {
  const { graduation, pair, score, metrics } = candidate;
  const priceChange = pair.priceChange?.m5 || 0;
  const symbol = escapeHtml(graduation.symbol);
  const mcapRaw = pair.marketCap || 0;
  const liqRaw = pair.liquidity?.usd || 0;
  const mcap = formatNum(mcapRaw);
  const liq = formatNum(liqRaw);
  const vol5m = formatNum(pair.volume?.m5 || 0);
  const vol1h = formatNum(pair.volume?.h1 || 0);
  const chainIcon = getChainIcon(pair.chainId);
  
  // Calculate liquidity ratio
  const liqRatio = mcapRaw > 0 ? ((liqRaw / mcapRaw) * 100) : 0;
  const liqRatioEmoji = liqRatio >= 15 ? "✅" : liqRatio >= 10 ? "⚠️" : "🚨";
  
  // Buy/sell info
  const buys = pair.txns?.m5?.buys || 0;
  const sells = pair.txns?.m5?.sells || 0;
  const buySellRatio = sells > 0 ? (buys / sells).toFixed(2) : "∞";
  
  // Score emoji
  const scoreEmoji = score >= 8 ? "🔥" : score >= 7 ? "✨" : score >= 6 ? "👀" : "📊";
  const changeEmoji = priceChange > 10 ? "🚀" : priceChange > 0 ? "📈" : priceChange < -10 ? "📉" : "";
  
  const lines = [
    `${scoreEmoji} ${chainIcon} <b>$${symbol}</b> ${changeEmoji}`,
    ``,
    `💰 <b>$${mcap}</b> MCap · 💧 <b>$${liq}</b> Liq`,
    `${liqRatioEmoji} Liq/MC: <b>${liqRatio.toFixed(1)}%</b>`,
    `📊 5m: ${priceChange > 0 ? "+" : ""}${priceChange.toFixed(1)}%`,
    ``,
    `📈 Vol 5m: $${vol5m} · 1h: $${vol1h}`,
    `🔄 Buys/Sells: ${buys}/${sells} (${buySellRatio}x)`,
    `👥 Holders: ${metrics?.holders || "?"}`,
    ``,
    `⭐ <b>Score: ${score.toFixed(1)}/10</b>`,
    ``,
    `<code>${graduation.mint}</code>`,
  ];
  
  return lines.join("\n");
}
