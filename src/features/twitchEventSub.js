const axios = require('axios');
const WebSocket = require('ws');
const TwitchOAuthToken = require('../models/TwitchOAuthToken');

const EVENTSUB_WEBSOCKET_URL = 'wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=30';
const EVENTSUB_SUBSCRIPTIONS_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const MAX_RECONNECT_DELAY_MS = 30000;

class TwitchTokenManager {
  constructor(options) {
    this.clientId = options.clientId?.trim() || null;
    this.clientSecret = options.clientSecret?.trim() || null;
    this.accessToken = options.initialAccessToken?.trim() || null;
    this.refreshToken = options.initialRefreshToken?.trim() || null;
    this.tokenModel = options.tokenModel || TwitchOAuthToken;
    this.httpClient = options.httpClient || axios;
    this.requestTimeoutMs = options.requestTimeoutMs || 5000;

    this.initializePromise = null;
    this.refreshPromise = null;
    this.tokensPersisted = false;
  }

  initialize() {
    if (!this.initializePromise) {
      this.initializePromise = this.loadPersistedTokens();
    }

    return this.initializePromise;
  }

  async loadPersistedTokens() {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET');
    }

    const storedTokens = await this.tokenModel.findOne({ clientId: this.clientId });

    if (storedTokens?.accessToken && storedTokens?.refreshToken) {
      this.accessToken = storedTokens.accessToken;
      this.refreshToken = storedTokens.refreshToken;
      this.tokensPersisted = true;
      console.log('[live:eventsub] Loaded persisted Twitch OAuth tokens.');
    }

