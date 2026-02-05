"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Github, Twitter, Zap, Shield, BarChart3, Users, Terminal, Send, TrendingUp, Target, Clock, MessageCircle, Radio, Cpu } from "lucide-react";
import { AsciiShader } from "@/components/ascii-shader";

// Command examples for Telegram
const commandExamples = [
  {
    title: "Track Whales",
    command: `/whale <mint>`,
    description: "Monitor whale wallet activity",
    output: `� <b>Whale Activity</b> | $ALPHA

📊 <b>Top 10 hold:</b> 34.2%
🟢 Accumulating: 3 whales
🔴 Distributing: 0 whales

💰 Largest: 8.2% (holding)
⏰ Last move: 12m ago

[📈 Buys] [📉 Sells] [🔔 Alert]`,
  },
  {
    title: "Holder Analysis",
    command: `/holders <mint>`,
    description: "Deep dive into token distribution",
    output: `� <b>Holder Distribution</b>

📊 Total: <b>1,247 holders</b>
📈 Growth: <b>+89 (1h)</b>

🏆 Top 10: 28.4%
� Whales (>1%): 6
� LP Burned: ✅

Risk: <b>LOW</b> — Healthy spread`,
  },
  {
    title: "Fresh Graduations",
    command: `/fresh`,
    description: "Catch new launches instantly",
    output: `🆕 <b>Fresh Grads</b> (15m)

<b>1. $ALPHA</b> — 8.4/10 🔥
   2m old | $125K MC | Safe LP

<b>2. $MOON</b> — 7.8/10
   8m old | $89K MC | Verified

[� Whale] [👥 Holders] [� Chart]`,
  },
];

// Feature blocks data
const features = [
  {
    title: "Whale Tracking",
    subtitle: "Follow the smart money.",
    description: "Real-time whale wallet monitoring. See accumulation, distribution, and large transfers before price moves.",
    icon: Target,
    color: "text-sky-400",
    stats: ["Live whale alerts", "Accumulation signals", "Exchange flow tracking"],
  },
  {
    title: "Holder Analysis",
    subtitle: "Know who's holding.",
    description: "Deep distribution analysis. Top holder concentration, growth velocity, and rug risk scoring in one command.",
    icon: Users,
    color: "text-cyan-400",
    stats: ["Distribution maps", "Growth tracking", "Concentration alerts"],
  },
  {
    title: "On-Chain Signals",
    subtitle: "Data that doesn't lie.",
    description: "LP status, burn verification, authority checks, buy/sell ratios. Comprehensive on-chain risk assessment.",
    icon: Shield,
    color: "text-teal-400",
    stats: ["LP lock detection", "Mint authority check", "Tx pattern analysis"],
  },
  {
    title: "Momentum Detection",
    subtitle: "Catch moves early.",
    description: "Volume spikes, price breakouts, RSI signals. Technical analysis meets on-chain data for precise entries.",
    icon: TrendingUp,
    color: "text-emerald-400",
    stats: ["Volume alerts", "Breakout detection", "Momentum scoring"],
  },
  {
    title: "Fresh Grad Scanner",
    subtitle: "First to know.",
    description: "PumpFun graduation monitoring with <10 minute detection. Only 0.4% graduate — we find the winners.",
    icon: Zap,
    color: "text-amber-400",
    stats: ["< 10m detection", "Auto-filtering", "Success rate tracking"],
  },
  {
    title: "Risk Scoring",
    subtitle: "Trade with confidence.",
    description: "Unified 1-10 score combining holder distribution, liquidity depth, whale activity, and social signals.",
    icon: BarChart3,
    color: "text-blue-400",
    stats: ["Multi-factor scoring", "Real-time updates", "Risk breakdown"],
  },
];

