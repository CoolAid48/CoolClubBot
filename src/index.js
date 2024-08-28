require('dotenv').config();
const { Client, Collection, Events, IntentsBitField, PermissionsBitField, ActivityType, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const eventHandler = require('./handlers/eventHandler');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildPresences,
        IntentsBitField.Flags.MessageContent,
        ],
    });

    client.commands = new Collection();
    client.prefix = new Map(); 
    
    const prefixFolders = fs.readdirSync("./src/commands/prefix").filter((f) => f.endsWith(".js"));
    
    for (arx of prefixFolders) {
      const Cmd = require('./commands/prefix/' + arx)
      client.prefix.set(Cmd.name, Cmd)
    }
    


// BOT AND DATABASE CONNECTIONS

    (async () => {
      try {
        await mongoose.connect(process.env.MONGODB_URI)
      console.log('🛜  Connected to database!')
    
      eventHandler(client);
      
      client.login(process.env.TOKEN);
      } catch (error) {
        console.log(`DB Error: ${error}`);
      }
    })();

  
// Prefix COMMANDS

client.on('messageCreate', async message => {
  const prefix = "!";
  
  if (!message.content.startsWith(prefix) || message.author.bot) return;
  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const prefixcmd = client.prefix.get(command);
  if (prefixcmd) {
    prefixcmd.run(client, message, args)
  }
});



// First Message peepoWish

client.on('messageCreate', (message) => {
  if (message.author.bot) {
      return;
}

if (message.content === 'hello') {
  message.reply('Hello World! I am still in development, but will soon be taking over the jobs of Carl-bot and Mee6, so be on the lookout! <:binoculars:1267649939941363773>');
}
});

// CUSTOM BOT STATUS + 10 SECOND INTERVAL

let status = [
  {
    name: '24/7 CoolAid VODs',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',
  },
  {
    name: 'Definitely Mod of the Month',
    type: ActivityType.Custom
  },
  {
    name: 'Watching over the CoolClub',
    type: ActivityType.Custom,
  },
  {
    name: 'Shorter than Linkzzey',
    type: ActivityType.Custom,
  },
  {
    name: 'Son of CoolAid48',
    type: ActivityType.Custom,
  },
];

setInterval(() => {
  let random = Math.floor(Math.random() * status.length);
  client.user.setActivity(status[random]);
}, 10000);