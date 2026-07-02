const path = require('path');
const fs = require('fs');
const getAllFiles = require('../utils/getAllFiles');

function getFilesRecursively(directory) {
  const directoryEntries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of directoryEntries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

module.exports = (client) => {
  const eventFolders = getAllFiles(path.join(__dirname, '..', 'events'), true);

  for (const eventFolder of eventFolders) {
    const folderName = eventFolder.replace(/\\/g, '/').split('/').pop();

    if (folderName === 'ticketLogs') {
      const ticketEventFiles = getAllFiles(eventFolder);
      ticketEventFiles.sort();

      for (const ticketEventFile of ticketEventFiles) {
        const eventName = path.parse(ticketEventFile).name;

        client.on(eventName, async (...args) => {
          const eventFunction = require(ticketEventFile);
          await eventFunction(client, ...args);
        });
      }

      continue;
    }

    const eventFiles = getFilesRecursively(eventFolder);
    eventFiles.sort();

    const eventName = folderName;

    client.on(eventName, async (...args) => {
      for (const eventFile of eventFiles) {
        const eventFunction = require(eventFile);
        await eventFunction(client, ...args);
      }
    });
  }
};
