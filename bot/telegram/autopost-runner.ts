// BlueClaw Autopost Runner - Standalone service for Render
// This runs the autopost service continuously without the webhook/polling bot

import { TelegramAutopostService } from "./autopost";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!TELEGRAM_BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

console.log("🦞 BlueClaw Autopost Service Starting...");
console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);

const autopostService = new TelegramAutopostService({
  enabled: true,
  intervalMs: 60_000, // 1 minute
  minScore: 6.5,
});

// Start autopost
autopostService.start();

console.log("✅ Autopost service running (60s intervals)");

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down autopost service...");
  autopostService.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down autopost service...");
  autopostService.stop();
  process.exit(0);
});

// Keep process alive
setInterval(() => {
  // Heartbeat - keeps the process running
}, 30000);
