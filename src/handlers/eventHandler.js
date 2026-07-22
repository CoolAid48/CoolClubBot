const path = require('path');
const fs = require('fs');
const { Events } = require('discord.js');

function getEventFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getEventFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith('.js') ? [entryPath] : [];
    });
}

module.exports = (client) => {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = getEventFiles(eventsPath).sort();

  for (const eventFile of eventFiles) {
    const eventName = path.parse(eventFile).name;
    const eventFunction = require(eventFile);
    const register = eventName === Events.ClientReady ? 'once' : 'on';
    const eventLabel = path.relative(eventsPath, eventFile);

    if (typeof eventFunction !== 'function') {
      throw new TypeError(`Invalid event module: ${eventLabel}`);
    }

    client[register](eventName, (...args) => {
      Promise.resolve()
        .then(() => eventFunction(client, ...args))
        .catch((error) => {
          console.error(`[events] ${eventName} failed in ${eventLabel}:`, error);
        });
    });
  }
};

module.exports.getEventFiles = getEventFiles;
