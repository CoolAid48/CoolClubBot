const { getTrapSettings } = require('../utils/trapSettings');
const pendingBans = new Set();

module.exports = async (client, message) => {
  if (
    !message.inGuild() || 
    !message.author ||
    message.author.id === client.user.id
  ) { 
    return;
  }

  let settings;

  try {
    settings = await getTrapSettings(message.guild.id);
  } catch (error) {
    console.error('[trap] Error fetching trap settings:', error);
    return;
  }

  if (!settings || message.channel.id !== settings.channelId) {
    return;
  }

  const banKey = `${message.guild.id}-${message.author.id}`;

  if (pendingBans.has(banKey)) {
    return;
  }

  pendingBans.add(banKey);

  try {
    const banResult = await message.guild.members.ban(message.author.id, {
      deleteMessageSeconds: 1,
      reason: 'IT\'S A TRAP',
    })
  .then(() => ({ success: true }))
  .catch((error) => ({ success: false, error }));

  await message.delete().catch(() => null);

  if (!banResult.success) {
    console.error('[trap] Error banning user:', banResult.error);
}
  } finally {
    pendingBans.delete(banKey);
  }
};
