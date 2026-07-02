const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const LiveNotification = require('../models/LiveNotification');

const LIVE_USERNAME = 'CoolAid48';
const ANNOUNCEMENT_CHANNEL_ID = '1291519148958158848'; //#stream-notifs 898921447320334396
const PING_ROLE_ID = '1059659428896456777';
const POLL_INTERVAL_MS = 2 * 60 * 1000;
const LIVE_COLOR = 0x9146ff;

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
let isChecking = false;

function getLiveUrl(username = LIVE_USERNAME) {
  return `https://www.twitch.tv/${username.toLowerCase()}`;
}

function getThumbnailUrl(stream) {
  if (!stream.thumbnail_url) {
    return null;
  }

  return stream.thumbnail_url
    .replace('{width}', '1280')
    .replace('{height}', '720');
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function getFooterText(date = new Date()) {
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();

  return `CoolAid's Club • Stream Notifs • ${monthName} ${ordinal(day)}, ${year}`;
}

async function getTwitchAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessTokenExpiresAt > now + 60000) {
    return cachedAccessToken;
  }

  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET');
  }

  const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
    params: {
      client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials',
    },
  });

  cachedAccessToken = response.data.access_token;
  cachedAccessTokenExpiresAt = now + (response.data.expires_in * 1000);

  return cachedAccessToken;
}

async function fetchLiveStream() {
  const accessToken = await getTwitchAccessToken();

  const response = await axios.get('https://api.twitch.tv/helix/streams', {
    params: {
      user_login: LIVE_USERNAME.toLowerCase(),
    },
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data?.[0] || null;
}

async function resolveAnnouncementChannel(client) {
  const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased?.() || channel.isDMBased?.() || !channel.isSendable?.()) {
    return null;
  }

  return channel;
}

function buildLiveEmbed(stream) {
  const liveUrl = getLiveUrl(stream.user_login || LIVE_USERNAME);
  const thumbnailUrl = getThumbnailUrl(stream);

  const embed = new EmbedBuilder()
    .setColor(LIVE_COLOR)
    .setTitle(`${stream.user_name || LIVE_USERNAME} is live!`)
    .setURL(liveUrl)
    .setDescription(stream.title || 'Come hang out on stream!')
    .addFields(
      {
        name: 'Category',
        value: stream.game_name || 'Just Chatting',
        inline: true,
      },
      {
        name: 'Watch',
        value: `[Open Twitch](${liveUrl})`,
        inline: true,
      }
    )
    .setFooter({ text: getFooterText(stream.started_at ? new Date(stream.started_at) : new Date()) });

  if (thumbnailUrl) {
    embed.setImage(`${thumbnailUrl}?t=${Date.now()}`);
  }

  return embed;
}

function buildLiveNotificationPayload(stream, options = {}) {
  const shouldPingRole = options.pingRole ?? true;
  const liveUrl = getLiveUrl(stream.user_login || LIVE_USERNAME);
  const roleMention = shouldPingRole ? `<@&${PING_ROLE_ID}> ` : '';

  return {
    content: `Hey ${roleMention} CoolAid is now live! \n${liveUrl} <:coolai2Hype:1494459960216653896> `,
    embeds: [buildLiveEmbed(stream)],
    allowedMentions: {
      roles: shouldPingRole ? [PING_ROLE_ID] : [],
    },
  };
}

async function checkLiveStatus(client) {
  if (isChecking) {
    return;
  }

  isChecking = true;

  try {
    const stream = await fetchLiveStream();

    if (!stream) {
      return;
    }

    const username = LIVE_USERNAME.toLowerCase();
    const notificationState = await LiveNotification.findOneAndUpdate(
      { username },
      { $setOnInsert: { username } },
      {
        new: true, upsert: true, setDefaultsOnInsert: true,
      }
    );

    if (notificationState.lastStreamId === stream.id) {
      return;
    }

    const channel = await resolveAnnouncementChannel(client);

    if (!channel) {
      console.error('[live] Announcement channel not found or unavailable.');
      return;
    }

    await channel.send(buildLiveNotificationPayload(stream));

    notificationState.lastStreamId = stream.id;
    notificationState.lastAnnouncedAt = new Date();
    await notificationState.save();

    console.log(`[live] Announced stream ${stream.id} for ${LIVE_USERNAME}.`);
  } catch (error) {
    console.error(`[live] Failed to check live status: ${error.message}`);
  } finally {
    isChecking = false;
  }
}

function registerLiveNotifications(client) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    console.log('[live] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET. Live notifications disabled.');
    return;
  }

  setTimeout(() => {
    checkLiveStatus(client);
    setInterval(() => {
      checkLiveStatus(client);
    }, POLL_INTERVAL_MS);
  }, 10000);
}

module.exports = registerLiveNotifications;
module.exports.buildLiveNotificationPayload = buildLiveNotificationPayload;
module.exports.resolveAnnouncementChannel = resolveAnnouncementChannel;
module.exports.LIVE_USERNAME = LIVE_USERNAME;
