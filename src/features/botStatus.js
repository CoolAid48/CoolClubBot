const { ActivityType } = require('discord.js');

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

  const updateStatus = () => {
    const random = Math.floor(Math.random() * statuses.length);
    client.user.setActivity(statuses[random]);
  };

  updateStatus();
  return setInterval(updateStatus, 60000);
};
