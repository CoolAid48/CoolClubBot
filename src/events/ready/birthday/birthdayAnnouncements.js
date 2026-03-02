const Birthday = require('../../models/Birthday');
const BirthdaySettings = require('../../models/BirthdaySettings');

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // checks hourly for new birthdays

async function processBirthdayAnnouncements(client) {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const currentYear = now.getUTCFullYear();

  const birthdays = await Birthday.find({
    month,
    day,
    $or: [
      { lastAnnouncedYear: { $ne: currentYear } },
      { lastAnnouncedYear: null },
    ],
  });

  for (const birthday of birthdays) {
    try {
      const settings = await BirthdaySettings.findOne({ guildId: birthday.guildId });
      if (!settings?.channelId) {
        continue;
      }

      const guild = await client.guilds.fetch(birthday.guildId).catch(() => null);
      if (!guild) {
        continue;
      }

      const channel = await guild.channels.fetch(settings.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        continue;
      }

      const roleMention = settings.roleId ? `<@&${settings.roleId}> ` : '';

      await channel.send(
        `🎉 ${roleMention}Happy birthday <@${birthday.userId}>! Wishing you an awesome day! 🎂`
      );

      birthday.lastAnnouncedYear = currentYear;
      await birthday.save();
    } catch (error) {
      console.log(`Birthday announcement error for guild ${birthday.guildId}: ${error}`);
    }
  }
}

module.exports = async (client) => {
  // Initial run shortly after startup.
  setTimeout(() => {
    processBirthdayAnnouncements(client).catch((error) => {
      console.log(`Initial birthday announcement check failed: ${error}`);
    });
  }, 15 * 1000);

  setInterval(() => {
    processBirthdayAnnouncements(client).catch((error) => {
      console.log(`Scheduled birthday announcement check failed: ${error}`);
    });
  }, CHECK_INTERVAL_MS);
};