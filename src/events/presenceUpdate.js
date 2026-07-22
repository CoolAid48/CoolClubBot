const { ActivityType } = require('discord.js');

module.exports = async (client, oldPresence, newPresence) => {
  const member = newPresence?.member;
  const role = newPresence?.guild.roles.cache.get(process.env.LIVE_ROLE_ID);

  if (!member || !role) {
    return;
  }

  const isStreamingNow = newPresence.activities.some(
    (activity) => activity.type === ActivityType.Streaming,
  );
  const wasStreamingBefore = oldPresence
    ? oldPresence.activities.some(
        (activity) => activity.type === ActivityType.Streaming,
      )
    : false;

  if (isStreamingNow && !wasStreamingBefore) {
    if (!member.roles.cache.has(process.env.LIVE_ROLE_ID)) {
      await member.roles.add(role);
      console.log(`Added role to ${member.user.tag} (streaming)`);
    }
    return;
  }

  if (!isStreamingNow && wasStreamingBefore) {
    if (member.roles.cache.has(process.env.LIVE_ROLE_ID)) {
      await member.roles.remove(role);
      console.log(`Removed role from ${member.user.tag} (not streaming)`);
    }
  }
};
