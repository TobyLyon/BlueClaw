import type {
  DexScreenerPair,
  PumpFunGraduation,
  GraduationFilter,
  GraduationCandidate,
  TokenMetrics,
} from "./types";
import { getHeliusProvider } from "./data-providers";

const DEXSCREENER_API = process.env.DEXSCREENER_BASE_URL || "https://api.dexscreener.com";
const PUMPFUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const RAYDIUM_V4 = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";

export class DexScreenerProvider {
  private cache: Map<string, { data: DexScreenerPair[]; timestamp: number }> = new Map();
  private cacheTTL = 30_000; // 30 seconds

  async getLatestPumpFunGraduations(limit = 50): Promise<DexScreenerPair[]> {
    const cacheKey = `pumpfun-graduations-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      // Use DexScreener's token boosts endpoint to get recently active tokens
      // Then fetch their pair data
      const boostsResponse = await fetch(
        `${DEXSCREENER_API}/token-boosts/top/v1`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "BlueClaw/1.0",
          },
        }
      );

      let allPairs: DexScreenerPair[] = [];

      if (boostsResponse.ok) {
        const boostsData = await boostsResponse.json();
        // Filter for Solana tokens and get their addresses
        const solanaTokens = (boostsData || [])
          .filter((t: any) => t.chainId === "solana")
          .slice(0, Math.min(limit, 20))
          .map((t: any) => t.tokenAddress);

        if (solanaTokens.length > 0) {
          // Fetch pair data for these tokens (batch in groups of 10)
          for (let i = 0; i < solanaTokens.length; i += 10) {
            const batch = solanaTokens.slice(i, i + 10);
            const tokenAddresses = batch.join(",");
            
            const pairsResponse = await fetch(
              `${DEXSCREENER_API}/latest/dex/tokens/${tokenAddresses}`,
              {
                headers: {
                  "Accept": "application/json",
                  "User-Agent": "BlueClaw/1.0",
                },
              }
            );

            if (pairsResponse.ok) {
              const pairsData = await pairsResponse.json();
              const pairs: DexScreenerPair[] = pairsData.pairs || [];
              allPairs = allPairs.concat(pairs);
            }
          }
        }
      }

      // Also try the latest profiles endpoint as backup
      if (allPairs.length < limit) {
        const profilesResponse = await fetch(
          `${DEXSCREENER_API}/token-profiles/latest/v1`,
          {
            headers: {
              "Accept": "application/json",
              "User-Agent": "BlueClaw/1.0",
            },
          }
        );

        if (profilesResponse.ok) {
          const profilesData = await profilesResponse.json();
          const solanaProfiles = (profilesData || [])
            .filter((p: any) => p.chainId === "solana")
            .slice(0, limit - allPairs.length);

          // Batch profile tokens in groups of 10 (same as boosts path)
          const profileAddresses = solanaProfiles.map((p: any) => p.tokenAddress);
          for (let i = 0; i < profileAddresses.length; i += 10) {
            try {
              const batch = profileAddresses.slice(i, i + 10);
              const pairRes = await fetch(
                `${DEXSCREENER_API}/latest/dex/tokens/${batch.join(",")}`,
                {
                  headers: {
                    "Accept": "application/json",
                    "User-Agent": "BlueClaw/1.0",
                  },
                }
              );
              if (pairRes.ok) {
                const pairData = await pairRes.json();
                const pairs: DexScreenerPair[] = pairData.pairs || [];
                allPairs = allPairs.concat(pairs);
              }
            } catch {
              // Skip failed batch
            }
          }
        }
      }

      // Filter for Raydium pairs (PumpFun graduates here) and dedupe
      const seenMints = new Set<string>();
      const raydiumPairs = allPairs.filter((pair: DexScreenerPair) => {
        if (pair.dexId !== "raydium" || pair.chainId !== "solana") return false;
        if (seenMints.has(pair.baseToken.address)) return false;
        seenMints.add(pair.baseToken.address);
        return true;
      });

      // Sort by creation time (newest first)
      raydiumPairs.sort((a, b) => (b.pairCreatedAt || 0) - (a.pairCreatedAt || 0));

      this.cache.set(cacheKey, { data: raydiumPairs.slice(0, limit), timestamp: Date.now() });
      return raydiumPairs.slice(0, limit);
    } catch (error) {
      console.error("Failed to fetch DexScreener pairs:", error);
      return [];
    }
  }

  // Fetch genuinely new pairs from DexScreener's latest pairs endpoint
  async getLatestSolanaPairs(limit = 50): Promise<DexScreenerPair[]> {
    const cacheKey = `latest-solana-pairs`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${DEXSCREENER_API}/latest/dex/pairs/solana`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "BlueClaw/1.0",
          },
        }
      );

      if (!response.ok) {
        console.error(`[DexScreener] Latest pairs returned ${response.status}`);
        return [];
      }

      const data = await response.json();
      const pairs: DexScreenerPair[] = data.pairs || [];

      // Filter for Raydium pairs (PumpFun graduates) and dedupe
      const seenMints = new Set<string>();
      const raydiumPairs = pairs.filter((pair: DexScreenerPair) => {
        if (pair.dexId !== "raydium" || pair.chainId !== "solana") return false;
        if (seenMints.has(pair.baseToken.address)) return false;
        seenMints.add(pair.baseToken.address);
        return true;
      });

      // Already sorted newest first by DexScreener
      const result = raydiumPairs.slice(0, limit);
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (error) {
      console.error("Failed to fetch latest Solana pairs:", error);
      return [];
    }
  }

  async getPairByMint(mint: string): Promise<DexScreenerPair | null> {
    try {
      const response = await fetch(
        `${DEXSCREENER_API}/latest/dex/tokens/${mint}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "ClawCord/1.0",
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const pairs: DexScreenerPair[] = data.pairs || [];

      // Return the most liquid Raydium pair
      const raydiumPairs = pairs
        .filter((p) => p.dexId === "raydium" && p.chainId === "solana")
        .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

      return raydiumPairs[0] || null;
    } catch (error) {
      console.error(`Failed to fetch pair for ${mint}:`, error);
      return null;
    }
  }

  async searchTokens(query: string): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(
        `${DEXSCREENER_API}/latest/dex/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            "Accept": "application/json",
            "User-Agent": "ClawCord/1.0",
          },
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const pairs: DexScreenerPair[] = data.pairs || [];

      return pairs.filter(
        (p) => p.chainId === "solana" && p.dexId === "raydium"
      );
    } catch (error) {
      console.error(`Failed to search tokens:`, error);
      return [];
    }
  }

  pairToMetrics(pair: DexScreenerPair): TokenMetrics {
    const ageMs = Date.now() - pair.pairCreatedAt;
    const ageHours = ageMs / (1000 * 60 * 60);

    return {
      mint: pair.baseToken.address,
      symbol: pair.baseToken.symbol,
      name: pair.baseToken.name,
      price: parseFloat(pair.priceUsd) || 0,
      priceChange24h: pair.priceChange?.h24 || 0,
      volume24h: pair.volume?.h24 || 0,
      volumeChange: pair.volume?.h1 
        ? ((pair.volume.h1 * 24) / (pair.volume.h24 || 1) - 1) * 100 
        : 0,
      liquidity: pair.liquidity?.usd || 0,
      liquidityChange: 0, // Would need historical data
      holders: 0, // DexScreener doesn't provide this, need Helius
      holdersChange: 0,
      topHolderConcentration: 0, // Need on-chain data
      tokenAgeHours: ageHours,
      mintAuthority: false, // Need on-chain verification
      freezeAuthority: false,
      lpLocked: false, // Need to check LP token burns
      lpAge: ageHours,
      deployerAddress: "", // Need to trace deployer
      deployerPriorTokens: 0,
      deployerRugCount: 0,
    };
  }
}

