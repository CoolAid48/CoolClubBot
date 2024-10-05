const { AttachmentBuilder } = require('discord.js');
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');

module.exports = {
  name: 'rank',
  description: "Shows your rank.",

  async run(client, message, args) {
    // Check if the message is in a guild
    if (!message.guild) {
      await message.reply('You can only run this command inside a server.');
      return;
    }

    const mentionedUserId = message.mentions.users.first()?.id;
    const targetUserId = mentionedUserId || message.member.id;
    const targetUserObj = await message.guild.members.fetch(targetUserId);

    const fetchedLevel = await Level.findOne({
      userId: targetUserId,
      guildId: message.guild.id,
    });

    if (!fetchedLevel) {
      await message.reply("You don't have any levels yet. Chat a little more and try again.");
      return;
    }

    let allLevels = await Level.find({ guildId: message.guild.id }).select('-_id userId level xp');

    allLevels.sort((a, b) => {
      if (a.rank === b.rank) {
        return b.xp - a.xp;
      } else {
        return a.rank - b.rank;
      }
    });

    let currentRank = allLevels.findIndex((lvl) => lvl.userId === targetUserId) + 1;

    const rank = new canvacord.Rank()
      .setAvatar(targetUserObj.user.displayAvatarURL({ size: 256 }))
      .setRank(currentRank)
      .setLevel(fetchedLevel.level)
      .setCurrentXP(fetchedLevel.xp)
      .setRequiredXP(calculateLevelXp(fetchedLevel.level))
      .setProgressBar('#2E8B57', 'COLOR')
      .setUsername(targetUserObj.user.username)
      .setDiscriminator(targetUserObj.user.discriminator);

    const data = await rank.build();
    const attachment = new AttachmentBuilder(data, { name: 'rank.png' });
    await message.reply({ files: [attachment] });
  }
};
