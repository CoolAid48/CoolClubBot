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
}, 60000);



// REACTION ROLE - Verification

client.on('messageCreate', async (message) => {
  const channelId = '927239577331183658'; // Replace with your channel ID
  const channel = await client.channels.fetch(channelId);
  
  if (message.content === '!verifyRoles') {
    const embed = new EmbedBuilder()
      .setTitle('DISCORD SERVER RULES')
      .setDescription('\n• Respect the staff and especially each other. Use common sense, obey Discord TOS, listen to the mods, and don\'t be stupid\n\n• Keep all channels English only\n\n• Do not directly discuss your age\n\n• All forms of racism, homophobia, xenophobia, sexism, or any other hate towards others is never tolerated and will result in an instant ban. This server doesn\'t promote harassment or bullying\n\n• Do not self promote anywhere in the server; this includes talking about your content, channels, or asking for streaming advice\n\n• No discussions about politics, religion, or other topics that can be considered controversial\n\n• Please do not share personal information, both in this server or in DMs, whether you care personally or not\n\n• No NSFW stuff at all, and no EXCESSIVE swearing\n\n• Do not spam/flood chat, write a message out fully. Do not spam ping anybody\n\n• Absolutely no asking for gifted subs or roles, and do not ask why other people have roles that you do not')
      .setThumbnail('https://media.discordapp.net/attachments/919278682806296596/1301339454203760670/mod.png?ex=6781b8cf&is=6780674f&hm=dcedae9a74b2d8148c5f1a38ed92e61627ec277c14353ffc8b3678892ced2085&=&format=webp&quality=lossless')
      .setColor('#0070e9')
      .setFooter({
        text: 'Violation of the rules can result in any punishment from a short mute to a permanent ban. Follow the rules, and you\'ll be fine. Have fun exploring the server and welcome to the Club!',
        iconURL: 'https://media.discordapp.net/attachments/919278682806296596/1301339454455283744/partner.png?ex=6781b8cf&is=6780674f&hm=f7c597ff6d852109ff1d6bc945d67a6b87c45b05fcbd9152143b782b1b1f3497&=&format=webp&quality=lossless',
      });

    const sentMessage = await channel.send({ embeds: [embed] });
    await sentMessage.react('1292293381829169172'); // Use the correct custom emoji ID here
  }
});

// PRONOUNS
const verifyRoleMap = {
  '1292293381829169172': '919711530428289064', // Custom emoji ID mapped to role ID
};

client.on('messageReactionAdd', async (reaction, user) => {
  if (reaction.partial) await reaction.fetch();
  if (reaction.message.partial) await reaction.message.fetch();
  if (user.bot || !reaction.message.guild) return;

  // Only check custom emojis by ID
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'DISCORD SERVER RULES') {
    const roleId = verifyRoleMap[reaction.emoji.id];
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

  // Only check custom emojis by ID
  if (reaction.message.embeds.length > 0 && reaction.message.embeds[0].title === 'DISCORD SERVER RULES') {
    const roleId = verifyRoleMap[reaction.emoji.id];
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

const DISCORD_WEBHOOK_URL = "YOUR_DISCORD_WEBHOOK_URL";

app.post("/fourthwall-webhook", async (req, res) => {
  console.log("Received Webhook:", req.body); // Debugging
  const order = req.body;

  if (!order.customer || !order.items) {
      console.log("Webhook payload is missing expected properties!");
      return res.status(400).send("Invalid webhook payload");
  }

  const message = {
      content: `📦 **New Order Received!**\n
      **Customer:** ${order.customer.name}\n
      **Items:** ${order.items.map(i => `${i.name} (x${i.quantity})`).join(", ")}\n
      **Total:** $${order.total}\n
      **Order ID:** ${order.id}`
  };

  try {
      await axios.post(DISCORD_WEBHOOK_URL, message);
      console.log("Sent message to Discord");
      res.status(200).send("Sent to Discord");
  } catch (error) {
      console.error("Error sending to Discord:", error);
      res.status(500).send("Error");
  }
});


// Start servers
app.listen(process.env.PORT || 3000, () => 
  console.log(`🌐 Webhook server running!\n Port: ${process.env.PORT || 3000}`)
);

// TIMEOUT LOGIC

const mutedRoleId = '1348768565259403356';

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        // Check if timeout status changed
        if (oldMember.communicationDisabledUntilTimestamp === newMember.communicationDisabledUntilTimestamp) return;

        const hadTimeout = oldMember.communicationDisabledUntilTimestamp > Date.now();
        const hasTimeout = newMember.communicationDisabledUntilTimestamp > Date.now();

        // Get the muted role
        const mutedRole = newMember.guild.roles.cache.get(mutedRoleId);
        if (!mutedRole) {
            console.error('Muted role not found');
            return;
        }

        // Add/remove role based on timeout status
        if (hasTimeout && !hadTimeout) {
            // Timeout was applied
            if (!newMember.roles.cache.has(mutedRoleId)) {
                await newMember.roles.add(mutedRole);
                console.log(`Added muted role to ${newMember.user.tag}`);
            }
        } else if (!hasTimeout && hadTimeout) {
            // Timeout was removed
            if (newMember.roles.cache.has(mutedRoleId)) {
                await newMember.roles.remove(mutedRole);
                console.log(`Removed muted role from ${newMember.user.tag}`);
            }
        }
    } catch (error) {
        console.error('Error handling timeout role update:', error);
    }
});