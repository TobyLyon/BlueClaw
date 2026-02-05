"use client";

import { Metadata } from "next";
import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, Book, Terminal, Code, Zap, Shield, Users, Target, 
  TrendingUp, Settings, Bot, Send, ChevronRight, Search, Menu, X,
  AlertTriangle, CheckCircle2, Info, ExternalLink, Copy, Check
} from "lucide-react";

const sections = [
  { id: "getting-started", title: "Getting Started", icon: Book },
  { id: "commands", title: "Commands Reference", icon: Terminal },
  { id: "signals", title: "Signal Analysis", icon: Target },
  { id: "policies", title: "Policy Presets", icon: Shield },
  { id: "autopost", title: "Autopost System", icon: Zap },
  { id: "scoring", title: "Scoring Algorithm", icon: TrendingUp },
  { id: "admin", title: "Admin Configuration", icon: Settings },
  { id: "api", title: "API Reference", icon: Code },
];

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-[#0a1628] border border-sky-500/10 rounded-lg p-4 overflow-x-auto text-sm">
        <code className="text-gray-300">{code}</code>
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 p-2 bg-sky-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sky-500/20"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );
}

function InfoBox({ type, children }: { type: "info" | "warning" | "success"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Info, iconColor: "text-sky-400" },
    warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertTriangle, iconColor: "text-amber-400" },
    success: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2, iconColor: "text-emerald-400" },
  };
  const style = styles[type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 flex gap-3`}>
      <Icon className={`w-5 h-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="text-sm text-gray-300">{children}</div>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map(s => document.getElementById(s.id));
      const scrollPosition = window.scrollY + 100;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1f35]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d1f35]/95 backdrop-blur-sm border-b border-sky-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-white hover:text-sky-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </Link>
            <div className="h-4 w-px bg-sky-500/20" />
            <h1 className="text-lg font-semibold text-white">
              <span className="text-sky-400">Blue</span>Claw Documentation
            </h1>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar - Table of Contents */}
        <aside className={`
          lg:block lg:w-64 lg:flex-shrink-0
          ${mobileMenuOpen ? "fixed inset-0 z-40 bg-[#0d1f35] p-6 pt-20" : "hidden"}
        `}>
          <nav className="sticky top-24">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Table of Contents
            </h2>
            <ul className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${activeSection === section.id 
                          ? "bg-sky-500/10 text-sky-400 border-l-2 border-sky-400" 
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                      {section.title}
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="mt-8 p-4 bg-sky-500/10 border border-sky-500/20 rounded-lg">
              <h3 className="text-sm font-medium text-white mb-2">Need Help?</h3>
              <p className="text-xs text-gray-400 mb-3">
                Join our Telegram for support and updates.
              </p>
              <a
                href="https://t.me/BlueClawCallsBot"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
              >
                <Send className="w-4 h-4" />
                Open Telegram
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Getting Started */}
          <section id="getting-started" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Book className="w-8 h-8 text-sky-400" />
              Getting Started
            </h2>
            <p className="text-gray-400 mb-8 text-lg">
              BlueClaw is a Telegram bot that tracks PumpFun token graduations and provides real-time 
              on-chain signals. Follow these steps to set up BlueClaw in your group.
            </p>

            <div className="space-y-6">
              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Step 1: Add the Bot</h3>
                <p className="text-gray-400 mb-4">
                  Click the button below to open BlueClaw in Telegram, then add it to your group.
                </p>
                <a
                  href="https://t.me/BlueClawCallsBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-400 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Add @BlueClawCallsBot
                </a>
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Step 2: Promote to Admin</h3>
                <p className="text-gray-400 mb-4">
                  BlueClaw needs admin permissions to post signals. Go to your group settings and promote the bot:
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    Open Group Info → Administrators
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    Add @BlueClawCallsBot as admin
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    Enable "Post Messages" permission
                  </li>
                </ul>
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Step 3: Configure Settings</h3>
                <p className="text-gray-400 mb-4">
                  Use the <code className="bg-sky-500/20 px-2 py-0.5 rounded text-sky-400">/config</code> command 
                  to customize your settings:
                </p>
                <CodeBlock code="/config" />
              </div>

              <InfoBox type="success">
                <strong>You&apos;re all set!</strong> BlueClaw will now scan for PumpFun graduations 
                and send signals to your group based on your configured policy.
              </InfoBox>
            </div>
          </section>

          {/* Commands Reference */}
          <section id="commands" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Terminal className="w-8 h-8 text-sky-400" />
              Commands Reference
            </h2>
            <p className="text-gray-400 mb-8">
              Complete list of all available BlueClaw commands.
            </p>

            <div className="space-y-4">
              {[
                { cmd: "/start", desc: "Initialize the bot and display welcome message" },
                { cmd: "/help", desc: "Show all available commands and their descriptions" },
                { cmd: "/scan", desc: "Manually scan for new PumpFun graduations" },
                { cmd: "/alpha", desc: "Get the latest high-confidence alpha signal" },
                { cmd: "/signals", desc: "View recent signals posted by the bot" },
                { cmd: "/lastcall", desc: "Display the most recent call made" },
                { cmd: "/status", desc: "Check bot status, uptime, and configuration" },
                { cmd: "/config", desc: "Open configuration panel with inline buttons" },
                { cmd: "/setrisk <1-10>", desc: "Set minimum confidence score for signals" },
                { cmd: "/autopost", desc: "Toggle automatic signal posting on/off" },
                { cmd: "/policy", desc: "View and change policy presets" },
                { cmd: "/mute", desc: "Temporarily mute all signals" },
                { cmd: "/unmute", desc: "Resume signal posting" },
              ].map((item) => (
                <div key={item.cmd} className="bg-[#0a1628] border border-sky-500/10 rounded-lg p-4 flex items-start gap-4">
                  <code className="bg-sky-500/20 px-3 py-1 rounded text-sky-400 font-mono text-sm whitespace-nowrap">
                    {item.cmd}
                  </code>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Signal Analysis */}
          <section id="signals" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Target className="w-8 h-8 text-sky-400" />
              Signal Analysis Commands
            </h2>
            <p className="text-gray-400 mb-8">
              Advanced on-chain analysis commands for deeper token insights.
            </p>

            <div className="grid gap-6">
              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">/whale &lt;mint&gt;</h3>
                <p className="text-gray-400 mb-4">
                  Track whale wallet activity for any token. Shows accumulation patterns, 
                  distribution signals, and large holder movements.
                </p>
                <CodeBlock code="/whale So11111111111111111111111111111111111111112" />
                <div className="mt-4 text-sm text-gray-500">
                  <strong>Output includes:</strong> Top 10 holder concentration, whale accumulation/distribution status, 
                  largest holder size, and time since last major movement.
                </div>
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">/holders &lt;mint&gt;</h3>
                <p className="text-gray-400 mb-4">
                  Deep dive into token holder distribution. Analyze holder growth, 
                  concentration risk, and LP status.
                </p>
                <CodeBlock code="/holders EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" />
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">/fresh</h3>
                <p className="text-gray-400 mb-4">
                  List the most recent PumpFun graduations within the last 15 minutes. 
                  Perfect for catching early entries.
                </p>
                <CodeBlock code="/fresh" />
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">/momentum &lt;mint&gt;</h3>
                <p className="text-gray-400 mb-4">
                  Technical momentum analysis including volume trends, price action, 
                  and buy/sell ratios.
                </p>
                <CodeBlock code="/momentum TokenMintAddress123" />
              </div>

              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-2">/risk &lt;mint&gt;</h3>
                <p className="text-gray-400 mb-4">
                  Comprehensive risk assessment including LP lock status, mint authority, 
                  freeze authority, and holder concentration.
                </p>
                <CodeBlock code="/risk TokenMintAddress123" />
              </div>
            </div>
          </section>

          {/* Policy Presets */}
          <section id="policies" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Shield className="w-8 h-8 text-sky-400" />
              Policy Presets
            </h2>
            <p className="text-gray-400 mb-8">
              BlueClaw includes 6 pre-configured policy presets optimized for different trading styles.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                { 
                  name: "Default", 
                  risk: "Medium",
                  desc: "Balanced settings for most groups. Good mix of opportunity and safety.",
                  minScore: 7,
                  maxAge: "30m"
                },
                { 
                  name: "Aggressive", 
                  risk: "High",
                  desc: "Early entry focus. Higher risk tolerance for potentially bigger gains.",
                  minScore: 5,
                  maxAge: "45m"
                },
                { 
                  name: "Conservative", 
                  risk: "Low",
                  desc: "Safety first. Only signals tokens with proven metrics and lower risk.",
                  minScore: 8,
                  maxAge: "20m"
                },
                { 
                  name: "Degen", 
                  risk: "Very High",
                  desc: "Maximum exposure. Catches everything, relies on speed over safety.",
                  minScore: 4,
                  maxAge: "60m"
                },
                { 
                  name: "Sniper", 
                  risk: "Medium-High",
                  desc: "Quick entries on fresh grads only. Time-sensitive signals.",
                  minScore: 6,
                  maxAge: "15m"
                },
                { 
                  name: "Whale", 
                  risk: "Medium",
                  desc: "Focuses on tokens with significant whale accumulation patterns.",
                  minScore: 7,
                  maxAge: "30m"
                },
              ].map((policy) => (
                <div key={policy.name} className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">{policy.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      policy.risk === "Low" ? "bg-emerald-500/20 text-emerald-400" :
                      policy.risk === "Medium" ? "bg-sky-500/20 text-sky-400" :
                      policy.risk === "Medium-High" ? "bg-amber-500/20 text-amber-400" :
                      policy.risk === "High" ? "bg-orange-500/20 text-orange-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>
                      {policy.risk} Risk
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-4">{policy.desc}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Min Score: <strong className="text-white">{policy.minScore}/10</strong></span>
                    <span>Max Age: <strong className="text-white">{policy.maxAge}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <InfoBox type="info">
              Change your policy anytime using <code className="bg-sky-500/20 px-1 rounded">/policy</code>. 
              The new settings apply immediately to all future signals.
            </InfoBox>
          </section>

          {/* Autopost System */}
          <section id="autopost" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Zap className="w-8 h-8 text-sky-400" />
              Autopost System
            </h2>
            <p className="text-gray-400 mb-8">
              BlueClaw continuously scans for PumpFun graduations and automatically posts signals 
              that match your configured policy.
            </p>

            <div className="space-y-6">
              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
                <ol className="space-y-4">
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-semibold">1</span>
                    <div>
                      <strong className="text-white">Continuous Scanning</strong>
                      <p className="text-gray-400 text-sm">BlueClaw monitors DexScreener for new PumpFun token graduations 24/7.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-semibold">2</span>
                    <div>
                      <strong className="text-white">Scoring & Filtering</strong>
                      <p className="text-gray-400 text-sm">Each token is scored based on liquidity, holder distribution, volume, and on-chain metrics.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-semibold">3</span>
                    <div>
                      <strong className="text-white">Policy Matching</strong>
                      <p className="text-gray-400 text-sm">Tokens that meet your policy&apos;s minimum score and filters are sent as signals.</p>
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-sky-500/20 rounded-full flex items-center justify-center text-sky-400 font-semibold">4</span>
                    <div>
                      <strong className="text-white">Signal Delivery</strong>
                      <p className="text-gray-400 text-sm">Formatted call cards are posted to your group with all relevant data and quick-action buttons.</p>
                    </div>
                  </li>
                </ol>
              </div>

              <InfoBox type="warning">
                <strong>Rate Limits:</strong> To prevent spam, autopost has a cooldown period between signals. 
                High-quality signals are prioritized.
              </InfoBox>
            </div>
          </section>

          {/* Scoring Algorithm */}
          <section id="scoring" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-sky-400" />
              Scoring Algorithm
            </h2>
            <p className="text-gray-400 mb-8">
              Every token receives a confidence score from 1-10 based on multiple on-chain factors.
            </p>

            <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-sky-500/10">
                  <tr>
                    <th className="text-left p-4 text-white font-semibold">Factor</th>
                    <th className="text-left p-4 text-white font-semibold">Weight</th>
                    <th className="text-left p-4 text-white font-semibold">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sky-500/10">
                  <tr>
                    <td className="p-4 text-gray-300">Liquidity</td>
                    <td className="p-4 text-sky-400">25%</td>
                    <td className="p-4 text-gray-400">Total liquidity in USD and LP token distribution</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300">Holder Distribution</td>
                    <td className="p-4 text-sky-400">20%</td>
                    <td className="p-4 text-gray-400">Top holder concentration and growth rate</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300">Volume</td>
                    <td className="p-4 text-sky-400">20%</td>
                    <td className="p-4 text-gray-400">24h trading volume and buy/sell ratio</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300">Token Age</td>
                    <td className="p-4 text-sky-400">15%</td>
                    <td className="p-4 text-gray-400">Time since graduation (fresher = higher score)</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300">Security</td>
                    <td className="p-4 text-sky-400">10%</td>
                    <td className="p-4 text-gray-400">Mint/freeze authority, LP lock status</td>
                  </tr>
                  <tr>
                    <td className="p-4 text-gray-300">Social Signals</td>
                    <td className="p-4 text-sky-400">10%</td>
                    <td className="p-4 text-gray-400">Website, Twitter, Telegram presence</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Admin Configuration */}
          <section id="admin" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Settings className="w-8 h-8 text-sky-400" />
              Admin Configuration
            </h2>
            <p className="text-gray-400 mb-8">
              Only group admins can modify BlueClaw settings. Here&apos;s how to configure your bot.
            </p>

            <div className="space-y-4">
              <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Configuration Options</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <code className="bg-sky-500/20 px-2 py-1 rounded text-sky-400 text-sm">/setrisk 8</code>
                    <p className="text-gray-400 text-sm">Set minimum score to 8/10. Only high-confidence signals will be posted.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <code className="bg-sky-500/20 px-2 py-1 rounded text-sky-400 text-sm">/autopost</code>
                    <p className="text-gray-400 text-sm">Toggle automatic posting. Disable to only receive manual scans.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <code className="bg-sky-500/20 px-2 py-1 rounded text-sky-400 text-sm">/policy</code>
                    <p className="text-gray-400 text-sm">Switch between preset policies (Default, Aggressive, Conservative, etc.)</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <code className="bg-sky-500/20 px-2 py-1 rounded text-sky-400 text-sm">/mute</code>
                    <p className="text-gray-400 text-sm">Temporarily pause all signals without changing settings.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section id="api" className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Code className="w-8 h-8 text-sky-400" />
              API Reference
            </h2>
            <p className="text-gray-400 mb-8">
              BlueClaw exposes a webhook endpoint for receiving Telegram updates. 
              For custom integrations, contact us on Telegram.
            </p>

            <div className="bg-[#0a1628] border border-sky-500/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Webhook Endpoint</h3>
              <CodeBlock code="POST /api/telegram/webhook" />
              <p className="text-gray-400 text-sm mt-4">
                The webhook receives updates from Telegram and processes commands. 
                Authentication is handled via the <code className="bg-sky-500/20 px-1 rounded">X-Telegram-Bot-Api-Secret-Token</code> header.
              </p>
            </div>

            <InfoBox type="info">
              <strong>Coming Soon:</strong> Public API for querying token scores, graduation history, 
              and whale tracking data. Join our Telegram for updates.
            </InfoBox>
          </section>
        </main>
      </div>
    </div>
  );
}
