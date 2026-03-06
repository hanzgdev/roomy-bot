const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers
  ]
});

const tempChannels = new Map();

client.on('ready', () => {
  console.log('Roomy is online!');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !createvc <name>
  if (message.content.startsWith('!createvc')) {
    const name = message.content.slice(10).trim();
    if (!name) return message.reply('Usage: `!createvc <channel name>` — example: `!createvc gaming session`');

    // check if user already has a temp channel
    if (tempChannels.has(message.author.id)) {
      return message.reply('You already have an active voice channel! Delete it first with `!deletevc`');
    }

    try {
      const channel = await message.guild.channels.create({
        name: `🔊 ${name}`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          {
            id: message.guild.id,
            allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel],
          },
          {
            id: message.author.id,
            allow: [
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          }
        ]
      });

      tempChannels.set(message.author.id, channel.id);
      message.reply(`✅ Your voice channel **${name}** has been created! Join it and it'll auto delete when everyone leaves.`);

    } catch (e) {
      message.reply('❌ Failed to create channel. Make sure I have the right permissions!');
    }
  }

  // !deletevc
  else if (message.content === '!deletevc') {
    const channelId = tempChannels.get(message.author.id);
    if (!channelId) return message.reply('You don\'t have an active voice channel!');

    try {
      const channel = message.guild.channels.cache.get(channelId);
      if (channel) await channel.delete();
      tempChannels.delete(message.author.id);
      message.reply('✅ Your voice channel has been deleted!');
    } catch (e) {
      message.reply('❌ Could not delete the channel!');
    }
  }

  // !rename <new name>
  else if (message.content.startsWith('!rename')) {
    const newName = message.content.slice(8).trim();
    if (!newName) return message.reply('Usage: `!rename <new name>`');

    const channelId = tempChannels.get(message.author.id);
    if (!channelId) return message.reply('You don\'t have an active voice channel!');

    try {
      const channel = message.guild.channels.cache.get(channelId);
      await channel.setName(`🔊 ${newName}`);
      message.reply(`✅ Channel renamed to **${newName}**!`);
    } catch (e) {
      message.reply('❌ Could not rename the channel!');
    }
  }

  // !limit <number>
  else if (message.content.startsWith('!limit')) {
    const limit = parseInt(message.content.split(' ')[1]);
    if (isNaN(limit) || limit < 0 || limit > 99) return message.reply('Usage: `!limit <number>` — example: `!limit 5`');

    const channelId = tempChannels.get(message.author.id);
    if (!channelId) return message.reply('You don\'t have an active voice channel!');

    try {
      const channel = message.guild.channels.cache.get(channelId);
      await channel.setUserLimit(limit);
      message.reply(`✅ User limit set to **${limit}**!`);
    } catch (e) {
      message.reply('❌ Could not set the limit!');
    }
  }

  // !lock
  else if (message.content === '!lock') {
    const channelId = tempChannels.get(message.author.id);
    if (!channelId) return message.reply('You don\'t have an active voice channel!');

    try {
      const channel = message.guild.channels.cache.get(channelId);
      await channel.permissionOverwrites.edit(message.guild.id, {
        Connect: false
      });
      message.reply('🔒 Your channel is now locked!');
    } catch (e) {
      message.reply('❌ Could not lock the channel!');
    }
  }

  // !unlock
  else if (message.content === '!unlock') {
    const channelId = tempChannels.get(message.author.id);
    if (!channelId) return message.reply('You don\'t have an active voice channel!');

    try {
      const channel = message.guild.channels.cache.get(channelId);
      await channel.permissionOverwrites.edit(message.guild.id, {
        Connect: true
      });
      message.reply('🔓 Your channel is now unlocked!');
    } catch (e) {
      message.reply('❌ Could not unlock the channel!');
    }
  }
});

// Auto delete when channel is empty
client.on('voiceStateUpdate', async (oldState, newState) => {
  if (!oldState.channelId) return;

  const channel = oldState.channel;
  if (!channel) return;

  // check if it's a temp channel
  const ownerId = [...tempChannels.entries()].find(([, id]) => id === channel.id)?.[0];
  if (!ownerId) return;

  // if channel is empty delete it
  if (channel.members.size === 0) {
    try {
      await channel.delete();
      tempChannels.delete(ownerId);
      console.log(`Auto deleted empty channel: ${channel.name}`);
    } catch (e) {
      console.log('Could not auto delete channel');
    }
  }
});

client.login(process.env.TOKEN);
