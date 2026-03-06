const { ActivityType } = require('discord.js');

// CUSTOM BOT STATUS + 15 SECOND INTERVAL
 let status = [
  {
    name: '24/7 CoolAid VODs',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',
  },
  {
    name: 'Mod of the Month',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',  
  },
  {
    name: 'Watching over the CoolClub',
    type: ActivityType.Streaming,
    url: 'https://www.twitch.tv/coolaid48',
  },
  {
    name: 'Shorter than Linkzzey',
    type: ActivityType.Streaming,                           
    url: 'https://www.twitch.tv/coolaid48',
  },
];

setInterval(() => {
  let random = Math.floor(Math.random() * status.length);
  client.user.setActivity(status[random]);
}, 15000);