require('dotenv').config();
const { Client, Collection, Events, IntentsBitField, ActivityType, GatewayIntentBits, EmbedBuilder, Partials, AttachmentBuilder, Message } = require('discord.js');
const mongoose = require('mongoose');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('fs');
const path = require('node:path');
const axios = require('axios');
const eventHandler = require('./handlers/eventHandler');
const express = require('express');
const bodyParser = require('body-parser');
const readline = require('readline');

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

const discordWebhook = new WebhookClient({url:`https://discord.com/api/webhooks/1311508868219801661/NYqjdAgbZM-UUdsgIv26AkctFYR2eUj5gcvqUy6KT0SyLP0preIY80jYngBOjDzcOKwL`});
const app = express();
app.use(bodyParser.json());

const PORT = 3000;

// Map for social media feeds
const socialFeeds = {};

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
    name: 'Definitely Mod of the Month',
    type: ActivityType.Custom
  },
  {
    name: 'Watching over the CoolClub',
    type: ActivityType.Custom

  },
  {
    name: 'Shorter than Linkzzey',
    type: ActivityType.Custom

  },
  {
    name: 'Son of CoolAid48',
    type: ActivityType.Custom
  },
];

setInterval(() => {
  let random = Math.floor(Math.random() * status.length);
  client.user.setActivity(status[random]);
}, 15000);




// REACTION ROLES

// COLORS
const colorroleMap = {
  '🔴': '1288303742348951624', 
  '🟠': '1288303824104067142', 
  '🟡': '1288303888889544745', 
  '🟢': '1288303930148913243', 
  '🔵': '1288303966521655419', 
  '🟣': '1289622155352477798', 
  '⚪': '1288303998830510142',
  '⚫': '1288304085157679166',
};

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'Choose your color(s)!') {
    const roleId = colorroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleId);
      } catch (error) {
        console.error('Error adding role:', error);
      }
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'Choose your color(s)!') {
    const roleId = colorroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.remove(roleId);
      } catch (error) {
        console.error('Error removing role:', error);
      }
    }
  }
});



// REGIONS
const regionroleMap = {
  '🇺🇸': '1288306271434575901', 
  '🇧🇷': '1288306307551592468', 
  '🇪🇺': '1288306351436726354', 
  '🇮🇳': '1288306379794153482', 
  '🇿🇦': '1288306400249905163', 
  '🇦🇺': '1288306419166216193', 
};

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'Where are you from?') {
    const roleId = regionroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleId);
      } catch (error) {
        console.error('Error adding role:', error);
      }
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'Where are you from?') {
    const roleId = regionroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.remove(roleId);
      } catch (error) {
        console.error('Error removing role:', error);
      }
    }
  }
});



// PRONOUNS
const pronounroleMap = {
  '💙': '1288304271380709467', 
  '❤️': '1288304382848532481', 
  '🧡': '1288304479283707956', 
  '💛': '1288304419456421918', 
  '💚': '1288304450112589950', 
  '💜': '1288304509340356638', 
};

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'What are your pronouns?') {
    const roleId = pronounroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.add(roleId);
      } catch (error) {
        console.error('Error adding role:', error);
      }
    }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'What are your pronouns?') {
    const roleId = pronounroleMap[reaction.emoji.name];
    if (roleId) {
      try {
        const member = await reaction.message.guild.members.fetch(user.id);
        await member.roles.remove(roleId);
      } catch (error) {
        console.error('Error removing role:', error);
      }
    }
  }
});



// NOTIFICATIONS
const notifroleMap = {
  '1059660582107742279': '1059659428896456777', // Twitch Live emoji ID to role ID
  '1289753113489838112': '1162888442871562250', // Discord Events emoji ID to role ID
  '1059660273306308701': '1312243639866363986', // Shorts/TikToks emoji ID to role ID
  '1312237276226523166': '1312237678678511616', // X(Twitter)/Bluesky emoji ID to role ID
  '1312237556057767957': '1312238092697997364', // Instagram emoji ID to role ID
};

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'React if you would like to get Ping Notifications!') {
      const emojiId = reaction.emoji.id || reaction.emoji.name; // Get emoji ID for custom or name for Unicode
      const roleId = notifroleMap[emojiId];
      if (roleId) {
          try {
              const member = await reaction.message.guild.members.fetch(user.id);
              await member.roles.add(roleId);
          } catch (error) {
              console.error('Error adding role:', error);
          }
      }
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Check if the message has embeds
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'React if you would like to get Ping Notifications!') {
      const emojiId = reaction.emoji.id || reaction.emoji.name; // Get emoji ID for custom or name for Unicode
      const roleId = notifroleMap[emojiId];
      if (roleId) {
          try {
              const member = await reaction.message.guild.members.fetch(user.id);
              await member.roles.remove(roleId);
          } catch (error) {
              console.error('Error removing role:', error);
          }
      }
  }
});



// Logged Events

// Function to send an embed to the log channel
const sendLogEmbed = async (logChannel, title, description, color) => {
  const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();
  
  await logChannel.send({ embeds: [embed] });
};


// Log bans
client.on('guildBanAdd', async (guild, user) => {
  const logChannel = guild.channels.cache.find(channel => channel.id === '1291519148958158848'); // Change to your logging channel name
  if (logChannel) {
      const description = `**${user.tag}** has been banned from the server.`;
      await sendLogEmbed(logChannel, 'User Banned', description, '#FF0000'); // Red for bans
  }
});

// Log unbans (optional)
client.on('guildBanRemove', async (guild, user) => {
  const logChannel = guild.channels.cache.find(channel => channel.id === '1291519148958158848'); // Change to your logging channel name
  if (logChannel) {
      const description = `**${user.tag}** has been unbanned from the server.`;
      await sendLogEmbed(logChannel, 'User Unbanned', description, '#00FF00'); // Green for unbans
  }
});
