const { AuditLogEvent, ChannelType, EmbedBuilder } = require('discord.js');
const { resolveModerationLogChannel } = require('./moderationLogs');

const AUDIT_LOG_LOOKUP_DELAY_MS = 1000;
const AUDIT_LOG_LOOKUP_WINDOW_MS = 15000;
const TICKET_ACTION_COLORS = {
  Created: 0x57f287,
  Closed: 0xffe14d,
  Opened: 0x2f9cff,
  Deleted: 0xed4245,
};

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isGuildTicketChannel(channel) {
  return channel
    && channel.guild
    && channel.type === ChannelType.GuildText
    && getTicketInfo(channel.name);
}

function getTicketInfo(channelName = '') {
  const match = channelName.match(/^(ticket|closed)[-_]?(\d+)$/i);

  if (!match) {
    return null;
  }

  const kind = match[1].toLowerCase() === 'closed' ? 'Closed' : 'Ticket';

  return {
    kind,
    number: match[2],
    label: `${kind}-${match[2]}`,
  };
}

function getPanelName(channel) {
  return channel.parent?.name || 'Unknown Panel';
}

function getUserName(user) {
  if (!user) {
    return 'Unknown user';
  }

  if (user.discriminator && user.discriminator !== '0') {
    return user.tag;
  }

  return user.username;
}

function getAvatarUrl(user) {
  return user?.displayAvatarURL?.({ extension: 'png', size: 128 }) || null;
}

async function findChannelAuditLogEntry(channel, type) {
  await wait(AUDIT_LOG_LOOKUP_DELAY_MS);

  try {
    const auditLogs = await channel.guild.fetchAuditLogs({
      type,
      limit: 5,
    });

    return auditLogs.entries.find((entry) => {
      const targetId = entry.targetId || entry.target?.id;
      const isRecent = Date.now() - entry.createdTimestamp < AUDIT_LOG_LOOKUP_WINDOW_MS;

      return targetId === channel.id && isRecent;
    }) || null;
  } catch (error) {
    console.error(`[ticketLogs] Failed to fetch audit logs for channel ${channel.id}:`, error);
    return null;
  }
}

async function findTicketMember(channel) {
  const memberOverwrite = channel.permissionOverwrites.cache.find((overwrite) => (
    (overwrite.type === 1 || overwrite.type === 'member')
    && overwrite.allow?.has?.('ViewChannel')
  ));

  if (!memberOverwrite) {
    return null;
  }

  return channel.guild.members.fetch(memberOverwrite.id).catch(() => null);
}

function resolveResponsibleUser({ action, auditLogEntry, ticketMember }) {
  if (action === 'Created' && ticketMember?.user) {
    return ticketMember.user;
  }

  return auditLogEntry?.executor || ticketMember?.user || null;
}

function getAuditLogTypeForAction(action) {
  if (action === 'Created') {
    return AuditLogEvent.ChannelCreate;
  }

  if (action === 'Deleted') {
    return AuditLogEvent.ChannelDelete;
  }

  return AuditLogEvent.ChannelUpdate;
}

function buildTicketLogEmbed({
  action,
  channel,
  ticketInfo,
  user,
}) {
  const userName = getUserName(user);
  const avatarUrl = getAvatarUrl(user);
  const embed = new EmbedBuilder()
    .setColor(TICKET_ACTION_COLORS[action] || 0x2f9cff)
    .setAuthor({
      name: userName,
      iconURL: avatarUrl || undefined,
    })
    .addFields(
      {
        name: 'Logged Info',
        value: `Ticket: ${ticketInfo.label}\nAction: ${action}`,
        inline: true,
      },
      {
        name: 'Category',
        value: getPanelName(channel),
        inline: true,
      }
    );

  return embed;
}

async function sendTicketLog(client, channel, action) {
  if (!isGuildTicketChannel(channel)) {
    return;
  }

  const logChannel = await resolveModerationLogChannel(client, channel.guild.id);

  if (!logChannel) {
    console.error(`[ticketLogs] Logging channel not found or unavailable for guild ${channel.guild.id}`);
    return;
  }

  const [auditLogEntry, ticketMember] = await Promise.all([
    findChannelAuditLogEntry(channel, getAuditLogTypeForAction(action)),
    action === 'Created' ? findTicketMember(channel) : Promise.resolve(null),
  ]);
  const user = resolveResponsibleUser({ action, auditLogEntry, ticketMember });

  await logChannel.send({
    embeds: [
      buildTicketLogEmbed({
        action,
        channel,
        ticketInfo: getTicketInfo(channel.name),
        user,
      }),
    ],
  });
}

function getTicketUpdateAction(oldChannel, newChannel) {
  const oldTicketInfo = getTicketInfo(oldChannel?.name);
  const newTicketInfo = getTicketInfo(newChannel?.name);

  if (!oldTicketInfo || !newTicketInfo || oldChannel.name === newChannel.name) {
    return null;
  }

  if (oldTicketInfo.kind === 'Ticket' && newTicketInfo.kind === 'Closed') {
    return 'Closed';
  }

  if (oldTicketInfo.kind === 'Closed' && newTicketInfo.kind === 'Ticket') {
    return 'Opened';
  }

  return null;
}

module.exports = {
  getTicketUpdateAction,
  sendTicketLog,
};