    if (!this.accessToken) {
      throw new Error('Missing TWITCH_USER_ACCESS_TOKEN and no persisted Twitch token was found');
    }
  }

  async getAccessToken() {
    await this.initialize();

    try {
      const response = await this.httpClient.get('https://id.twitch.tv/oauth2/validate', {
        timeout: this.requestTimeoutMs,
        headers: {
          Authorization: `OAuth ${this.accessToken}`,
        },
      });

      if (response.data.client_id !== this.clientId || !response.data.user_id) {
        throw new Error('TWITCH_USER_ACCESS_TOKEN belongs to a different Twitch application or user');
      }

      if (!this.tokensPersisted) {
        if (!this.refreshToken) {
          throw new Error('Missing TWITCH_REFRESH_TOKEN');
        }

        await this.persistTokens(this.accessToken, this.refreshToken);
        console.log('[live:eventsub] Persisted initial Twitch OAuth tokens.');
      }

      return this.accessToken;
    } catch (error) {
      if (error.response?.status !== 401) {
        throw error;
      }

      return this.refreshAccessToken();
    }
  }

  refreshAccessToken() {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performTokenRefresh()
        .finally(() => {
          this.refreshPromise = null;
        });
    }

    return this.refreshPromise;
  }

  async performTokenRefresh() {
    if (!this.refreshToken) {
      throw new Error('Twitch user access token is invalid and TWITCH_REFRESH_TOKEN is missing');
    }

    const tokenRequest = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
    });

    const response = await this.httpClient.post('https://id.twitch.tv/oauth2/token', tokenRequest, {
      timeout: this.requestTimeoutMs,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const newAccessToken = response.data.access_token;
    const newRefreshToken = response.data.refresh_token || this.refreshToken;

    if (!newAccessToken) {
      throw new Error('Twitch token refresh did not return an access token');
    }

    await this.persistTokens(newAccessToken, newRefreshToken);
    this.accessToken = newAccessToken;
    this.refreshToken = newRefreshToken;

    console.log('[live:eventsub] Refreshed and persisted Twitch OAuth tokens.');
    return this.accessToken;
  }

  async persistTokens(accessToken, refreshToken) {
    await this.tokenModel.findOneAndUpdate(
      { clientId: this.clientId },
      {
        $set: {
          accessToken,
          refreshToken,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    this.tokensPersisted = true;
  }
}

class TwitchEventSubClient {
  constructor(options) {
    this.clientId = options.clientId;
    this.broadcasterUserId = options.broadcasterUserId;
    this.getAccessToken = options.getAccessToken;
    this.onStreamOnline = options.onStreamOnline;
    this.httpClient = options.httpClient || axios;
    this.createWebSocket = options.createWebSocket || ((url) => new WebSocket(url));

    this.currentSocket = null;
    this.pendingReconnectSocket = null;
    this.reconnectTimer = null;
    this.keepaliveTimer = null;
    this.reconnectAttempts = 0;
    this.recentMessageIds = new Set();
    this.stopped = true;
  }

  start() {
    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.openSocket(EVENTSUB_WEBSOCKET_URL, true);
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.reconnectTimer);
    clearTimeout(this.keepaliveTimer);
    this.reconnectTimer = null;
    this.keepaliveTimer = null;

    this.currentSocket?.close();
    this.pendingReconnectSocket?.close();
    this.currentSocket = null;
    this.pendingReconnectSocket = null;
  }

  openSocket(url, shouldCreateSubscription) {
    if (this.stopped) {
      return;
    }

    const socket = this.createWebSocket(url);
    const isTwitchReconnect = !shouldCreateSubscription;

    if (isTwitchReconnect) {
      this.pendingReconnectSocket = socket;
    } else {
      this.currentSocket = socket;
    }

    socket.on('message', (data) => {
      this.handleMessage(socket, data, shouldCreateSubscription).catch((error) => {
        console.error(`[live:eventsub] Failed to handle message: ${error.message}`);
      });
    });

    socket.on('error', (error) => {
      console.error(`[live:eventsub] WebSocket error: ${error.message}`);
    });

    socket.on('close', () => {
      this.handleClose(socket);
    });
  }

  async handleMessage(socket, rawData, shouldCreateSubscription) {
    const message = JSON.parse(rawData.toString());
    const messageId = message.metadata?.message_id;

    if (messageId && this.recentMessageIds.has(messageId)) {
      return;
    }

    if (messageId) {
      this.recentMessageIds.add(messageId);

      if (this.recentMessageIds.size > 1000) {
        this.recentMessageIds.delete(this.recentMessageIds.values().next().value);
      }
    }

    const messageType = message.metadata?.message_type;

    if (messageType === 'session_welcome') {
      const session = message.payload.session;
      this.reconnectAttempts = 0;

      if (!shouldCreateSubscription) {
        const oldSocket = this.currentSocket;
        this.currentSocket = socket;
        this.pendingReconnectSocket = null;
        oldSocket?.close();
        console.log('[live:eventsub] Reconnected to Twitch EventSub.');
      } else {
        await this.createStreamOnlineSubscription(session.id);
        console.log('[live:eventsub] Listening for Twitch stream.online events.');
      }

      this.resetKeepaliveTimer(session.keepalive_timeout_seconds || 30);
      return;
    }

    if (socket === this.currentSocket) {
      this.resetKeepaliveTimer();
    }

    if (
      messageType === 'notification'
      && message.payload.subscription?.type === 'stream.online'
    ) {
      await this.onStreamOnline(message.payload.event);
      return;
    }

    if (messageType === 'session_reconnect') {
      const reconnectUrl = message.payload.session?.reconnect_url;

      if (reconnectUrl && !this.pendingReconnectSocket) {
        this.openSocket(reconnectUrl, false);
      }
      return;
    }

    if (messageType === 'revocation') {
      const status = message.payload.subscription?.status || 'unknown';
      console.error(`[live:eventsub] Twitch revoked the subscription (${status}).`);
    }
  }

  async createStreamOnlineSubscription(sessionId) {
    const accessToken = await this.getAccessToken();

    await this.httpClient.post(
      EVENTSUB_SUBSCRIPTIONS_URL,
      {
        type: 'stream.online',
        version: '1',
        condition: {
          broadcaster_user_id: this.broadcasterUserId,
        },
        transport: {
          method: 'websocket',
          session_id: sessionId,
        },
      },
      {
        headers: {
          'Client-ID': this.clientId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  resetKeepaliveTimer(timeoutSeconds = 30) {
    clearTimeout(this.keepaliveTimer);

    this.keepaliveTimer = setTimeout(() => {
      console.error('[live:eventsub] Keepalive timed out; reconnecting.');
      this.currentSocket?.terminate?.();
    }, (timeoutSeconds + 10) * 1000);
  }

  handleClose(socket) {
    if (socket === this.pendingReconnectSocket) {
      this.pendingReconnectSocket = null;

      if (!this.stopped && !this.currentSocket) {
        this.scheduleReconnect();
      }

      return;
    }

    if (socket !== this.currentSocket) {
      return;
    }

    this.currentSocket = null;
    clearTimeout(this.keepaliveTimer);
    this.keepaliveTimer = null;

    if (!this.stopped && !this.pendingReconnectSocket) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * (2 ** this.reconnectAttempts), MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;

    console.log(`[live:eventsub] Reconnecting in ${Math.round(delay / 1000)} second(s).`);
    this.reconnectTimer = setTimeout(() => {
      this.openSocket(EVENTSUB_WEBSOCKET_URL, true);
    }, delay);
  }
}

module.exports = {
  EVENTSUB_WEBSOCKET_URL,
  TwitchEventSubClient,
  TwitchTokenManager,
};
