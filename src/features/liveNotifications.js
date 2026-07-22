const axios = require('axios');
const { EmbedBuilder } = require('discord.js');
const LiveNotification = require('../models/LiveNotification');
const {
  TwitchEventSubClient,
  TwitchTokenManager,
} = require('./twitchEventSub');

const LIVE_USERNAME = 'CoolAid48';
const ANNOUNCEMENT_CHANNEL_ID = '898921447320334396';
const PING_ROLE_ID = '1059659428896456777';
const FALLBACK_POLL_INTERVAL_MS = 30 * 1000;
const TOKEN_VALIDATION_INTERVAL_MS = 60 * 60 * 1000;
const EVENT_STREAM_RETRY_DELAYS_MS = [0, 1000, 2000];
const TWITCH_REQUEST_TIMEOUT_MS = 5000;
const LIVE_COLOR = 0x0257b3;
const TWITCH_ICON_URL = 'https://img.icons8.com/color/96/twitch--v2.png';
const TWITCH_CHANNEL_ICON_URL = process.env.TWITCH_CHANNEL_ICON_URL?.trim() || null;

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;
let liveWorkQueue = Promise.resolve();

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

function getBoxArtUrl(game) {
  if (!game?.box_art_url) {
    return null;
  }

  return game.box_art_url
    .replace('{width}', '144')
    .replace('{height}', '192');
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
    timeout: TWITCH_REQUEST_TIMEOUT_MS,
    params: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    },
  });

  cachedAccessToken = response.data.access_token;
  cachedAccessTokenExpiresAt = now + (response.data.expires_in * 1000);

  return cachedAccessToken;
}

