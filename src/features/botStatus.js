const { ActivityType } = require('discord.js');

// CUSTOM BOT STATUS + 60 SECOND INTERVAL
module.exports = (client) => {
  const statuses = [
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
    const random = Math.floor(Math.random() * statuses.length);
    client.user.setActivity(statuses[random]);
  }, 60000);
};