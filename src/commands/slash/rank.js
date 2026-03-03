const { AttachmentBuilder } = require('discord.js');
const canvacord = require('canvacord');
const calculateLevelXp = require('../../utils/calculateLevelXp');
const Level = require('../../models/Level');

module.exports = {
  name: 'rank',
  description: 'Shows your rank.',

  async callback(client, interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'You can only run this command inside a server.',
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.user;

    const fetchedLevel = await Level.findOne({
      userId: targetUser.id,
      guildId: interaction.guild.id,
    });

    if (!fetchedLevel) {
      await interaction.reply({
        content: "You don't have any levels yet. Chat a little more and try again.",
        ephemeral: true,
      });
      return;
    }

    const allLevels = await Level.find({ guildId: interaction.guild.id }).select(
      '-_id userId level xp'
    );

    allLevels.sort((a, b) => {
      if (a.level === b.level) {
        return b.xp - a.xp;
      }

      return b.level - a.level;
    });

    const currentRank = allLevels.findIndex((lvl) => lvl.userId === targetUser.id) + 1;

    await interaction.deferReply();

    try {
      const targetMember = await interaction.guild.members.fetch(targetUser.id);
      const avatarUrl = targetMember.user.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 256,
      });

      const rank = new canvacord.Rank()
        .setAvatar(avatarUrl)
        .setRank(currentRank)
        .setLevel(fetchedLevel.level)
        .setCurrentXP(fetchedLevel.xp)
        .setRequiredXP(calculateLevelXp(fetchedLevel.level))
        .setProgressBar('#2E8B57', 'COLOR')
        .setUsername(targetMember.user.username);

      const data = await rank.build();
      const attachment = new AttachmentBuilder(data, { name: 'rank.png' });

      await interaction.editReply({ files: [attachment] });
    } catch (error) {
      console.error('Failed to build rank card:', error);
      await interaction.editReply({
        content: `You're currently **rank #${currentRank}** at **level ${fetchedLevel.level}** with **${fetchedLevel.xp} XP**.`,
      });
    }
  },
};