async function fetchLiveStream() {
  const accessToken = await getTwitchAccessToken();

  const response = await axios.get('https://api.twitch.tv/helix/streams', {
    timeout: TWITCH_REQUEST_TIMEOUT_MS,
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

function buildStreamFromOnlineEvent(event) {
  return {
    id: event.id,
    user_id: event.broadcaster_user_id,
    user_login: event.broadcaster_user_login,
    user_name: event.broadcaster_user_name,
    type: event.type,
    started_at: event.started_at,
    title: null,
    game_id: null,
    game_name: null,
    thumbnail_url: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${event.broadcaster_user_login}-{width}x{height}.jpg`,
  };
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

async function fetchStreamForOnlineEvent(event) {
  for (const delayMs of EVENT_STREAM_RETRY_DELAYS_MS) {
    if (delayMs) {
      await wait(delayMs);
    }

    let stream;

    try {
      stream = await fetchLiveStream();
    } catch {
      return buildStreamFromOnlineEvent(event);
    }

    if (stream?.id === event.id) {
      return stream;
    }
  }

  return buildStreamFromOnlineEvent(event);
}

async function fetchTwitchUser(stream) {
  const accessToken = await getTwitchAccessToken();
  const userLogin = stream.user_login || LIVE_USERNAME.toLowerCase();
  const hasUsableUserId = stream.user_id && stream.user_id !== '0';

  const response = await axios.get('https://api.twitch.tv/helix/users', {
    timeout: TWITCH_REQUEST_TIMEOUT_MS,
    params: hasUsableUserId
      ? { id: stream.user_id }
      : { login: userLogin },
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data?.[0] || null;
}

async function fetchTwitchGame(stream) {
  if (!stream.game_id) {
    return null;
  }

  const accessToken = await getTwitchAccessToken();
  const response = await axios.get('https://api.twitch.tv/helix/games', {
    timeout: TWITCH_REQUEST_TIMEOUT_MS,
    params: {
      id: stream.game_id,
    },
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data.data?.[0] || null;
}

async function fetchLiveEmbedMetadata(stream) {
  const [user, game] = await Promise.all([
    fetchTwitchUser(stream).catch(() => null),
    fetchTwitchGame(stream).catch(() => null),
  ]);

  return { user, game };
}

async function resolveAnnouncementChannel(client) {
  const channel = await client.channels.fetch(ANNOUNCEMENT_CHANNEL_ID).catch(() => null);

  if (!channel || !channel.isTextBased?.() || channel.isDMBased?.() || !channel.isSendable?.()) {
    return null;
  }

  return channel;
}

function buildLiveEmbed(stream, metadata = {}) {
  const liveUrl = getLiveUrl(stream.user_login || LIVE_USERNAME);
  const displayName = stream.user_name || LIVE_USERNAME;
  const thumbnailUrl = getThumbnailUrl(stream);
  const boxArtUrl = getBoxArtUrl(metadata.game);
  const author = {
    name: displayName,
    url: liveUrl,
  };
  const profileImageUrl = metadata.user?.profile_image_url || TWITCH_CHANNEL_ICON_URL;

  if (profileImageUrl) {
    author.iconURL = profileImageUrl;
  }

  const embed = new EmbedBuilder()
    .setColor(LIVE_COLOR)
    .setAuthor(author)
    .setTitle(`${displayName} is now live on Twitch!`)
    .setURL(liveUrl)
    .setDescription(stream.title || `${displayName} is live!`)
    .addFields({
      name: 'Playing',
      value: stream.game_name || 'Just Chatting',
      inline: false,
    })
    .setFooter({
      text: 'Twitch Streams',
      iconURL: TWITCH_ICON_URL,
    })
    .setTimestamp(stream.started_at ? new Date(stream.started_at) : new Date());

  if (boxArtUrl) {
    embed.setThumbnail(boxArtUrl);
  }

  if (thumbnailUrl) {
    embed.setImage(`${thumbnailUrl}?t=${Date.now()}`);
  }

  return embed;
}

async function buildLiveNotificationPayload(stream, options = {}) {
  const shouldPingRole = options.pingRole ?? true;
  const liveUrl = getLiveUrl(stream.user_login || LIVE_USERNAME);
  const metadata = options.metadata ?? await fetchLiveEmbedMetadata(stream);
  const roleMention = shouldPingRole ? `<@&${PING_ROLE_ID}> ` : '';

  return {
    content: `Hey ${roleMention}CoolAid is now live!\n${liveUrl} <:coolai2Hype:1494459960216653896>`,
    embeds: [buildLiveEmbed(stream, metadata)],
    allowedMentions: {
      roles: shouldPingRole ? [PING_ROLE_ID] : [],
    },
  };
}

async function announceLiveStream(client, stream) {
  const username = LIVE_USERNAME.toLowerCase();
  const notificationState = await LiveNotification.findOneAndUpdate(
    { username },
    { $setOnInsert: { username } },
    {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    },
  );

  if (notificationState.lastStreamId === stream.id) {
    return;
  }

  const channel = await resolveAnnouncementChannel(client);

  if (!channel) {
    throw new Error('Announcement channel not found or unavailable');
  }

  await channel.send(await buildLiveNotificationPayload(stream));

  notificationState.lastStreamId = stream.id;
  notificationState.lastAnnouncedAt = new Date();
  await notificationState.save();

  console.log(`[live] Announced stream ${stream.id} for ${LIVE_USERNAME}.`);
}

async function checkLiveStatus(client) {
  const stream = await fetchLiveStream();

  if (stream) {
    await announceLiveStream(client, stream);
  }
}

function enqueueLiveWork(label, work) {
  liveWorkQueue = liveWorkQueue
    .then(work)
    .catch((error) => {
      console.error(`[live] ${label}: ${error.message}`);
    });

  return liveWorkQueue;
}

async function startTwitchEventSub(client) {
  const tokenManager = new TwitchTokenManager({
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    initialAccessToken: process.env.TWITCH_USER_ACCESS_TOKEN,
    initialRefreshToken: process.env.TWITCH_REFRESH_TOKEN,
    requestTimeoutMs: TWITCH_REQUEST_TIMEOUT_MS,
  });

  await tokenManager.getAccessToken();
  const twitchUser = await fetchTwitchUser({ user_login: LIVE_USERNAME.toLowerCase() });

  if (!twitchUser?.id) {
    throw new Error(`Could not resolve Twitch user ID for ${LIVE_USERNAME}`);
  }

  const eventSub = new TwitchEventSubClient({
    clientId: process.env.TWITCH_CLIENT_ID,
    broadcasterUserId: twitchUser.id,
    getAccessToken: () => tokenManager.getAccessToken(),
    onStreamOnline: (event) => enqueueLiveWork(
      'Failed to process EventSub stream.online event',
      async () => announceLiveStream(client, await fetchStreamForOnlineEvent(event)),
    ),
  });

  eventSub.start();

  setInterval(() => {
    tokenManager.getAccessToken().catch((error) => {
      console.error(`[live:eventsub] Twitch token validation failed: ${error.message}`);

      if (error.response?.status === 400 || error.response?.status === 401) {
        eventSub.stop();
      }
    });
  }, TOKEN_VALIDATION_INTERVAL_MS);
}

function registerLiveNotifications(client) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    console.log('[live] Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET. Live notifications disabled.');
    return;
  }

  setTimeout(() => {
    enqueueLiveWork('Failed to check live status', () => checkLiveStatus(client));

    startTwitchEventSub(client).catch((error) => {
      console.error(`[live:eventsub] Could not start EventSub: ${error.message}`);
      console.log('[live] Continuing with 30-second polling fallback.');
    });

    setInterval(() => {
      enqueueLiveWork('Failed to check live status', () => checkLiveStatus(client));
    }, FALLBACK_POLL_INTERVAL_MS);
  }, 10000);
}

module.exports = registerLiveNotifications;
module.exports.buildLiveNotificationPayload = buildLiveNotificationPayload;
module.exports.buildStreamFromOnlineEvent = buildStreamFromOnlineEvent;
module.exports.fetchLiveEmbedMetadata = fetchLiveEmbedMetadata;
module.exports.LIVE_USERNAME = LIVE_USERNAME;
module.exports.resolveAnnouncementChannel = resolveAnnouncementChannel;
module.exports.startTwitchEventSub = startTwitchEventSub;
