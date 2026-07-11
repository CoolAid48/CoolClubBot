const { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const { getTrapSettings, setTrapSettings, clearTrapSettings } = require('../../utils/trapSettings');

module.exports = {
  name: 'trap',
  description: 'Configure a honeypot-style channel that bans anyone who messages in it.',
  permissionsRequired: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.BanMembers],

  options: [
    {
      name: 'channel',
      description: 'The channel to set as the trap.',
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: 'warning',
      description: 'The warning message to send to users who trigger the trap.',
      type: ApplicationCommandOptionType.String,
      required: true,
      min_length: 1,
      max_length: 2000,
    },
  ],

  async callback(client, interaction) {
    if (!interaction.inGuild()) {
      await interaction.reply({
        content: 'This command can only be used in a server.',
        ephemeral: true,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel', true);
    const warningText = interaction.options.getString('warning', true).trim();

    if (
      channel.guildId !== interaction.guild.id ||
      !channel.isTextBased?.() ||
      !channel.isSendable?.()
    ) {
      await interaction.reply({
        content: 'Please provide a valid text channel in this server.',
        ephemeral: true,
      });
      return;
    }

    const botMember = interaction.guild.members.me;
    const channelPermissions = channel.permissionsFor(botMember);

    const canSend = channel.isThread?.()
    ? channelPermissions?.has(PermissionFlagsBits.SendMessagesInThreads)
    : channelPermissions?.has(PermissionFlagsBits.SendMessages);

    if (
      !channelPermissions?.has(PermissionFlagsBits.ViewChannel) ||
      !canSend
    ) {
      await interaction.reply({
        content: 'I do not have permission to send messages in the specified channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const previousSettings = await getTrapSettings(interaction.guild.id);

    await setTrapSettings({
      guildId: interaction.guild.id,
      channelId: channel.id,
      warningMessageId: previousSettings?.warningMessageId || null,
      warningText,
      setBy: interaction.user.id,
    });

    let warningMessage;

    try {
      warningMessage = await channel.send({
        content: warningText,
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      if (previousSettings) {
        await setTrapSettings(previousSettings);
      } else {
        await clearTrapSettings(interaction.guild.id);
      }

      console.error('[trap] Error sending warning message:', error);

      await interaction.editReply({
        content: 'Failed to send the warning message in the specified channel. Please check my permissions and try again.',
      });
      return;
    }

    await setTrapSettings({
      guildId: interaction.guild.id,
      channelId: channel.id,
      warningMessageId: warningMessage.id,
      warningText,
      setBy: interaction.user.id,
    });

    await interaction.editReply({
      content: `Trap has been set in ${channel} with the specified warning message.`,
    });
  }
}