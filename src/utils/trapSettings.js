const TrapSettings = require('../models/TrapSettings');
const settingsCache = new Map();

function normalizeSettings(settings) {
  if (!settings) return null;

  return {
    guildId: settings.guildId,
    channelId: settings.channelId,
    warningMessageId: settings.warningMessageId,
    warningText: settings.warningText,
    setBy: settings.setBy,
  };
}

async function getTrapSettings(guildId) {
  if (settingsCache.has(guildId)) {
    return settingsCache.get(guildId);
  }

  const settings = await TrapSettings.findOne({ guildId }).lean();
  const normalizedSettings = normalizeSettings(settings);
  settingsCache.set(guildId, normalizedSettings);
  return normalizedSettings;
}

async function setTrapSettings(settings) {
  const updatedSettings = await TrapSettings.findOneAndUpdate(
    { guildId: settings.guildId },
    {
      $set: {
        channelId: settings.channelId,
        warningMessageId: settings.warningMessageId,
        warningText: settings.warningText,
        setBy: settings.setBy,
    },
},
{
  upsert: true,
  new: true,
  setDefaultsOnInsert: true,
}
  ).lean();

  const normalizedSettings = normalizeSettings(updatedSettings);
  settingsCache.set(settings.guildId, normalizedSettings);
  return normalizedSettings;
}

async function clearTrapSettings(guildId) {
  await TrapSettings.deleteOne({ guildId });
  settingsCache.delete(guildId);
}

module.exports = {
  getTrapSettings,
  setTrapSettings,
  clearTrapSettings,
};
