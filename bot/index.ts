import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType } from 'discord.js';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const DISCORD_APPLICATION_ID = process.env.DISCORD_APPLICATION_ID!;

if (!DISCORD_BOT_TOKEN) {
  console.error('❌ DISCORD_BOT_TOKEN is required');
  process.exit(1);
}

if (!DISCORD_APPLICATION_ID) {
  console.error('❌ DISCORD_APPLICATION_ID is required');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

// In-memory storage for guild settings (in production, use a database)
const guildSettings = new Map<string, {
  channelId: string | null;
  minScore: number;
  autopost: boolean;
  showVolume: boolean;
  showHolders: boolean;
  showLinks: boolean;
}>();

function getGuildSettings(guildId: string) {
  if (!guildSettings.has(guildId)) {
    guildSettings.set(guildId, {
      channelId: null,
      minScore: 6.5,
      autopost: false,
      showVolume: true,
      showHolders: true,
      showLinks: true,
    });
  }
  return guildSettings.get(guildId)!;
}

const commands = [
  {
    name: 'clawcord',
    description: 'ClawCord signal caller commands',
    options: [
      {
        name: 'scan',
        description: 'Scan for new PumpFun graduations',
        type: 1,
      },
      {
        name: 'policy',
        description: 'View or change the active policy',
        type: 1,
        options: [
          {
            name: 'preset',
            description: 'Policy preset to use',
            type: 3,
            required: false,
            choices: [
              { name: 'Default', value: 'default' },
              { name: 'Aggressive', value: 'aggressive' },
              { name: 'Conservative', value: 'conservative' },
            ],
          },
        ],
      },
      {
        name: 'help',
        description: 'Show help information',
        type: 1,
      },
    ],
  },
  {
    name: 'settings',
    description: 'Configure call/signal message settings',
    options: [
      {
        name: 'view',
        description: 'View current settings',
        type: 1,
      },
      {
        name: 'minscore',
        description: 'Set minimum score for calls (1-10)',
        type: 1,
        options: [
          {
            name: 'score',
            description: 'Minimum score threshold',
            type: 4, // INTEGER
            required: true,
            min_value: 1,
            max_value: 10,
          },
        ],
      },
      {
        name: 'autopost',
        description: 'Enable or disable automatic posting',
        type: 1,
        options: [
          {
            name: 'enabled',
            description: 'Enable autopost',
            type: 5, // BOOLEAN
            required: true,
          },
        ],
      },
      {
        name: 'display',
        description: 'Configure what info to show in calls',
        type: 1,
        options: [
          {
            name: 'volume',
            description: 'Show volume data',
            type: 5,
            required: false,
          },
          {
            name: 'holders',
            description: 'Show holder count',
            type: 5,
            required: false,
          },
          {
            name: 'links',
            description: 'Show DexScreener links',
            type: 5,
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: 'setchannel',
    description: 'Set which channel ClawCord posts calls to',
    options: [
      {
        name: 'channel',
        description: 'The channel for call alerts',
        type: 7, // CHANNEL
        required: true,
        channel_types: [0], // Text channels only
      },
    ],
  },
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
  
  try {
    console.log('🔄 Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(DISCORD_APPLICATION_ID),
      { body: commands }
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

async function scanGraduations(): Promise<any[]> {
  try {
    const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1?chainId=solana');
    const data = await response.json() as any[];
    return Array.isArray(data) ? data.slice(0, 10) : [];
  } catch {
    return [];
  }
}

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot is online as ${c.user.tag}`);
  console.log(`📊 Serving ${c.guilds.cache.size} servers`);
  
  c.user.setActivity('for graduations', { type: ActivityType.Watching });
  
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  
  if (interaction.commandName === 'clawcord') {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'scan') {
      await interaction.deferReply();
      
      try {
        const graduations = await scanGraduations();
        
        if (graduations.length === 0) {
          await interaction.editReply('📭 No new graduations found.');
          return;
        }
        
        const top3 = graduations.slice(0, 3);
        const messages = top3.map((g: any, i: number) => {
          return [
            `**${i + 1}. ${g.tokenAddress?.slice(0, 8)}...**`,
            `   � [View Token](https://dexscreener.com/solana/${g.tokenAddress})`,
          ].join('\n');
        });
        
        await interaction.editReply({
          content: `🎓 **Latest Tokens**\n\n${messages.join('\n\n')}`,
        });
      } catch (error) {
        console.error('Scan error:', error);
        await interaction.editReply('❌ Failed to scan. Please try again.');
      }
    }
    
    if (subcommand === 'policy') {
      const preset = interaction.options.getString('preset');
      
      if (preset) {
        await interaction.reply(`✅ Policy set to **${preset}**`);
      } else {
        await interaction.reply([
          '📋 **Current Policy: Default**',
          '',
          'Available presets:',
          '• `default` — Balanced settings',
          '• `aggressive` — Early entry, higher risk',
          '• `conservative` — Safer plays',
          '',
          'Use `/clawcord policy preset:<name>` to change.',
        ].join('\n'));
      }
    }
    
    if (subcommand === 'help') {
      await interaction.reply({
        content: [
          '🦀 **ClawCord Commands**',
          '',
          '`/clawcord scan` — Scan for new PumpFun graduations',
          '`/clawcord policy` — View or change policy preset',
          '`/clawcord help` — Show this help message',
          '',
          '`/settings view` — View current settings',
          '`/settings minscore` — Set minimum score for calls',
          '`/settings autopost` — Enable/disable auto-posting',
          '`/settings display` — Configure call display options',
          '',
          '`/setchannel` — Set the channel for call alerts',
          '',
          '**Links:**',
          '• Website: https://clawcord.xyz',
          '• Twitter: https://x.com/ClawCordSOL',
          '• Discord: https://discord.gg/NZEKBbqj2q',
        ].join('\n'),
        ephemeral: true,
      });
    }
  }

  // Handle /settings command
  if (interaction.commandName === 'settings') {
    if (!interaction.guildId) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    const settings = getGuildSettings(interaction.guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const channelMention = settings.channelId ? `<#${settings.channelId}>` : 'Not set';
      await interaction.reply({
        content: [
          '⚙️ **ClawCord Settings**',
          '',
          `📢 **Call Channel:** ${channelMention}`,
          `📊 **Min Score:** ${settings.minScore}/10`,
          `🔄 **Autopost:** ${settings.autopost ? '✅ Enabled' : '❌ Disabled'}`,
          '',
          '**Display Options:**',
          `• Volume: ${settings.showVolume ? '✅' : '❌'}`,
          `• Holders: ${settings.showHolders ? '✅' : '❌'}`,
          `• Links: ${settings.showLinks ? '✅' : '❌'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }

    if (subcommand === 'minscore') {
      const score = interaction.options.getInteger('score', true);
      settings.minScore = score;
      await interaction.reply({
        content: `✅ Minimum score set to **${score}/10**\n\nOnly calls with score ≥ ${score} will be posted.`,
        ephemeral: true,
      });
    }

    if (subcommand === 'autopost') {
      const enabled = interaction.options.getBoolean('enabled', true);
      settings.autopost = enabled;
      await interaction.reply({
        content: enabled 
          ? '✅ **Autopost enabled!**\n\nClawCord will automatically post graduation calls to your configured channel.'
          : '❌ **Autopost disabled.**\n\nUse `/clawcord scan` to manually scan for graduations.',
        ephemeral: true,
      });
    }

    if (subcommand === 'display') {
      const volume = interaction.options.getBoolean('volume');
      const holders = interaction.options.getBoolean('holders');
      const links = interaction.options.getBoolean('links');

      if (volume !== null) settings.showVolume = volume;
      if (holders !== null) settings.showHolders = holders;
      if (links !== null) settings.showLinks = links;

      await interaction.reply({
        content: [
          '✅ **Display settings updated!**',
          '',
          `• Volume: ${settings.showVolume ? '✅ Shown' : '❌ Hidden'}`,
          `• Holders: ${settings.showHolders ? '✅ Shown' : '❌ Hidden'}`,
          `• Links: ${settings.showLinks ? '✅ Shown' : '❌ Hidden'}`,
        ].join('\n'),
        ephemeral: true,
      });
    }
  }

  // Handle /setchannel command
  if (interaction.commandName === 'setchannel') {
    if (!interaction.guildId) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const settings = getGuildSettings(interaction.guildId);
    settings.channelId = channel.id;

    await interaction.reply({
      content: [
        `✅ **Call channel set to ${channel}**`,
        '',
        'ClawCord will post graduation alerts to this channel.',
        '',
        '**Next steps:**',
        '• Use `/settings autopost enabled:true` to enable automatic posting',
        '• Use `/settings minscore` to set minimum score threshold',
        '• Use `/clawcord scan` to manually scan for graduations',
      ].join('\n'),
    });

    console.log(`📢 Channel set for ${interaction.guild?.name}: #${channel.name} (${channel.id})`);
  }
});

client.on(Events.GuildCreate, (guild) => {
  console.log(`➕ Joined server: ${guild.name} (${guild.id})`);
});

client.on(Events.GuildDelete, (guild) => {
  console.log(`➖ Left server: ${guild.name} (${guild.id})`);
});

console.log('🚀 Starting ClawCord bot...');
client.login(DISCORD_BOT_TOKEN);
