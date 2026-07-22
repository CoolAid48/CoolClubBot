const {
  ApplicationCommandOptionType,
  MessageFlags,
  PermissionFlagsBits,
} = require('discord.js');

const MODERATOR_PERMISSION = PermissionFlagsBits.ModerateMembers;

module.exports = {
  name: 'say',
  description: 'MOD-ONLY: Have the bot say a message.',
  defaultMemberPermissions: MODERATOR_PERMISSION,
  permissionsRequired: [MODERATOR_PERMISSION],
  options: [
    {
      name: 'message',
      description: 'The message for the bot to say.',
      type: ApplicationCommandOptionType.String,
      required: true,
      max_length: 2000,
    },
  ],

  async callback(client, interaction) {
    if (!interaction.channel?.isSendable?.()) {
      await interaction.reply({
        content: 'I cannot send messages in this channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const message = interaction.options.getString('message', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.channel.send({
      content: message,
      allowedMentions: { parse: [] },
    });
    await interaction.deleteReply().catch(() => null);

    console.log(`[commands] /say used by ${interaction.user.tag} in ${interaction.channelId}.`);
  },
};
