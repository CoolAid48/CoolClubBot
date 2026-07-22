require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');

const eventHandler = require('./handlers/eventHandler');
const registerSlashCommands = require('./handlers/slashCommandHandler');
const registerPrefixCommands = require('./handlers/prefixCommandHandler');
const startBotStatus = require('./features/botStatus');
const registerFridgeBoard = require('./features/fridgeBoard');
const registerLiveNotifications = require('./features/liveNotifications');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🛜  Connected to database!');

    eventHandler(client);
    registerPrefixCommands(client);
    registerFridgeBoard(client);
    const syncSlashCommands = registerSlashCommands(client);

    await client.login(process.env.TOKEN);
    console.log(`✅ ${client.user.username} is online.`);

    try {
      await syncSlashCommands();
    } catch (error) {
      console.error('[commands] Failed to sync slash commands:', error);
    }

    startBotStatus(client);
    registerLiveNotifications(client);
  } catch (error) {
    console.error('Startup error:', error);
  }
})();
