const { ActivityType } = require('discord.js');

// CUSTOM BOT STATUS + 60 SECOND INTERVAL
module.exports = (client) => {
  const statuses = [
    {
      name: 'Streaming 24/7 CoolAid VODs',
      type: ActivityType.Custom,
    },
    {
      name: 'Mod of the Month',
      type: ActivityType.Custom,
    },
    {
      name: 'Watching over the CoolClub',
      type: ActivityType.Custom,
    },
    {
      name: 'Taller than CoolAid',
      type: ActivityType.Custom,
    },
  ];

  setInterval(() => {
    const random = Math.floor(Math.random() * statuses.length);
    client.user.setActivity(statuses[random]);
  }, 60000);
};