export class GraduationWatcher {
  private dexProvider: DexScreenerProvider;
  private seenMints: Set<string> = new Set();
  private subscribers: Map<string, (candidate: GraduationCandidate) => void> = new Map();

  constructor() {
    this.dexProvider = new DexScreenerProvider();
  }

  async scanForGraduations(
    filter: GraduationFilter
  ): Promise<GraduationCandidate[]> {
    console.log("[GraduationWatcher] Starting scan...");
    const pairs = await this.dexProvider.getLatestPumpFunGraduations(100);
    console.log(`[GraduationWatcher] Got ${pairs.length} pairs from DexScreener`);
    
    const candidates: GraduationCandidate[] = [];
    const helius = getHeliusProvider();

    for (const pair of pairs) {
      const metrics = this.dexProvider.pairToMetrics(pair);
      
      // Enrich metrics with Helius holder data (non-blocking)
      try {
        const [holderCount, topHolderConcentration] = await Promise.all([
          helius.getTokenHolderCount(pair.baseToken.address).catch(() => 0),
          helius.getTopHolderConcentration(pair.baseToken.address, 10).catch(() => 0),
        ]);
        metrics.holders = holderCount || 100; // Default to 100 if fetch fails
        metrics.topHolderConcentration = topHolderConcentration || 25;
      } catch (error) {
        // Continue with default values if Helius fails
        metrics.holders = 100;
        metrics.topHolderConcentration = 25;
      }

      const { passes, failures } = this.applyFilter(pair, metrics, filter);

      // Create graduation info
      const graduation: PumpFunGraduation = {
        mint: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        graduatedAt: new Date(pair.pairCreatedAt),
        bondingCurveAddress: "", // Would need PumpFun API
        raydiumPairAddress: pair.pairAddress,
        initialLiquidity: pair.liquidity?.usd || 0,
        initialMarketCap: pair.marketCap || 0,
        creatorAddress: "", // Would need on-chain trace
        imageUrl: pair.info?.imageUrl,
      };

      // Calculate a simple score based on metrics
      const score = this.calculateScore(pair, metrics);

      candidates.push({
        graduation,
        pair,
        metrics,
        score,
        passesFilter: passes,
        filterFailures: failures,
      });

      // Mark as seen
      this.seenMints.add(pair.baseToken.address);
    }

    // Sort by score descending
    return candidates.sort((a, b) => b.score - a.score);
  }

