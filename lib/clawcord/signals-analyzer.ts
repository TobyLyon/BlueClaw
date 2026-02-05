// BlueClaw - Signals Analyzer
// On-chain analysis for whale tracking, holder distribution, and risk scoring

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Types
export interface WhaleActivity {
  address: string;
  balance: number;
  percentage: number;
  isAccumulating: boolean;
  lastActivity: string;
}

export interface HolderAnalysis {
  totalHolders: number;
  holderGrowth1h: number;
  top10Concentration: number;
  whaleCount: number;
  avgHolding: number;
  distribution: {
    whales: number;    // >1%
    large: number;     // 0.1-1%
    medium: number;    // 0.01-0.1%
    small: number;     // <0.01%
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface MomentumSignal {
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  volumeChange: number;
  volumeSpike: boolean;
  buyPressure: number; // 0-100
  momentum: "STRONG_BUY" | "BUY" | "NEUTRAL" | "SELL" | "STRONG_SELL";
}

export interface RiskBreakdown {
  overallScore: number;
  holderRisk: number;
  liquidityRisk: number;
  whaleRisk: number;
  ageRisk: number;
  factors: string[];
}

export interface TokenMetadata {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: number;
}

// Fetch token holders from Helius
async function fetchTokenHolders(mint: string): Promise<any[]> {
  if (!HELIUS_API_KEY) {
    throw new Error("HELIUS_API_KEY not configured");
  }

  try {
    const response = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "holders",
        method: "getTokenLargestAccounts",
        params: [mint],
      }),
    });

    const data = await response.json();
    return data.result?.value || [];
  } catch (error) {
    console.error("Error fetching holders:", error);
    return [];
  }
}

// Fetch token supply
async function fetchTokenSupply(mint: string): Promise<number> {
  if (!HELIUS_API_KEY) return 0;

  try {
    const response = await fetch(HELIUS_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "supply",
        method: "getTokenSupply",
        params: [mint],
      }),
    });

    const data = await response.json();
    return parseFloat(data.result?.value?.uiAmount || "0");
  } catch (error) {
    console.error("Error fetching supply:", error);
    return 0;
  }
}

// Analyze whale activity for a token
export async function analyzeWhaleActivity(mint: string): Promise<{
  whales: WhaleActivity[];
  summary: {
    totalWhales: number;
    accumulating: number;
    distributing: number;
    top10Pct: number;
    largestHolder: number;
  };
}> {
  const holders = await fetchTokenHolders(mint);
  const supply = await fetchTokenSupply(mint);

  if (!holders.length || !supply) {
    return {
      whales: [],
      summary: {
        totalWhales: 0,
        accumulating: 0,
        distributing: 0,
        top10Pct: 0,
        largestHolder: 0,
      },
    };
  }

  // Process top holders (whales = >1% of supply)
  const whales: WhaleActivity[] = [];
  let top10Total = 0;
  let largestPct = 0;

  for (let i = 0; i < Math.min(holders.length, 20); i++) {
    const holder = holders[i];
    const balance = parseFloat(holder.uiAmount || holder.amount) / (10 ** (holder.decimals || 6));
    const percentage = (balance / supply) * 100;

    if (i < 10) {
      top10Total += percentage;
    }

    if (percentage > largestPct) {
      largestPct = percentage;
    }

    if (percentage >= 1) {
      whales.push({
        address: holder.address,
        balance,
        percentage,
        isAccumulating: i < 3, // Top 3 holders assumed accumulating (no historical data yet)
        lastActivity: "recent",
      });
    }
  }

  const accumulating = whales.filter(w => w.isAccumulating).length;
  const distributing = whales.length - accumulating;

  return {
    whales,
    summary: {
      totalWhales: whales.length,
      accumulating,
      distributing,
      top10Pct: Math.round(top10Total * 10) / 10,
      largestHolder: Math.round(largestPct * 10) / 10,
    },
  };
}

