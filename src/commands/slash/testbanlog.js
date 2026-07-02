const { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { buildBanLogEmbed, resolveModerationLogChannel } = require('../../utils/moderationLogs');

module.exports = {
  name: 'testbanlog',
  description: 'Sends a test ban log embed to the moderation logging channel.',
  permissionsRequired: [PermissionFlagsBits.ManageMessages],
  options: [
    {
      name: 'offender',
      description: 'User to show as the banned offender.',
      type: ApplicationCommandOptionType.User,
      required: false,
    },
    {
      name: 'reason',
      description: 'Reason to show in the test ban log.',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 512,
    },
  ],

  async callback(client, interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'Run this command inside the server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const logChannel = await resolveModerationLogChannel(client, interaction.guild.id);

    if (!logChannel) {
      await interaction.reply({
        content: 'I could not find or send to the moderation logging channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const offender = interaction.options.getUser('offender') || interaction.user;
    const reason = interaction.options.getString('reason') || 'Testing moderation log embed';
    const embed = buildBanLogEmbed({
      offender,
      moderator: interaction.user,
      reason,
      caseLabel: 'TEST',
    });

    await logChannel.send({ embeds: [embed] });

    await interaction.reply({
      content: `Sent a test ban log to ${logChannel}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