  // Scan specifically for fresh/new pairs using the latest pairs endpoint
  async scanFreshGraduations(
    filter: GraduationFilter
  ): Promise<GraduationCandidate[]> {
    console.log("[GraduationWatcher] Starting FRESH scan (latest pairs endpoint)...");
    const pairs = await this.dexProvider.getLatestSolanaPairs(50);
    console.log(`[GraduationWatcher] Got ${pairs.length} latest Solana pairs`);
    
    const candidates: GraduationCandidate[] = [];
    const helius = getHeliusProvider();

    for (const pair of pairs) {
      // Pre-filter by age before expensive Helius calls
      const ageMinutes = (Date.now() - (pair.pairCreatedAt || 0)) / (1000 * 60);
      if (ageMinutes > filter.maxAgeMinutes) {
        continue; // Skip old pairs immediately
      }

      const metrics = this.dexProvider.pairToMetrics(pair);
      
      try {
        const [holderCount, topHolderConcentration] = await Promise.all([
          helius.getTokenHolderCount(pair.baseToken.address).catch(() => 0),
          helius.getTopHolderConcentration(pair.baseToken.address, 10).catch(() => 0),
        ]);
        metrics.holders = holderCount || 100;
        metrics.topHolderConcentration = topHolderConcentration || 25;
      } catch {
        metrics.holders = 100;
        metrics.topHolderConcentration = 25;
      }

      const { passes, failures } = this.applyFilter(pair, metrics, filter);

      const graduation: PumpFunGraduation = {
        mint: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        graduatedAt: new Date(pair.pairCreatedAt),
        bondingCurveAddress: "",
        raydiumPairAddress: pair.pairAddress,
        initialLiquidity: pair.liquidity?.usd || 0,
        initialMarketCap: pair.marketCap || 0,
        creatorAddress: "",
        imageUrl: pair.info?.imageUrl,
      };

      const score = this.calculateScore(pair, metrics);

      // Only include tokens that pass the filter for fresh scans
      if (passes) {
        candidates.push({
          graduation,
          pair,
          metrics,
          score,
          passesFilter: true,
          filterFailures: [],
        });
      }
    }

    // Sort by creation time (newest first)
    return candidates.sort((a, b) => 
      (b.pair.pairCreatedAt || 0) - (a.pair.pairCreatedAt || 0)
    );
  }

