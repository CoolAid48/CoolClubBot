const { AuditLogEvent } = require('discord.js');
const ModerationCaseCounter = require('../../models/BanCounter');
const { buildBanLogEmbed, resolveModerationLogChannel } = require('../../utils/moderationLogs');

const AUDIT_LOG_LOOKUP_DELAY_MS = 1000;
const AUDIT_LOG_LOOKUP_WINDOW_MS = 15000;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getNextCaseNumber(guildId) {
  try {
    const counter = await ModerationCaseCounter.findOneAndUpdate(
      { guildId },
      { $inc: { caseNumber: 1 } },
      {
        new: true, upsert: true, setDefaultsOnInsert: true,
      }
    );

    return counter.caseNumber;
  } catch (error) {
    console.error(`[banLog] Failed to create moderation case for guild ${guildId}:`, error);
    return null;
  }
}

async function findBanAuditLogEntry(guild, userId) {
  await wait(AUDIT_LOG_LOOKUP_DELAY_MS);

  try {
    const auditLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanAdd,
      limit: 5,
    });

    return auditLogs.entries.find((entry) => {
      const targetId = entry.targetId || entry.target?.id;
      const isRecent = Date.now() - entry.createdTimestamp < AUDIT_LOG_LOOKUP_WINDOW_MS;

      return targetId === userId && isRecent;
    }) || null;
  } catch (error) {
    console.error(`[banLog] Failed to fetch ban audit logs for guild ${guild.id}:`, error);
    return null;
  }
}

module.exports = async (client, ban) => {
  try {
    const logChannel = await resolveModerationLogChannel(client, ban.guild.id);

    if (!logChannel) {
      console.error(`[banLog] Logging channel not found or unavailable for guild ${ban.guild.id}`);
      return;
    }

    const [auditLogEntry, caseNumber] = await Promise.all([
      findBanAuditLogEntry(ban.guild, ban.user.id),
      getNextCaseNumber(ban.guild.id),
    ]);

    await logChannel.send({
      embeds: [
        buildBanLogEmbed({
          ban, auditLogEntry, caseNumber,
        }),
      ],
    });
  } catch (error) {
    console.error('Error in guildBanAdd ban log:', error);
  }
};
