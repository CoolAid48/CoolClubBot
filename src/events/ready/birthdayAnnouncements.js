const { EmbedBuilder } = require('discord.js');
const Birthday = require('../../models/Birthday');
const BirthdaySettings = require('../../models/BirthdaySettings');

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

function getTodayDateChecks(now) {
  const localYear = now.getFullYear();
  const utcYear = now.getUTCFullYear();

  const dates = [
    ...getBirthdayDateQuery(now.getMonth() + 1, now.getDate(), localYear),
    ...getBirthdayDateQuery(now.getUTCMonth() + 1, now.getUTCDate(), utcYear),
  ];

  const uniqueDates = [];

  for (const date of dates) {
    if (!uniqueDates.some((item) => item.month === date.month && item.day === date.day)) {
      uniqueDates.push(date);
    }
  }

  return {
    dates: uniqueDates,
    years: [...new Set([localYear, utcYear])],
  };
}

async function resolveBirthdayChannel(client, guildId, fallbackChannelId = BIRTHDAY_CHANNEL_ID) {
  const settings = await BirthdaySettings.findOne({ guildId }).select('channelId').lean();
  const configuredChannelId = settings?.channelId || fallbackChannelId;

  if (!configuredChannelId) {
    return null;
  }

  const channel = await client.channels.fetch(configuredChannelId).catch(() => null);

  if (!channel || !channel.isTextBased() || channel.isDMBased?.() || !channel.isSendable?.()) {
    return null;
  }

  if (guildId && channel.guildId !== guildId) {
    return null;
  }

  return channel;
}

async function resolveFallbackGuildBirthdayChannel(client, guildId) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);

  if (!guild) {
    return null;
  }

  const guildChannels = await guild.channels.fetch().catch(() => null);

  if (!guildChannels) {
    return null;
  }

  return (
    guildChannels.find(
      (channel) =>
        channel
        && channel.isTextBased?.()
        && !channel.isDMBased?.()
        && channel.isSendable?.()
        && channel.name?.toLowerCase() === 'birthdays'
    ) || null
  );
}

async function processBirthdayAnnouncements(client, source = 'scheduled') {
  const now = new Date();
  const { dates, years } = getTodayDateChecks(now);

  console.log(
    `[birthdays:${source}] Checking birthdays for dates: ${dates
      .map((date) => `${date.month}/${date.day}`)
      .join(', ')} | years: ${years.join(', ')}`
  );

  const birthdays = await Birthday.find({
    $and: [
      { $or: dates },
      { lastAnnouncedYear: { $nin: years } },
    ],
  });

  if (!birthdays.length) {
    console.log(`[birthdays:${source}] No birthdays to announce.`);
    return;
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const birthday of birthdays) {
    try {
      let birthdayChannel = await resolveBirthdayChannel(client, birthday.guildId);

      if (!birthdayChannel) {
        birthdayChannel = await resolveFallbackGuildBirthdayChannel(client, birthday.guildId);
      }

      if (!birthdayChannel) {
        skippedCount += 1;
        console.log(
          `[birthdays:${source}] Missing/inaccessible birthday channel for guild ${birthday.guildId}`
        );
        continue;
      }

      const birthdayUser = await client.users.fetch(birthday.userId).catch(() => null);
      const avatarUrl = birthdayUser?.displayAvatarURL({ extension: 'png', size: 256 });

      const birthdayEmbed = new EmbedBuilder()
        .setColor(0x1F69FF)
        .setTitle('🎂 Happy Birthday!')
        .setDescription(`Everyone wish <@${birthday.userId}> a happy birthday! 🎉`)
        .setTimestamp();

      if (avatarUrl) {
        birthdayEmbed.setThumbnail(avatarUrl);
      }

      await birthdayChannel.send({ embeds: [birthdayEmbed] });

      birthday.lastAnnouncedYear = now.getFullYear();
      await birthday.save();
      sentCount += 1;
    } catch (error) {
      skippedCount += 1;
      console.log(
        `[birthdays:${source}] Birthday announcement error for guild ${birthday.guildId}: ${error}`
      );
    }
  }

  console.log(`[birthdays:${source}] Completed. Sent: ${sentCount}, Skipped: ${skippedCount}`);
}

module.exports = async (client) => {
  setInterval(() => {
    processBirthdayAnnouncements(client, 'scheduled').catch((error) => {
      console.log(`Scheduled birthday announcement check failed: ${error}`);
    });
  }, BIRTHDAY_CHECK);
};