  // Show ALL recent graduations with warning badges — minimal filtering
  // Only hard-reject absolute scams (liq ratio <3% or single holder >80%)
  async scanAllGraduations(
    maxAgeMinutes: number = 120
  ): Promise<GraduationCandidate[]> {
    console.log("[GraduationWatcher] Starting ALL GRADS scan (unfiltered)...");
    const pairs = await this.dexProvider.getLatestSolanaPairs(50);
    console.log(`[GraduationWatcher] Got ${pairs.length} latest Solana pairs`);

    const candidates: GraduationCandidate[] = [];
    const helius = getHeliusProvider();

    for (const pair of pairs) {
      const ageMinutes = (Date.now() - (pair.pairCreatedAt || 0)) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) continue;

      const metrics = this.dexProvider.pairToMetrics(pair);

      try {
        const [holderCount, topHolderConcentration] = await Promise.all([
          helius.getTokenHolderCount(pair.baseToken.address).catch(() => 0),
          helius.getTopHolderConcentration(pair.baseToken.address, 10).catch(() => 0),
        ]);
        metrics.holders = holderCount || 0;
        metrics.topHolderConcentration = topHolderConcentration || 0;
      } catch {
        metrics.holders = 0;
        metrics.topHolderConcentration = 0;
      }

      // Generate warnings instead of hard rejecting
      const warnings = this.generateWarnings(pair, metrics);

      // Only hard-reject absolute scams
      const mcap = pair.marketCap || 0;
      const liq = pair.liquidity?.usd || 0;
      const liqRatio = mcap > 0 ? (liq / mcap) * 100 : 0;
      const isAbsoluteScam = (liqRatio > 0 && liqRatio < 3) || metrics.topHolderConcentration > 80;

      const graduation: PumpFunGraduation = {
        mint: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        graduatedAt: new Date(pair.pairCreatedAt),
        bondingCurveAddress: "",
        raydiumPairAddress: pair.pairAddress,
        initialLiquidity: liq,
        initialMarketCap: mcap,
        creatorAddress: "",
        imageUrl: pair.info?.imageUrl,
      };

      const score = this.calculateScore(pair, metrics);

      candidates.push({
        graduation,
        pair,
        metrics,
        score,
        passesFilter: !isAbsoluteScam,
        filterFailures: warnings,
      });
    }

