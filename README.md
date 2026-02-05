<div align="center">

![BlueClaw Banner](public/BlueClawvideo-ezgif.gif)

# 🦞 BlueClaw

### Whale Tracking & Signal Caller for Solana

[![Telegram](https://img.shields.io/badge/Telegram-Add%20Bot-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://t.me/BlueClawCallsBot)
[![Twitter](https://img.shields.io/badge/Twitter-@BlueClaw-1DA1F2?style=for-the-badge&logo=x&logoColor=white)](https://twitter.com/BlueClaw)
[![Website](https://img.shields.io/badge/Website-blueclawcalls.xyz-0ea5e9?style=for-the-badge&logo=vercel&logoColor=white)](https://www.blueclawcalls.xyz)

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Solana](https://img.shields.io/badge/Solana-Mainnet-9945FF?style=flat-square&logo=solana)](https://solana.com/)
[![Telegram Bot](https://img.shields.io/badge/Bot-Telegram-26A5E4?style=flat-square&logo=telegram)](https://t.me/BlueClawCallsBot)

**Real-time PumpFun graduation tracking & whale signals — delivered to Telegram.**

[🚀 Add to Telegram](https://t.me/BlueClawCallsBot) · [📖 Documentation](https://www.blueclawcalls.xyz/docs) · [🌐 Website](https://www.blueclawcalls.xyz)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎓 **PumpFun Graduation Tracking** | Monitors tokens graduating from PumpFun to Raydium in real-time |
| 🐋 **Whale Analysis** | Track whale wallets, accumulation patterns, and top holder concentration |
| 📊 **Multi-Source Analytics** | Combines DexScreener + Helius data for comprehensive token analysis |
| 🛡️ **Scam Detection** | Liquidity ratio, buy/sell ratio, and age-vs-mcap filters to detect rugs |
| 🤖 **Telegram Autopost** | Automatically posts high-scoring tokens to your group chats |
| ⚡ **Real-time Scoring** | 0-10 confidence scores based on multiple on-chain signals |

---

## 🚀 Quick Start

### Add to Telegram

1. Click **[Add to Telegram](https://t.me/BlueClawCallsBot)** or search `@BlueClawCallsBot`
2. Start a chat or add to your group
3. Make the bot an admin (for group posting)
4. Run `/scan` to find fresh graduations
5. Run `/alpha` for the top-scoring token
6. Enable autopost with `/autopost on`

### Commands

| Command | Description |
|---------|-------------|
| `/scan` | Scan for newly graduated PumpFun tokens |
| `/fresh` | Find the freshest graduations (last hour) |
| `/alpha` | Get the highest-scoring token right now |
| `/whale <mint>` | Analyze whale activity for a token |
| `/holders <mint>` | Check holder distribution |
| `/momentum <mint>` | Analyze price & volume momentum |
| `/autopost on/off` | Enable/disable automatic posting |
| `/config` | View current configuration |
| `/help` | Show all available commands |

---

## Scam Detection

BlueClaw uses **PumpFun-specific scam detection** based on bonding curve mechanics:

| Filter | Threshold | Why It Matters |
|--------|-----------|----------------|
| **Liq/MCap Ratio** | ≥10% | PumpFun grads start at ~17%. Below 8% = likely rug |
| **Buy/Sell Ratio** | ≥0.5 | Filters active dumps in progress |
| **Age vs MCap** | Dynamic | Flags suspicious growth (>$15k/min in first 30m) |
| **Holder Count** | ≥75 | Ensures healthy distribution |
| **Top 10 Concentration** | <50% | Limits whale manipulation risk |

---

## Scoring System

BlueClaw uses a **0-10 scoring system** based on:

- **Liquidity Ratio** — Critical PumpFun metric (liq/mcap %)
- **Volume Momentum** — 5m volume vs 1h average
- **Buy/Sell Ratio** — Transaction sentiment
- **Holder Distribution** — Count + concentration
- **Price Action** — Short-term momentum
- **Market Cap** — Sweet spot detection ($100k-$5M)

---

## Architecture

```
BlueClaw
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── telegram/       # Telegram webhook & commands
│   │   └── autopost/       # Autopost service control
│   ├── docs/               # Documentation page
│   └── page.tsx            # Landing page
├── lib/clawcord/           # Core logic
│   ├── dexscreener-provider.ts   # DexScreener API + Graduation Watcher
│   ├── data-providers.ts         # Helius integration
│   ├── telegram-formatter.ts     # Message formatting
│   ├── scoring.ts                # Token scoring engine
│   └── autopost-service.ts       # Autoposting
└── components/             # React components
```

---

## Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# Data Providers
HELIUS_API_KEY=your_helius_key
DEXSCREENER_BASE_URL=https://api.dexscreener.com

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
```

---

## Links

- **Website**: [blueclawcalls.xyz](https://www.blueclawcalls.xyz)
- **Telegram Bot**: [@BlueClawCallsBot](https://t.me/BlueClawCallsBot)
- **Twitter**: [@BlueClaw](https://twitter.com/BlueClaw)
- **Documentation**: [blueclawcalls.xyz/docs](https://www.blueclawcalls.xyz/docs)

---

<div align="center">

**Built with 🦞 by the BlueClaw Team**

*Disclaimer: BlueClaw is a tool for signal tracking, not financial advice. Always DYOR.*

</div>