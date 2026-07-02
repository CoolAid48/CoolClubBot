const { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  buildLiveNotificationPayload,
  resolveAnnouncementChannel,
  LIVE_USERNAME,
} = require('../../features/liveNotifications');

module.exports = {
  name: 'testlive',
  description: 'Sends a test live notification to the stream notification channel.',
  permissionsRequired: [PermissionFlagsBits.ManageMessages],
  options: [
    {
      name: 'title',
      description: 'Test stream title to show in the embed.',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 140,
    },
    {
      name: 'category',
      description: 'Test stream category to show in the embed.',
      type: ApplicationCommandOptionType.String,
      required: false,
      max_length: 80,
    },
    {
      name: 'ping_role',
      description: 'Whether to ping the live notification role for this test.',
      type: ApplicationCommandOptionType.Boolean,
      required: false,
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

    const announcementChannel = await resolveAnnouncementChannel(client);

    if (!announcementChannel) {
      await interaction.reply({
        content: 'I could not find or send to the live notification channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const stream = {
      id: `test-${Date.now()}`,
      user_login: LIVE_USERNAME.toLowerCase(),
      user_name: LIVE_USERNAME,
      title: interaction.options.getString('title') || 'Testing the CoolAid live notification',
      game_name: interaction.options.getString('category') || 'Just Chatting',
      started_at: new Date().toISOString(),
      thumbnail_url: 'https://static-cdn.jtvnw.net/previews-ttv/live_user_coolaid48-{width}x{height}.jpg',
    };
    const pingRole = interaction.options.getBoolean('ping_role') || false;

    await announcementChannel.send(buildLiveNotificationPayload(stream, {
      isTest: true,
      pingRole,
    }));

    await interaction.reply({
      content: `Sent a test live notification to ${announcementChannel}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