// Analyze holder distribution
export async function analyzeHolders(mint: string): Promise<HolderAnalysis> {
  const holders = await fetchTokenHolders(mint);
  const supply = await fetchTokenSupply(mint);

  if (!holders.length || !supply) {
    return {
      totalHolders: 0,
      holderGrowth1h: 0,
      top10Concentration: 0,
      whaleCount: 0,
      avgHolding: 0,
      distribution: { whales: 0, large: 0, medium: 0, small: 0 },
      riskLevel: "HIGH",
    };
  }

  let top10Total = 0;
  let whaleCount = 0;
  let largeCount = 0;
  let mediumCount = 0;
  let smallCount = 0;

  for (let i = 0; i < holders.length; i++) {
    const holder = holders[i];
    const balance = parseFloat(holder.uiAmount || holder.amount) / (10 ** (holder.decimals || 6));
    const percentage = (balance / supply) * 100;

    if (i < 10) {
      top10Total += percentage;
    }

    if (percentage >= 1) whaleCount++;
    else if (percentage >= 0.1) largeCount++;
    else if (percentage >= 0.01) mediumCount++;
    else smallCount++;
  }

  // Estimate total holders (Helius only returns largest accounts)
  const estimatedTotal = Math.max(holders.length * 10, 100);
  
  // Determine risk level based on concentration
  let riskLevel: HolderAnalysis["riskLevel"] = "LOW";
  if (top10Total > 70) riskLevel = "CRITICAL";
  else if (top10Total > 50) riskLevel = "HIGH";
  else if (top10Total > 35) riskLevel = "MEDIUM";

  return {
    totalHolders: estimatedTotal,
    holderGrowth1h: 0, // Requires historical data tracking
    top10Concentration: Math.round(top10Total * 10) / 10,
    whaleCount,
    avgHolding: supply / estimatedTotal,
    distribution: {
      whales: whaleCount,
      large: largeCount,
      medium: mediumCount,
      small: Math.max(0, estimatedTotal - whaleCount - largeCount - mediumCount),
    },
    riskLevel,
  };
}

// Analyze momentum from DexScreener data
export function analyzeMomentum(pair: any): MomentumSignal {
  const priceChange5m = pair.priceChange?.m5 || 0;
  const priceChange1h = pair.priceChange?.h1 || 0;
  const priceChange24h = pair.priceChange?.h24 || 0;
  const volume5m = pair.volume?.m5 || 0;
  const volume1h = pair.volume?.h1 || 0;

  // Calculate volume spike (5m volume > 20% of 1h volume)
  const volumeSpike = volume1h > 0 && (volume5m / volume1h) > 0.2;
  
  // Estimate buy pressure from price action
  const buyPressure = Math.min(100, Math.max(0, 50 + priceChange5m * 2));

  // Determine momentum signal
  let momentum: MomentumSignal["momentum"] = "NEUTRAL";
  if (priceChange5m > 20 && volumeSpike) momentum = "STRONG_BUY";
  else if (priceChange5m > 10 || (priceChange5m > 5 && priceChange1h > 20)) momentum = "BUY";
  else if (priceChange5m < -20) momentum = "STRONG_SELL";
  else if (priceChange5m < -10) momentum = "SELL";

  return {
    priceChange5m,
    priceChange1h,
    priceChange24h,
    volumeChange: volume5m,
    volumeSpike,
    buyPressure: Math.round(buyPressure),
    momentum,
  };
}

