const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const LOG_COLOR = 0xff5c5c;

function getUserName(user) {
  if (!user) {
    return 'Unknown user';
  }

  if (user.discriminator && user.discriminator !== '0') {
    return user.tag;
  }

  return user.username;
}

function formatUser(user) {
  if (!user) {
    return 'Unknown user';
  }

  return `${getUserName(user)} <@${user.id}>`;
}

function resolveReason(auditLogEntry, ban, fallbackReason) {
  const reason = auditLogEntry?.reason || ban?.reason || fallbackReason;

  if (typeof reason === 'string' && reason.trim()) {
    return reason.trim();
  }

  return 'No reason provided';
}

async function resolveModerationLogChannel(client, guildId) {
  const channelId = config.logging?.moderationChannelId;

  if (!channelId) {
    return null;
  }

  const channel = await client.channels.fetch(channelId).catch(() => null);

  if (
    !channel
    || !channel.isTextBased?.()
    || channel.isDMBased?.()
    || !channel.isSendable?.()
    || channel.guildId !== guildId
  ) {
    return null;
  }

  return channel;
}

function buildBanLogEmbed({
  offender, moderator, reason, auditLogEntry, ban, caseNumber, caseLabel,
}) {
  const resolvedOffender = offender || ban?.user;
  const resolvedModerator = moderator || auditLogEntry?.executor;
  const titleSuffix = caseNumber || caseLabel;
  const title = titleSuffix ? `Ban | Case #${titleSuffix}` : 'Ban';

  return new EmbedBuilder()
    .setColor(LOG_COLOR)
    .setTitle(title)
    .setDescription([
      `**Offender:** ${formatUser(resolvedOffender)}`,
      `**User ID:** ${resolvedOffender?.id || 'Unknown'}`,
      `**Reason:** ${resolveReason(auditLogEntry, ban, reason)}`,
      `**Handled by:** ${resolvedModerator ? getUserName(resolvedModerator) : 'Unknown moderator'}`,
    ].join('\n'))
    .setFooter({ text: 'Moderation Logs' })
    .setTimestamp();
}

module.exports = {
  buildBanLogEmbed,
  resolveModerationLogChannel,
};
