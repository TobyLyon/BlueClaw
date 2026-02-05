-- Teleclaw Supabase Schema (Telegram Tables)
-- Run this after the base schema.sql

-- Telegram Chat Settings Table (equivalent to guild_settings for Discord)
CREATE TABLE IF NOT EXISTS telegram_chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT UNIQUE NOT NULL,
  chat_title TEXT,
  chat_type TEXT DEFAULT 'group', -- private, group, supergroup, channel
  topic_id INTEGER, -- For forum/topic support in supergroups
  min_score DECIMAL(3,1) DEFAULT 6.5,
  autopost BOOLEAN DEFAULT false,
  show_volume BOOLEAN DEFAULT true,
  show_holders BOOLEAN DEFAULT true,
  show_links BOOLEAN DEFAULT true,
  vibe_mode TEXT DEFAULT 'neutral', -- aggressive, neutral, cautious
  policy_preset TEXT DEFAULT 'momentum',
  policy JSONB,
  watchlist JSONB,
  admin_users TEXT[],
  call_count INTEGER DEFAULT 0,
  last_call_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Telegram Call History Table
CREATE TABLE IF NOT EXISTS telegram_call_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES telegram_chats(chat_id) ON DELETE CASCADE,
  call_id TEXT,
  call_card JSONB,
  triggered_by TEXT, -- manual, auto, reply
  user_id TEXT,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  score DECIMAL(3,1),
  market_cap BIGINT,
  liquidity BIGINT,
  message_id BIGINT, -- Telegram message ID (can be large)
  posted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Telegram tables
CREATE INDEX IF NOT EXISTS idx_telegram_chats_chat_id ON telegram_chats(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_chats_autopost ON telegram_chats(autopost) WHERE autopost = true;
CREATE INDEX IF NOT EXISTS idx_telegram_call_history_chat_id ON telegram_call_history(chat_id);
CREATE INDEX IF NOT EXISTS idx_telegram_call_history_token ON telegram_call_history(token_address);
CREATE INDEX IF NOT EXISTS idx_telegram_call_history_posted ON telegram_call_history(posted_at DESC);

-- Trigger for auto-updating updated_at on telegram_chats
DROP TRIGGER IF EXISTS update_telegram_chats_updated_at ON telegram_chats;
CREATE TRIGGER update_telegram_chats_updated_at
  BEFORE UPDATE ON telegram_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE telegram_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_call_history ENABLE ROW LEVEL SECURITY;

-- Policies for service role access
CREATE POLICY "Service role can access all telegram_chats" ON telegram_chats
  FOR ALL USING (true);

CREATE POLICY "Service role can access all telegram_call_history" ON telegram_call_history
  FOR ALL USING (true);

-- Telegram recent calls view
CREATE OR REPLACE VIEW telegram_recent_calls AS
SELECT 
  tch.*,
  tc.chat_title
FROM telegram_call_history tch
JOIN telegram_chats tc ON tch.chat_id = tc.chat_id
ORDER BY tch.posted_at DESC
LIMIT 100;

-- Telegram stats view
CREATE OR REPLACE VIEW telegram_stats AS
SELECT 
  tc.chat_id,
  tc.chat_title,
  tc.chat_type,
  tc.autopost,
  tc.vibe_mode,
  COUNT(tch.id) as total_calls,
  MAX(tch.posted_at) as last_call_at
FROM telegram_chats tc
LEFT JOIN telegram_call_history tch ON tc.chat_id = tch.chat_id
GROUP BY tc.chat_id, tc.chat_title, tc.chat_type, tc.autopost, tc.vibe_mode;

-- Combined platform stats view (Discord + Telegram)
CREATE OR REPLACE VIEW platform_stats AS
SELECT 
  'discord' as platform,
  COUNT(*) as total_chats,
  COUNT(*) FILTER (WHERE autopost = true) as active_chats,
  (SELECT COUNT(*) FROM call_history) as total_calls
FROM guild_settings
UNION ALL
SELECT 
  'telegram' as platform,
  COUNT(*) as total_chats,
  COUNT(*) FILTER (WHERE autopost = true) as active_chats,
  (SELECT COUNT(*) FROM telegram_call_history) as total_calls
FROM telegram_chats;
