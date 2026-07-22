const calculateLevelXp = require('../utils/calculateLevelXp');
const Level = require('../models/Level');
const config = require('../../config.json');
const cooldowns = new Set();

const prohibitedChannelIds = new Set(config.xp?.prohibitedChannelIds || []);

function getRandomXp(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = async (client, message) => {
  const cooldownKey = `${message.guild?.id}:${message.author.id}`;

  if (
    !message.inGuild() ||
    message.author.bot ||
    cooldowns.has(cooldownKey) ||
    prohibitedChannelIds.has(message.channel.id)
  ) return;

  cooldowns.add(cooldownKey);

  const xpToGive = getRandomXp(15, 25);

  const query = {
    userId: message.author.id,
    guildId: message.guild.id,
  };

  try {
    let level = await Level.findOne(query);

    if (level) {
      level.xp += xpToGive;

      if (level.xp >= calculateLevelXp(level.level)) {
        level.xp = 0;
        level.level += 1;

        const channel = client.channels.cache.get(config.xp?.xpLevelingChannel);
        if (channel) {
          await channel.send(`<:poggies:1277741483801317397> LETS GOO ${message.member}, congrats on reaching **level ${level.level}**!`);
        } else {
          console.log(`Invalid channel ID: ${config.xp?.xpLevelingChannel}`);
        }
      }

      await level.save();
    } else {
      level = new Level({
        userId: message.author.id,
        guildId: message.guild.id,
        xp: xpToGive,
      });

      await level.save();
    }
  } catch (error) {
    console.log(`Error giving xp: ${error}`);
  } finally {
    setTimeout(() => {
      cooldowns.delete(cooldownKey);
    }, 60000);
  }
};