    return candidates.sort((a, b) =>
      (b.pair.pairCreatedAt || 0) - (a.pair.pairCreatedAt || 0)
    );
  }

  // Generate warning badges instead of hard rejections
  // Based on PumpFun graduation research:
  // - Grads start at ~$69K mcap, ~$12K liq, ~17% liq/mcap ratio
  // - Early tokens naturally have <50 holders, concentrated top holders
  // - Key red flags: dev wallet >30%, no socials, liq drained below 5%
  private generateWarnings(pair: DexScreenerPair, metrics: TokenMetrics): string[] {
    const warnings: string[] = [];
    const mcap = pair.marketCap || 0;
    const liq = pair.liquidity?.usd || 0;
    const liqRatio = mcap > 0 ? (liq / mcap) * 100 : 0;
    const buys = pair.txns?.m5?.buys || 0;
    const sells = pair.txns?.m5?.sells || 0;

    // Liquidity ratio warnings (grads start at ~17%)
    if (liqRatio > 0 && liqRatio < 5) {
      warnings.push("🚨 Liq drained (<5%)");
    } else if (liqRatio > 0 && liqRatio < 8) {
      warnings.push("⚠️ Low liq ratio (<8%)");
    }

    // Holder concentration
    if (metrics.topHolderConcentration > 60) {
      warnings.push("🚨 Top 10 hold >60%");
    } else if (metrics.topHolderConcentration > 40) {
      warnings.push("⚠️ Top 10 hold >40%");
    }

    // Volume check — no volume = dead
    if ((pair.volume?.m5 || 0) === 0 && (pair.volume?.h1 || 0) === 0) {
      warnings.push("💀 No volume");
    }

    // Sell pressure
    if (sells > 0 && buys > 0 && (buys / sells) < 0.3) {
      warnings.push("🔴 Heavy sell pressure");
    }

    // Very low liquidity (below graduation baseline)
    if (liq > 0 && liq < 5000) {
      warnings.push("⚠️ Low liq (<$5K)");
    }

    // No socials
    const hasSocials = pair.info?.socials && pair.info.socials.length > 0;
    const hasWebsite = pair.info?.websites && pair.info.websites.length > 0;
    if (!hasSocials && !hasWebsite) {
      warnings.push("👻 No socials");
    }

    return warnings;
  }

  private applyFilter(
    pair: DexScreenerPair,
    metrics: TokenMetrics,
    filter: GraduationFilter
  ): { passes: boolean; failures: string[] } {
    const failures: string[] = [];

    // Check liquidity
    if ((pair.liquidity?.usd || 0) < filter.minLiquidity) {
      failures.push(
        `Liquidity $${pair.liquidity?.usd?.toFixed(0) || 0} < $${filter.minLiquidity}`
      );
    }

    // Check 5m volume
    if ((pair.volume?.m5 || 0) < filter.minVolume5m) {
      failures.push(
        `5m volume $${pair.volume?.m5?.toFixed(0) || 0} < $${filter.minVolume5m}`
      );
    }

    // Check age
    const ageMinutes = (Date.now() - pair.pairCreatedAt) / (1000 * 60);
    if (ageMinutes > filter.maxAgeMinutes) {
      failures.push(
        `Age ${ageMinutes.toFixed(0)}m > ${filter.maxAgeMinutes}m`
      );
    }

    // Check holder count (now available via Helius)
    if (metrics.holders > 0 && metrics.holders < filter.minHolders) {
      failures.push(
        `Holders ${metrics.holders} < ${filter.minHolders}`
      );
    }

    // Check top holder concentration (whale risk)
    if (metrics.topHolderConcentration > 50) {
      failures.push(
        `Top 10 holders own ${metrics.topHolderConcentration.toFixed(1)}% (high concentration)`
      );
    }

    // CRITICAL: Check liquidity/mcap ratio - PumpFun tokens graduate at ~17% ratio
    // Legitimate tokens maintain 10-30% ratio. Below threshold is a major red flag
    const mcap = pair.marketCap || 0;
    const liq = pair.liquidity?.usd || 0;
    const minLiqRatio = filter.minLiquidityRatio || 8;
    if (mcap > 0 && liq > 0) {
      const liqRatio = (liq / mcap) * 100;
      if (liqRatio < minLiqRatio) {
        failures.push(
          `Liq/MCap ${liqRatio.toFixed(1)}% < ${minLiqRatio}% (scam risk)`
        );
      }
    }

    // Check buy/sell ratio - dumps in progress are red flags
    const buys = pair.txns?.m5?.buys || 0;
    const sells = pair.txns?.m5?.sells || 0;
    const minBuySellRatio = filter.minBuySellRatio || 0.3;
    if (sells > 0) {
      const buySellRatio = buys / sells;
      if (buySellRatio < minBuySellRatio) {
        failures.push(
          `Buy/Sell ratio ${buySellRatio.toFixed(2)} < ${minBuySellRatio} (dump in progress)`
        );
      }
    }

    // Check for suspicious mcap vs age — loosened based on research
    // Viral tokens CAN legitimately pump to $1M+ in minutes
    // Only flag extreme outliers (>$5M in first 15 min with no volume to back it)
    if (mcap > 5000000 && ageMinutes < 15) {
      const vol1h = pair.volume?.h1 || 0;
      if (vol1h < mcap * 0.1) { // Volume should be at least 10% of mcap for legitimacy
        failures.push(
          `MCap $${(mcap/1000).toFixed(0)}k with low volume — possible wash trading`
        );
      }
    }

    return {
      passes: failures.length === 0,
      failures,
    };
  }

  private calculateScore(pair: DexScreenerPair, metrics: TokenMetrics): number {
    let score = 5; // Base score

    // Volume momentum (5m vs 1h average)
    const vol5m = pair.volume?.m5 || 0;
    const vol1hAvg = (pair.volume?.h1 || 0) / 12;
    if (vol5m > vol1hAvg * 2) score += 1.5;
    else if (vol5m > vol1hAvg * 1.5) score += 1;
    else if (vol5m < vol1hAvg * 0.5) score -= 1;

    // Liquidity health
    const liq = pair.liquidity?.usd || 0;
    if (liq > 50000) score += 1;
    else if (liq > 20000) score += 0.5;
    else if (liq < 5000) score -= 1;

    // Buy/sell ratio
    const buys = pair.txns?.m5?.buys || 0;
    const sells = pair.txns?.m5?.sells || 0;
    const ratio = sells > 0 ? buys / sells : buys > 0 ? 2 : 1;
    if (ratio > 2) score += 1;
    else if (ratio > 1.5) score += 0.5;
    else if (ratio < 0.5) score -= 1.5;

    // Price momentum
    const priceChange5m = pair.priceChange?.m5 || 0;
    if (priceChange5m > 20) score += 1;
    else if (priceChange5m > 10) score += 0.5;
    else if (priceChange5m < -20) score -= 1;

    // Market cap sanity
    const mcap = pair.marketCap || 0;
    if (mcap > 100000 && mcap < 5000000) score += 0.5;
    else if (mcap > 10000000) score -= 0.5;

    // CRITICAL: Liquidity to Market Cap ratio
    // PumpFun tokens graduate at ~$69K mcap with ~$12K liq = ~17% ratio
    // Healthy tokens: 15-30% ratio, Acceptable: 10-15%, Scam risk: <8%
    if (mcap > 0 && liq > 0) {
      const liqRatio = (liq / mcap) * 100;
      if (liqRatio >= 20) score += 2;        // Excellent liquidity backing
      else if (liqRatio >= 15) score += 1.5; // Healthy ratio
      else if (liqRatio >= 10) score += 0.5; // Acceptable
      else if (liqRatio < 5) score -= 3;     // Major scam risk
      else if (liqRatio < 8) score -= 2;     // High scam risk
    }

    // Holder distribution (from Helius)
    const holders = metrics.holders;
    if (holders > 200) score += 1;
    else if (holders > 100) score += 0.5;
    else if (holders < 30 && holders > 0) score -= 0.5;

    // Top holder concentration (lower is better)
    const concentration = metrics.topHolderConcentration;
    if (concentration > 0) {
      if (concentration < 20) score += 1;
      else if (concentration < 35) score += 0.5;
      else if (concentration > 60) score -= 1;
      else if (concentration > 45) score -= 0.5;
    }

    return Math.max(0, Math.min(10, score));
  }

  subscribe(id: string, callback: (candidate: GraduationCandidate) => void) {
    this.subscribers.set(id, callback);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  clearSeenMints() {
    this.seenMints.clear();
  }
}

