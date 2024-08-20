require('dotenv').config();
const { Client, Events, IntentsBitField, ActivityType, GatewayIntentBits, SlashCommandBuilder, bold } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
      ],
    });

    client.on('ready', (c) => {
        console.log(`✅ ${c.user.username} is online.`);


// SLASH COMMANDS

      const ping = new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with "Pong!"');

      const pingCommand = ping.toJSON();
      client.application.commands.create(pingCommand, "883363142204293150");
      });
      
      client.on(Events.InteractionCreate, interaction => {
        if(!interaction.isChatInputCommand()) return;
        if(interaction.commandName === "ping"){
          interaction.reply("Pong!");
        }



      const slay = new SlashCommandBuilder()
        .setName('slay')
        .setDescription('Replies with "[user] is slayingggggggggggggggggg!"');

      const slayCommand = slay.toJSON();
      client.application.commands.create(slayCommand, "883363142204293150");
      });

      client.on(Events.InteractionCreate, interaction => {
        if(!interaction.isChatInputCommand()) return;
        if(interaction.commandName === "slay"){
          let user = interaction.options.getUser('user') || interaction.user; 
          
          interaction.reply(`${user.username} is slayingggggggggggggggggg!`);
        }



      const ding = new SlashCommandBuilder()
        .setName('ding')
        .setDescription('Replies with "Dong!"');

      const dingCommand = ding.toJSON();
      client.application.commands.create(dingCommand, "883363142204293150");
      });

      client.on(Events.InteractionCreate, interaction => {
        if(!interaction.isChatInputCommand()) return;
        if(interaction.commandName === "ding"){
          interaction.reply("Dong!");
        }
      });



// MESSAGES

      client.on('messageCreate', (message) => {
        if (message.author.bot) {
            return;
      }
    
      if (message.content === 'hello') {
        message.reply('Hello World! I am still in development and cannot interact with messages other than this simple "hello". One day, I will take over the roles of Carl-Bot and MEE6 and put them out of a job!');
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
          name: 'over the CoolClub',
          type: ActivityType.Watching,
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



// BOT TOKEN KEY

    client.login(process.env.TOKEN);
        

