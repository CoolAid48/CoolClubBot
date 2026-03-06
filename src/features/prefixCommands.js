const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

module.exports = (client) => {
  client.commands = new Collection();
  client.prefix = new Map();

  const prefixCommandsPath = path.join(__dirname, '..', 'commands', 'prefix');
  const commandFiles = fs
    .readdirSync(prefixCommandsPath)
    .filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(prefixCommandsPath, file));
    client.prefix.set(command.name, command);
  }

  client.on('messageCreate', async (message) => {
    const prefix = '!';

    if (!message.content.startsWith(prefix) || message.author.bot) {
      return;
    }

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();

    const prefixCommand = client.prefix.get(commandName);
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