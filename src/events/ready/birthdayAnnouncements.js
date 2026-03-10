const { EmbedBuilder } = require('discord.js');
const Birthday = require('../../models/Birthday');
const BirthdaySettings = require('../../models/BirthdaySettings');

const BIRTHDAY_ANNOUNCEMENT_HOUR_UTC = 5; // 5 AM UTC, 12 AM EST, 9 PM PST
const BIRTHDAY_ANNOUNCEMENT_INTERVAL = 24 * 60 * 60000;
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

function getFooterText() {
  const now = new Date();

  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const day = now.getDate();
  const year = now.getFullYear();

  return `Birthdays by CCB • ${monthName} ${ordinal(day)}, ${year}`;
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function getTodayDateChecks(now) {
  const utcYear = now.getUTCFullYear();

  return {
    dates: getBirthdayDateQuery(now.getUTCMonth() + 1, now.getUTCDate(), utcYear),
    years: [utcYear],
  };
}

function getMsUntilNextUtcHour(targetHourUtc, now = new Date()) {
  const nextRun = new Date(now);
  nextRun.setUTCHours(targetHourUtc, 0, 0, 0);

  if (nextRun <= now) {
    nextRun.setUTCDate(nextRun.getUTCDate() + 1);
  }

  return nextRun.getTime() - now.getTime();
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
        .setTitle(`Happy Birthday! 🎂`)
        .setDescription(`Everyone wish <@${birthday.userId}> a happy birthday!`)
        .setFooter({ text: getFooterText() });

      if (avatarUrl) {
        birthdayEmbed.setThumbnail(avatarUrl);
      }

      await birthdayChannel.send({ embeds: [birthdayEmbed] });

      birthday.lastAnnouncedYear = now.getUTCFullYear();
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
  const runScheduledBirthdayCheck = () => {
    processBirthdayAnnouncements(client, 'scheduled').catch((error) => {
      console.log(`Scheduled birthday announcement check failed: ${error}`);
    });
  };

  const initialDelay = getMsUntilNextUtcHour(BIRTHDAY_ANNOUNCEMENT_HOUR_UTC);

  setTimeout(() => {
    runScheduledBirthdayCheck();

    setInterval(() => {
      runScheduledBirthdayCheck();
    }, BIRTHDAY_ANNOUNCEMENT_INTERVAL);
  }, initialDelay);
};