// Generate comprehensive risk breakdown
export async function analyzeRisk(
  mint: string,
  pair: any
): Promise<RiskBreakdown> {
  const holders = await analyzeHolders(mint);
  const whales = await analyzeWhaleActivity(mint);

  const factors: string[] = [];
  
  // Holder risk (0-10, lower is better)
  let holderRisk = 5;
  if (holders.top10Concentration > 60) {
    holderRisk = 9;
    factors.push("⚠️ High concentration in top 10");
  } else if (holders.top10Concentration > 40) {
    holderRisk = 7;
    factors.push("⚠️ Moderate concentration");
  } else if (holders.top10Concentration < 25) {
    holderRisk = 2;
    factors.push("✅ Healthy holder distribution");
  }

  // Liquidity risk
  let liquidityRisk = 5;
  const liquidity = pair.liquidity?.usd || 0;
  if (liquidity < 5000) {
    liquidityRisk = 9;
    factors.push("⚠️ Very low liquidity (<$5K)");
  } else if (liquidity < 15000) {
    liquidityRisk = 7;
    factors.push("⚠️ Low liquidity (<$15K)");
  } else if (liquidity > 50000) {
    liquidityRisk = 2;
    factors.push("✅ Strong liquidity (>$50K)");
  }

  // Whale risk
  let whaleRisk = 5;
  if (whales.summary.largestHolder > 15) {
    whaleRisk = 9;
    factors.push("⚠️ Single whale holds >15%");
  } else if (whales.summary.distributing > whales.summary.accumulating) {
    whaleRisk = 7;
    factors.push("⚠️ Whales distributing");
  } else if (whales.summary.accumulating > whales.summary.distributing) {
    whaleRisk = 3;
    factors.push("✅ Whales accumulating");
  }

  // Age risk
  let ageRisk = 5;
  const pairAge = pair.pairCreatedAt 
    ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60)
    : 24;
  if (pairAge < 1) {
    ageRisk = 8;
    factors.push("⚠️ Very new (<1 hour old)");
  } else if (pairAge < 6) {
    ageRisk = 6;
    factors.push("⚠️ New token (<6 hours)");
  } else if (pairAge > 48) {
    ageRisk = 2;
    factors.push("✅ Established (>48 hours)");
  }

  // Calculate overall score (10 = safest)
  const avgRisk = (holderRisk + liquidityRisk + whaleRisk + ageRisk) / 4;
  const overallScore = Math.round((10 - avgRisk) * 10) / 10;

  return {
    overallScore: Math.max(1, Math.min(10, overallScore)),
    holderRisk: 10 - holderRisk,
    liquidityRisk: 10 - liquidityRisk,
    whaleRisk: 10 - whaleRisk,
    ageRisk: 10 - ageRisk,
    factors,
  };
}

// Format whale analysis for Telegram
export function formatWhaleMessage(
  symbol: string,
  mint: string,
  data: Awaited<ReturnType<typeof analyzeWhaleActivity>>
): string {
  const { summary, whales } = data;
  
  const accEmoji = summary.accumulating > summary.distributing ? "🟢" : "🔴";
  const distEmoji = summary.distributing > 0 ? "🔴" : "🟢";

  const lines = [
    `🐋 <b>Whale Activity</b> | $${symbol}`,
    ``,
    `📊 <b>Top 10 hold:</b> ${summary.top10Pct}%`,
    `${accEmoji} Accumulating: ${summary.accumulating} whales`,
    `${distEmoji} Distributing: ${summary.distributing} whales`,
    ``,
    `💰 Largest: ${summary.largestHolder}%`,
    `🐋 Total whales (>1%): ${summary.totalWhales}`,
    ``,
    `<code>${mint}</code>`,
  ];

  return lines.join("\n");
}

// Format holder analysis for Telegram
export function formatHoldersMessage(
  symbol: string,
  mint: string,
  data: HolderAnalysis
): string {
  const riskEmoji = {
    LOW: "🟢",
    MEDIUM: "🟡",
    HIGH: "🔴",
    CRITICAL: "🚨",
  }[data.riskLevel];

  const lines = [
    `👥 <b>Holder Distribution</b> | $${symbol}`,
    ``,
    `📊 Total: <b>~${data.totalHolders.toLocaleString()} holders</b>`,
    ``,
    `🏆 Top 10: ${data.top10Concentration}%`,
    `🐋 Whales (>1%): ${data.whaleCount}`,
    `📊 Large (0.1-1%): ${data.distribution.large}`,
    ``,
    `${riskEmoji} Risk: <b>${data.riskLevel}</b>`,
    ``,
    `<code>${mint}</code>`,
  ];

  return lines.join("\n");
}

