const { EmbedBuilder } = require('discord.js');
const Birthday = require('../../models/Birthday');
const BIRTHDAY_CHECK = 60 * 60000; // checks hourly for new birthdays
const BIRTHDAY_CHANNEL_ID = '1288283039146967111';

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getBirthdayDateQuery(month, day, currentYear) {
  const dateChecks = [{ month, day }];

  // In non-leap years, celebrate Feb 29 birthdays on Feb 28.
  if (month === 2 && day === 28 && !isLeapYear(currentYear)) {
    dateChecks.push({ month: 2, day: 29 });
  }

  return dateChecks;
}

async function resolveBirthdayChannel(client, guildId, channelId = BIRTHDAY_CHANNEL_ID) {
  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.isDMBased?.()) {
    return null;
  }

  if (guildId && channel.guildId !== guildId) {
    return null;
  }

  return channel;
}

async function processBirthdayAnnouncements(client) {
  const now = new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const currentYear = now.getUTCFullYear();

  const birthdays = await Birthday.find({
    $and: [
      { $or: getBirthdayDateQuery(month, day, currentYear) },
      { lastAnnouncedYear: { $ne: currentYear } },
    ],
  });

  const birthdayChannel = await resolveBirthdayChannel(client, null);

  if (!birthdayChannel) {
    console.log(
      `Birthday announcement channel ${BIRTHDAY_CHANNEL_ID} is missing or inaccessible`
    );
    return;
  }

  for (const birthday of birthdays) {
    try {
      if (birthday.guildId !== birthdayChannel.guildId) {
        continue;
      }

      const birthdayUser = await client.users.fetch(birthday.userId).catch(() => null);
      const avatarUrl = birthdayUser?.displayAvatarURL({ extension: 'png', size: 256 });

      const birthdayEmbed = new EmbedBuilder(color = 0x1F69FF)
        .setColor(color)
        .setTitle('🎂 Happy Birthday!')
        .setDescription(`Everyone wish <@${birthday.userId}> a happy birthday! 🎉`)
        .setTimestamp();

        if (avatarUrl) {
        birthdayEmbed.setThumbnail(avatarUrl);
      }

      await birthdayChannel.send({ embeds: [birthdayEmbed] });

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
  }, BIRTHDAY_CHECK);
};