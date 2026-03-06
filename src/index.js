require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');

const eventHandler = require('./handlers/eventHandler');
const registerPrefixCommands = require('./features/prefixCommands');
const registerPresenceLiveRole = require('./features/presenceLiveRole');
const registerMessageReplies = require('./features/messageReplies');
const startBotStatus = require('./features/botStatus');
const registerTerminalMessenger = require('./features/terminalMessenger');
const registerStarboard = require('./features/starboard');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  disableEveryone: true,
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🛜  Connected to database!');

    eventHandler(client);
    registerPrefixCommands(client);
    registerPresenceLiveRole(client);
    registerMessageReplies(client);
    registerStarboard(client);
    registerTerminalMessenger(client);

    await client.login(process.env.TOKEN);
    console.log(`✅ ${client.user.username} is online.`);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
      console.error('Guild not found');
      return;
    }

    startBotStatus(client);
  } catch (error) {
    console.error(`Startup error: ${error}`);
  }
})();