export default function BlueClawLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a1628] relative overflow-hidden">
      {/* ===== MINIMAL HEADER ===== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a1628]/80 backdrop-blur-xl border-b border-sky-500/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/teleclaw logo.png"
              alt="BlueClaw"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-figtree), Figtree" }}>
              <span className="text-sky-400">Blue</span>Claw
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://t.me/BlueClawCallsBot" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">
              Docs
            </a>
            <a
              href="https://t.me/BlueClawCallsBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="w-4 h-4" />
              Open in Telegram
            </a>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* ASCII Shader Background - Baby blue shimmer */}
        <div className="absolute inset-0 z-0">
          <AsciiShader
            mode="shimmer"
            color="#38bdf8"
            bgColor="#0a1628"
            density={0.8}
            speed={0.4}
            charRamp=" .·:;+*#%@"
          />
          {/* Glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sky-900/10 to-[#0a1628]" />
          <div className="absolute inset-0 bg-[#0a1628]/30" style={{ mixBlendMode: 'overlay' }} />
          {/* Radial mask */}
          <div 
            className="absolute inset-0" 
            style={{ 
              background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(10, 22, 40, 0.8) 0%, rgba(10, 22, 40, 0.4) 50%, transparent 80%)'
            }} 
          />
        </div>

        {/* Hero Content - Centered Vertical Layout */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* Badge */}
            <motion.div 
              className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Radio className="w-3 h-3 text-sky-400 animate-pulse" />
              <span className="text-sky-300 text-sm font-medium">Live on Telegram</span>
            </motion.div>
            
            {/* Main Title */}
            <h1 
              className="text-6xl md:text-8xl font-bold text-white mb-6 tracking-tight"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              <span className="text-sky-400">Blue</span>Claw
            </h1>
            
            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-400 mb-4 max-w-2xl mx-auto leading-relaxed">
              Whale tracking. Holder analysis. On-chain signals.
            </p>
            <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
              The trading signals that actually work — delivered instantly to Telegram.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://t.me/BlueClawCallsBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-300 shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02]"
              >
                <Send className="w-5 h-5" />
                Add to Telegram
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all duration-200 border border-white/10 hover:border-white/20"
              >
                <Cpu className="w-5 h-5" />
                See How It Works
              </a>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-sky-500/30 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-sky-400/60 rounded-full" />
          </div>
        </motion.div>

        {/* Powered by OpenClaw AI */}
        <motion.a
          href="https://openclaw.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-8 left-6 z-20 flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-lg">🦞</span>
          <span className="text-white/60 text-xs tracking-wide">
            Powered by <span className="font-medium text-white/80">OpenClaw AI</span>
          </span>
        </motion.a>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-32 bg-[#0d1f35] relative">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h60v60H0z\' fill=\'none\' stroke=\'%2338bdf8\' stroke-width=\'0.5\'/%3E%3C/svg%3E")' }} />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 
              className="text-4xl md:text-5xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Signals That <span className="text-sky-400">Actually Work</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              On-chain data, whale tracking, holder analysis — the signals that matter, delivered instantly to Telegram.
            </p>
          </motion.div>

          {/* Feature Grid - 3x2 */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#0a1628] border border-sky-500/10 rounded-2xl p-8 hover:border-sky-500/30 transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl bg-sky-500/10 flex items-center justify-center mb-6 ${feature.color} group-hover:bg-sky-500/20 transition-colors`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 
                  className="text-2xl font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  {feature.title}
                </h3>
                <p className="text-sky-400 text-sm font-medium mb-4">{feature.subtitle}</p>
                <p className="text-gray-400 mb-6 leading-relaxed">{feature.description}</p>
                <div className="flex flex-wrap gap-2">
                  {feature.stats.map((stat) => (
                    <span key={stat} className="text-xs bg-sky-500/10 px-3 py-1.5 rounded-lg text-sky-300 border border-sky-500/20">
                      {stat}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMMANDS SECTION ===== */}
      <section id="commands" className="py-32 bg-[#0a1628]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 
              className="text-4xl md:text-5xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Powerful <span className="text-sky-400">Commands</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Whale tracking, holder analysis, fresh graduations — all in one command.
            </p>
          </motion.div>

          {/* Command Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {commandExamples.map((cmd, index) => (
              <motion.div
                key={cmd.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-[#0d1f35] rounded-2xl border border-sky-500/10 overflow-hidden group hover:border-sky-500/30 transition-all duration-300"
              >
                {/* Header */}
                <div className="px-5 py-4 border-b border-sky-500/10 flex items-center justify-between">
                  <h3 className="text-white font-semibold">{cmd.title}</h3>
                  <span className="text-xs text-gray-500">{cmd.description}</span>
                </div>
                
                {/* Command Input */}
                <div className="px-5 py-3 bg-[#0a1628] border-b border-sky-500/10 font-mono text-sm">
                  <span className="text-gray-500">&gt;</span>{" "}
                  <span className="text-sky-400">{cmd.command}</span>
                </div>
                
                {/* Output - styled as Telegram HTML */}
                <div className="px-5 py-4 font-mono text-xs text-gray-300 whitespace-pre-line leading-relaxed min-h-[140px]">
                  {cmd.output.replace(/<b>/g, '').replace(/<\/b>/g, '').replace(/<code>/g, '').replace(/<\/code>/g, '')}
                </div>

                {/* CTA */}
                <div className="px-5 py-4 border-t border-sky-500/10 bg-[#0a1628]">
                  <a
                    href="https://t.me/BlueClawCallsBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Try in Telegram
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 relative overflow-hidden">
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 
              className="text-3xl md:text-5xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-figtree), Figtree" }}
            >
              Start Getting Alpha
            </h2>
            <p className="text-white/90 mb-10 text-lg max-w-xl mx-auto">
              Add BlueClaw to your Telegram group and catch PumpFun graduations before everyone else.
            </p>
            
            <a
              href="https://t.me/BlueClawCallsBot"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white text-sky-600 px-10 py-5 rounded-xl text-lg font-semibold hover:bg-sky-50 transition-all duration-200 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
            >
              <Send className="w-5 h-5" />
              Add to Telegram — Free
            </a>

            <p className="mt-8 text-white/60 text-sm">
              No credit card • 2 minute setup • Works with any group
            </p>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS BAR ===== */}
      <section className="py-16 bg-[#0d1f35] border-y border-sky-500/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "24/7", label: "Scanning", icon: Radio },
              { value: "< 45m", label: "Max Token Age", icon: Clock },
              { value: "6", label: "Policy Presets", icon: Shield },
              { value: "8.0+", label: "Avg Score", icon: TrendingUp },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="flex flex-col items-center"
              >
                <stat.icon className="w-6 h-6 text-sky-400 mb-3" />
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="w-full bg-[#0a1628] border-t border-sky-500/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                <h3
                  className="text-xl font-semibold text-white"
                  style={{ fontFamily: "var(--font-figtree), Figtree" }}
                >
                  <span className="text-sky-400">Blue</span>Claw
                </h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Alpha signal caller for Solana. Built native for Telegram.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href="https://x.com/BlueClawBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-500/10 text-gray-400 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://t.me/BlueClawCallsBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-500/10 text-gray-400 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                  aria-label="Telegram"
                >
                  <Send className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/openclaw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-sky-500/10 text-gray-400 hover:text-sky-400 hover:bg-sky-500/20 transition-colors"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Link Sections */}
            {[
              { 
                title: "Product", 
                links: [
                  { name: "Features", href: "#features" },
                  { name: "Commands", href: "#commands" },
                  { name: "Documentation", href: "/docs" },
                ] 
              },
              { 
                title: "Resources", 
                links: [
                  { name: "OpenClaw Docs", href: "https://docs.openclaw.ai" },
                  { name: "Telegram Bot", href: "https://t.me/BlueClawCallsBot" },
                  { name: "Status", href: "/status" },
                ] 
              },
              { 
                title: "Legal", 
                links: [
                  { name: "Privacy", href: "/privacy" },
                  { name: "Terms", href: "/terms" },
                  { name: "Security", href: "/security" },
                ] 
              },
            ].map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-medium text-white mb-4 uppercase tracking-wide">
                  {section.title}
                </h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <a 
                        href={link.href} 
                        target={link.href.startsWith("http") ? "_blank" : undefined}
                        rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                        className="text-sm text-gray-400 hover:text-sky-400 transition-colors"
                      >
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom Bar */}
          <div className="pt-10 mt-10 border-t border-sky-500/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} BlueClaw. Powered by OpenClaw AI.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-gray-500">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