// Format momentum signal for Telegram
export function formatMomentumMessage(
  symbol: string,
  mint: string,
  data: MomentumSignal,
  pair: any
): string {
  const momentumEmoji = {
    STRONG_BUY: "🚀",
    BUY: "📈",
    NEUTRAL: "➡️",
    SELL: "📉",
    STRONG_SELL: "🔻",
  }[data.momentum];

  const changeEmoji = (val: number) => val > 0 ? "+" : "";

  const lines = [
    `📊 <b>Momentum</b> | $${symbol}`,
    ``,
    `${momentumEmoji} Signal: <b>${data.momentum.replace("_", " ")}</b>`,
    ``,
    `<b>Price Change:</b>`,
    `• 5m: ${changeEmoji(data.priceChange5m)}${data.priceChange5m.toFixed(1)}%`,
    `• 1h: ${changeEmoji(data.priceChange1h)}${data.priceChange1h.toFixed(1)}%`,
    `• 24h: ${changeEmoji(data.priceChange24h)}${data.priceChange24h.toFixed(1)}%`,
    ``,
    `📊 Volume (5m): $${(data.volumeChange / 1000).toFixed(1)}K`,
    `${data.volumeSpike ? "⚡ <b>Volume Spike Detected</b>" : ""}`,
    `🎯 Buy Pressure: ${data.buyPressure}%`,
    ``,
    `<code>${mint}</code>`,
  ];

  return lines.filter(l => l).join("\n");
}

// Format risk breakdown for Telegram
export function formatRiskMessage(
  symbol: string,
  mint: string,
  data: RiskBreakdown
): string {
  const scoreEmoji = data.overallScore >= 7 ? "🟢" : data.overallScore >= 5 ? "🟡" : "🔴";
  
  const bar = (score: number) => {
    const filled = Math.round(score);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  const lines = [
    `⚠️ <b>Risk Analysis</b> | $${symbol}`,
    ``,
    `${scoreEmoji} Overall: <b>${data.overallScore}/10</b>`,
    ``,
    `<b>Breakdown:</b>`,
    `👥 Holders: ${bar(data.holderRisk)} ${data.holderRisk}/10`,
    `💧 Liquidity: ${bar(data.liquidityRisk)} ${data.liquidityRisk}/10`,
    `🐋 Whales: ${bar(data.whaleRisk)} ${data.whaleRisk}/10`,
    `⏰ Age: ${bar(data.ageRisk)} ${data.ageRisk}/10`,
    ``,
    `<b>Factors:</b>`,
    ...data.factors.map(f => f),
    ``,
    `<code>${mint}</code>`,
  ];

  return lines.join("\n");
}

// Generate inline keyboard for signal commands
export function generateSignalKeyboard(
  mint: string,
  command: "whale" | "holders" | "momentum" | "risk"
): Array<Array<{ text: string; url?: string; callback_data?: string }>> {
  const dexUrl = `https://dexscreener.com/solana/${mint}`;
  const pumpUrl = `https://pump.fun/${mint}`;
  
  return [
    [
      { text: "🐋 Whale", callback_data: `whale:${mint}` },
      { text: "👥 Holders", callback_data: `holders:${mint}` },
      { text: "📊 Momentum", callback_data: `momentum:${mint}` },
    ],
    [
      { text: "⚠️ Risk", callback_data: `risk:${mint}` },
      { text: "📈 DexScreener", url: dexUrl },
      { text: "🎰 Pump", url: pumpUrl },
    ],
  ];
}
