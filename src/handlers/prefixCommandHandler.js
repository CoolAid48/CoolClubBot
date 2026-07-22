const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const PREFIX = '!';

module.exports = (client) => {
  const prefixCommandsPath = path.join(__dirname, '..', 'commands', 'prefix');
  const commandFiles = fs
    .readdirSync(prefixCommandsPath)
    .filter((file) => file.endsWith('.js'))
    .sort();

  client.prefixCommands = new Collection();

  for (const file of commandFiles) {
    const command = require(path.join(prefixCommandsPath, file));

    if (!command.name || typeof command.run !== 'function') {
      throw new TypeError(`Invalid prefix command module: ${file}`);
    }

    if (client.prefixCommands.has(command.name)) {
      throw new Error(`Duplicate prefix command name: ${command.name}`);
    }

    client.prefixCommands.set(command.name, command);
  }

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(PREFIX) || message.author.bot) {
      return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const prefixCommand = client.prefixCommands.get(commandName);
    if (!prefixCommand) {
      return;
    }

    try {
      await prefixCommand.run(client, message, args);
    } catch (error) {
      console.error(error);
      await message.reply('There was an error executing that command.');
    }
  });
};