// Optimized defaults based on PumpFun graduation research:
// - Tokens graduate at ~$69k mcap with ~$12k initial liquidity (~17% ratio)
// - Best entry window is 15-45 minutes post-graduation
// - Only ~1-2% of tokens graduate, so these are already filtered
// - Healthy tokens maintain 15-30% liquidity/mcap ratio
export const DEFAULT_GRADUATION_FILTER: GraduationFilter = {
  minLiquidity: 8000,       // Slightly below graduation baseline (~$12K) to catch early
  minVolume5m: 200,         // Lowered — early tokens may have light volume
  minHolders: 75,           // Tokens always graduate with 75+ holders
  maxAgeMinutes: 60,        // Wider window to catch more candidates
  excludeRuggedDeployers: true,
  minLiquidityRatio: 8,     // Min 8% liq/mcap (grads start at ~17%, allow some drain)
  minBuySellRatio: 0.3,     // More tolerant — early profit-taking is normal
};

// Aggressive preset for early snipers (higher risk, higher reward)
export const AGGRESSIVE_GRADUATION_FILTER: GraduationFilter = {
  minLiquidity: 8000,
  minVolume5m: 500,
  minHolders: 75,           // All grads have 75+ holders
  maxAgeMinutes: 20,        // Very early entry
  excludeRuggedDeployers: true,
  minLiquidityRatio: 8,     // Slightly lower threshold for early plays
  minBuySellRatio: 0.3,     // More tolerant of selling pressure
};

// Conservative preset for safer plays
export const CONSERVATIVE_GRADUATION_FILTER: GraduationFilter = {
  minLiquidity: 20000,      // Well-established liquidity
  minVolume5m: 2000,        // Strong trading activity
  minHolders: 150,          // Wide distribution
  maxAgeMinutes: 120,       // More time to prove itself
  minLiquidityRatio: 15,    // Require healthy 15%+ ratio
  minBuySellRatio: 0.8,     // Strong buy pressure required
  excludeRuggedDeployers: true,
};
