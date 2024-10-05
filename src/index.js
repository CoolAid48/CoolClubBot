require('dotenv').config();
const { Client, Collection, Events, IntentsBitField, ActivityType, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('node:fs');
const path = require('node:path');
const eventHandler = require('./handlers/eventHandler');

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

client.commands = new Collection();
    client.prefix = new Map(); 
    
    const prefixFolders = fs.readdirSync("./src/commands/prefix").filter((f) => f.endsWith(".js"));
    
    for (arx of prefixFolders) {
      const Cmd = require('./commands/prefix/' + arx)
      client.prefix.set(Cmd.name, Cmd)
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
  '1059660582107742279': '1059659428896456777', // TwitchSquad emoji ID to role ID
  '1059660273306308701': '1059659245278199889', // YoutubeSquad emoji ID to role ID
  '1289753113489838112': '1162888442871562250', // DiscordSquad emoji ID to role ID
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
