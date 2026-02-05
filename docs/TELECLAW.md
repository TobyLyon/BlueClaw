# BlueClaw — Telegram Alpha Signal Bot

> Clawcord, but born on Telegram.

## Overview

BlueClaw is a Telegram-native port of the Clawcord Discord bot. It preserves all core utilities while adapting the UX to Telegram conventions.

**This is NOT a new product** — it's a transport-layer migration.

**Aligned with OpenClaw spec:** https://docs.openclaw.ai/channels/telegram

---

## Core Utilities (Preserved)

### 1. Alpha Signal Engine
- Real-time PumpFun graduation monitoring
- Dex pair scanning via DexScreener API
- Momentum detection and scoring
- Caller-style messages (not robotic alerts)

### 2. Chat-Scoped Behavior
- Each Telegram group has its own config
- Signals can be auto-posted or manually requested
- Rate-limited per chat
- Group-specific preferences (min score, vibe mode)

### 3. Caller Personality Layer
- Bot speaks like a trencher, not a system
- Short-form, confident, decisive language
- Three vibe modes: `aggressive`, `neutral`, `cautious`

### 4. Admin Controls
- Enable/disable features
- Set score thresholds
- Control autopost frequency
- All actions mapped to Telegram admin permissions

---

## Discord → Telegram Mapping

| Discord Concept | Telegram Equivalent |
|-----------------|---------------------|
| Guild | Group / Supergroup |
| Channel | Group or Topic |
| Slash Command | `/command` |
| Button | Inline Keyboard |
| Role | Admin / Creator |
| Permissions | ChatMember status |

---

## Commands

### User Commands
| Command | Description |
|---------|-------------|
| `/start` | Initialize BlueClaw in chat |
| `/help` | Show available commands |
| `/alpha` | Get latest alpha signal |
| `/scan` | Scan for new graduations |
| `/signals` | View recent signals |
| `/lastcall` | Show the last call made |
| `/status` | Bot status and stats |

### Admin Commands
| Command | Description |
|---------|-------------|
| `/config` | View/edit configuration |
| `/setrisk <1-10>` | Set minimum score threshold |
| `/autopost` | Toggle automatic posting |
| `/policy` | Change policy preset |
| `/mute` | Mute signals |
| `/unmute` | Unmute signals |

---

## Policy Presets

| Preset | Description |
|--------|-------------|
| Fresh Scanner | Ultra-new launches (0-2h), strict rug filters |
| Momentum | Volume acceleration + chart structure (2h-48h) |
| Dip Hunter | Drawdown + reclaim patterns |
| Whale Follow | Wallet-cluster accumulation patterns |
| Deployer Reputation | Prior deployer history checks |
| Community Strength | Holder growth and distribution |

---

## Vibe Modes

### Aggressive 🔥 (HTML format)
```html
🔥 <b>FRESH GRAD</b> | <code>$TOKEN</code>

📈 <b>0.00001234</b> (+42% 5m)
💰 MCap: <b>$125K</b>
💧 Liq: <b>$18K</b>

Score: <b>7.8/10</b>

⚠️ low liq
```

### Neutral 📊 (HTML format)
```html
📊 <b>New Graduation</b> — $TOKEN

Price: $0.00001234 (+42%)
MCap: $125K
Liquidity: $18K

Confidence: 7.8/10

CA: <code>TOKEN_ADDRESS</code>
```

### Cautious 👀 (HTML format)
```html
👀 <b>Watching</b> — $TOKEN

Price: $0.00001234
5m Change: +42%
MCap: $125K

Score: 7.8/10

⚠️ <b>Risks:</b>
• Liquidity below $15K
```

---

## Setup

### 1. Create Telegram Bot

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the bot token
4. **Optional:** Disable Privacy Mode via `/setprivacy` if bot needs to see all messages

### 2. Configure Environment

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Production (webhook mode)
TELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=random_secret_string
```

### 3. Run Database Migration

Execute in Supabase SQL Editor:
```sql
-- Run supabase/telegram-schema.sql
```

### 4. Start Bot

**Development (Polling):**
```bash
pnpm telegram
```

**Production (Webhook):**
```bash
# Deploy Next.js app - webhook endpoint at /api/telegram/webhook
pnpm build && pnpm start
```

### 5. Set Webhook (Production)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "your_webhook_secret"
  }'
```

---

## Architecture

```
bot/
├── index.ts              # Discord bot (Clawcord)
├── telegram/
│   ├── index.ts          # Telegram bot entry point
│   └── autopost.ts       # Telegram autopost service

lib/clawcord/
├── types.ts              # Core types (shared)
├── telegram-types.ts     # Telegram-specific types
├── telegram-storage.ts   # Telegram storage adapter
├── telegram-formatter.ts # Telegram message formatting
├── scoring.ts            # Scoring engine (unchanged)
├── policies.ts           # Policy presets (unchanged)
├── autopost-service.ts   # Discord autopost (unchanged)
└── ...                   # Other core modules

app/api/telegram/
└── webhook/route.ts      # Next.js webhook handler
```

### Key Design Decisions

1. **Core logic untouched** — `scoring.ts`, `policies.ts`, `call-card.ts` remain identical
2. **Storage abstracted** — `telegram-storage.ts` mirrors Discord storage interface
3. **Formatting separated** — `telegram-formatter.ts` handles Telegram-native styling
4. **Dual-mode operation** — Polling for dev, webhooks for production
5. **HTML parse_mode** — Per OpenClaw spec, uses `parse_mode: "HTML"` (not Markdown)
6. **Topic support** — Forum supergroups with `message_thread_id` for topic isolation
7. **Mention gating** — `requireMention: true` by default for group messages

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/telegram/webhook` | POST | Telegram update handler |
| `/api/telegram/webhook` | GET | Health check |

---

## Inline Keyboards

### Call Card Actions
```
[📊 DexScreener] [🔄 Refresh]
[🔕 Mute 1h] [⚙️ Settings]
```

### Config Panel
```
[📊 Set Risk] [🔔 Enable Auto]
[📜 Policy] [🎭 Vibe]
[❌ Close]
```

### Policy Selection
```
[🔥 Fresh Scanner] [📈 Momentum]
[📉 Dip Hunter] [🐋 Whale Follow]
[👤 Deployer Rep] [👥 Community]
```

---

## Rate Limits

- **Per chat per hour:** 10 calls max
- **Per chat per day:** 50 calls max (configurable via policy)
- **Cooldown between calls:** 60 seconds
- **API rate limiting:** Built-in delays between messages

---

## Explicit Non-Goals

- ❌ Do NOT redesign tokenomics
- ❌ Do NOT invent new features
- ❌ Do NOT change scoring logic
- ❌ Do NOT gamify unnecessarily
- ❌ Do NOT add AI fluff or explanations

---

## Branding

- **Icon:** Telegram logo with white lobster instead of paper plane
- **Color:** Telegram blue
- **Aesthetic:** Minimal, utilitarian
- **Philosophy:** This is a tool, not a toy

---

## Files Created

```
lib/clawcord/
├── telegram-types.ts
├── telegram-storage.ts
└── telegram-formatter.ts

bot/telegram/
├── index.ts
└── autopost.ts

app/api/telegram/webhook/
└── route.ts

supabase/
└── telegram-schema.sql

docs/
└── TELECLAW.md
```

---

*BlueClaw v1.0.0 — Clawcord, but born on Telegram.*
