require('dotenv').config();
const { Client, Collection, Events, IntentsBitField, ActivityType, GatewayIntentBits, WebhookClient, EmbedBuilder, Partials, AttachmentBuilder, Message, ChannelType } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('node:path');
const axios = require('axios');
const eventHandler = require('./handlers/eventHandler');
const readline = require('readline');

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');



const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions
    ],
    disableEveryone: true,
    partials : [Partials.Message, Partials.Channel, Partials.Reaction]
    
});

// BOT AND DATABASE CONNECTIONS
(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🛜  Connected to database!');

        eventHandler(client);
        
        // Log in the bot
        client.login(process.env.TOKEN).then(() => {
            console.log(`✅ ${client.user.username} is online.`);

            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            if (!guild) {
                console.error('Guild not found');
                return;
            }

            // Twitch Live AutoRole logic here
            client.on('presenceUpdate', async (oldPresence, newPresence) => {
              const member = newPresence.member;
              const role = newPresence.guild.roles.cache.get(process.env.LIVE_ROLE_ID);
          
              // Check current and previous streaming status
              const isStreamingNow = newPresence.activities.some(activity => activity.type ===  ActivityType.Streaming);
              const wasStreamingBefore = oldPresence ? oldPresence.activities.some(activity => activity.type === ActivityType.Streaming) : false;
                    
              if (isStreamingNow && !wasStreamingBefore) {
                  // User just started streaming
                  if (!member.roles.cache.has(process.env.LIVE_ROLE_ID)) {
                      await member.roles.add(role).catch(console.error);
                      console.log(`Added role to ${member.user.tag} (streaming)`);
                  }
              } else if (!isStreamingNow && wasStreamingBefore) {
                  // User just stopped streaming
                  if (member.roles.cache.has(process.env.LIVE_ROLE_ID)) {
                      await member.roles.remove(role).catch(console.error);
                      console.log(`Removed role from ${member.user.tag} (not streaming)`);
                  }
              }
          });
          
          // Command collections
client.commands = new Collection();
client.prefix = new Map();

// Load prefix commands
const prefixFolders = fs.readdirSync("./src/commands/prefix").filter(f => f.endsWith(".js"));
for (const file of prefixFolders) {
    const Cmd = require(`./commands/prefix/${file}`);
    client.prefix.set(Cmd.name, Cmd);
}

// Handle messages
client.on('messageCreate', async (message) => {
    const prefix = "!";

    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    // Handle other commands
    const prefixcmd = client.prefix.get(commandName);
    if (prefixcmd) {
        try {
            await prefixcmd.run(client, message, args); // Call the command's run function
        } catch (error) {
            console.error(error);
            await message.reply('There was an error executing that command.');
        }
    }
});
        }).catch(console.error);
    } catch (error) {
        console.log(`DB Error: ${error}`);
    }    
})();


  // Event Handlers

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for(const file of eventFiles){
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if(event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// Message Commands peepoWish

client.on('messageCreate', (message) => {
  if (message.author.bot) {
      return;
}

if (message.content === 'hello') {
  message.reply('Hello! I am CoolClubBot and I\'ll be helping out around here for the mods, always in development... <:binoculars:1267649939941363773>');
}
});

// CUSTOM BOT STATUS + 15 SECOND INTERVAL

 let status = [
  {
    name: '24/7 CoolAid VODs',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',
  },
  {
    name: '"Mod of the Month"',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',  },
  {
    name: 'eyes on the CoolClub',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',
  },
  {
    name: 'shorter than Linkzzey',
    type: ActivityType.Streaming,                           
    url: 'https://www.twitch.tv/coolaid48',
  },
];

setInterval(() => {
  let random = Math.floor(Math.random() * status.length);
  client.user.setActivity(status[random]);
}, 15000);

// SEND MESSAGES AS THE BOT

const BOT_CHANNEL_ID = '1288283039146967111'; 

/*
staff-lounge    919278682806296596
general         883363142204293152
announcements   902983875238715405
vip-chat        982830372398198794
code-chat       995336131300294676
birthdays       1288283039146967111     
*/

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.on('line', async (input) => {
  if (input.toLowerCase() === 'exit') {
      rl.close();
      client.destroy();
      return;
  }

  try {
      const channel = await client.channels.fetch(BOT_CHANNEL_ID);
      if (channel && channel.type === ChannelType.GuildText) {
          await channel.send(input);
          console.log(`Message sent: ${input}`);
      } else {
          console.log('Channel not found or not a text channel');
      }
  } catch (error) {
      console.error('Error sending message:', error);
  }
});

// STARBOARD SYSTEM

const EMOJI = '1337589969526722693';
const THRESHOLD = 3;
const STARBOARD_CHANNEL_ID = '1340016566296776728'; 

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Failed to fetch reaction:', error);
            return;
        }
    }

    const { message, emoji } = reaction;

    if (emoji.name !== EMOJI && emoji.id !== EMOJI) return;

    if (reaction.count >= THRESHOLD) {
        const starboardChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);

        if (!starboardChannel || !starboardChannel.isTextBased()) {
            console.error('Starboard channel not found or is not text-based.');
            return;
        }

        const fetchedMessages = await starboardChannel.messages.fetch({ limit: 100 });
        const existingMessage = fetchedMessages.find(msg =>
            msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Message ID: ${message.id}`
        );

        if (existingMessage) return;

        // Starboard Embed
        const embed = {
            color: 0x0070e9,
            author: {
                name: message.author.tag,
                icon_url: message.author.displayAvatarURL({ dynamic: true })
            },
            description: message.content || '*[No content]*',
            fields: [
                {
                    name: `Source: ${message.channel}`,
                    value: `[Go to channel](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`
                }
            ],
            footer: {
                text: `Message ID: ${message.id}`
            },
            timestamp: new Date()
        };

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment && attachment.contentType?.startsWith('image')) {
                embed.image = { url: attachment.url };
            }
        }

        // Send the embed
        await starboardChannel.send({ embeds: [embed] });
    }
});

const app = express();
app.use(express.json());

// Start servers
app.listen(process.env.PORT || 3000, () => 
  console.log(`🌐 Webhook server running!\n Port: ${process.env.PORT || 3000}`)
);