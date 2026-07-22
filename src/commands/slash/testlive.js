const { ApplicationCommandOptionType, MessageFlags, PermissionFlagsBits } = require('discord.js');
const {
  buildLiveNotificationPayload,
  fetchLiveEmbedMetadata,
  resolveAnnouncementChannel,
  LIVE_USERNAME,
} = require('../../features/liveNotifications');

const TEST_MINECRAFT_GAME_ID = '27471';
const TEST_MINECRAFT_BOX_ART_URL = 'https://static-cdn.jtvnw.net/ttv-boxart/27471_IGDB-{width}x{height}.jpg';
const TEST_CHANNEL_ICON_URL = process.env.TWITCH_CHANNEL_ICON_URL?.trim()
  || 'https://img.icons8.com/color/96/twitch--v2.png';

function buildFallbackMetadata(includeMinecraftBoxArt) {
  return {
    user: {
      profile_image_url: TEST_CHANNEL_ICON_URL,
    },
    game: includeMinecraftBoxArt
      ? { box_art_url: TEST_MINECRAFT_BOX_ART_URL }
      : null,
  };
}

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

    const category = interaction.options.getString('category') || 'Minecraft';
    const usesMinecraftCategory = category.trim().toLowerCase() === 'minecraft';
    const stream = {
      id: `test-${Date.now()}`,
      user_id: '0',
      user_login: LIVE_USERNAME.toLowerCase(),
      user_name: LIVE_USERNAME,
      title: interaction.options.getString('title') || 'Testing the CoolAid live notification',
      game_id: usesMinecraftCategory ? TEST_MINECRAFT_GAME_ID : null,
      game_name: category,
      started_at: new Date().toISOString(),
      thumbnail_url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${LIVE_USERNAME.toLowerCase()}-{width}x{height}.jpg`,
    };
    const pingRole = interaction.options.getBoolean('ping_role') || false;
    const fallbackMetadata = buildFallbackMetadata(usesMinecraftCategory);
    const fetchedMetadata = await fetchLiveEmbedMetadata(stream).catch((error) => {
      console.warn(`[command] /testlive could not fetch Twitch embed metadata: ${error.message}`);
      return null;
    });
    const metadata = {
      user: fetchedMetadata?.user || fallbackMetadata.user,
      game: fetchedMetadata?.game || fallbackMetadata.game,
    };

    await announcementChannel.send(await buildLiveNotificationPayload(stream, {
      pingRole,
      metadata,
    }));

    await interaction.reply({
      content: `Sent a test live notification to ${announcementChannel}.`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
