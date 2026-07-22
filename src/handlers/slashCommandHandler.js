const fs = require('fs');
const path = require('path');
const { Collection, Events, MessageFlags } = require('discord.js');
const { devs = [], testServer } = require('../../config.json');

const COMMANDS_PATH = path.join(__dirname, '..', 'commands', 'slash');

function loadSlashCommands() {
  const commands = new Collection();
  const commandFiles = fs
    .readdirSync(COMMANDS_PATH)
    .filter((file) => file.endsWith('.js'))
    .sort();

  for (const commandFile of commandFiles) {
    const command = require(path.join(COMMANDS_PATH, commandFile));

    if (command.deleted) {
      continue;
    }

    if (!command.name || !command.description || typeof command.callback !== 'function') {
      throw new TypeError(`Invalid slash command module: ${commandFile}`);
    }

    if (commands.has(command.name)) {
      throw new Error(`Duplicate slash command name: ${command.name}`);
    }

    commands.set(command.name, command);
  }

  return commands;
}

function getCommandData(command) {
  const data = {
    name: command.name,
    description: command.description,
    options: command.options || [],
  };

  if (command.defaultMemberPermissions !== undefined) {
    data.defaultMemberPermissions = command.defaultMemberPermissions;
  }

  if (command.dmPermission !== undefined) {
    data.dmPermission = command.dmPermission;
  }

  return data;
}

async function syncSlashCommands(client, commands) {
  const commandManager = testServer
    ? (await client.guilds.fetch(testServer)).commands
    : client.application.commands;

  await commandManager.set(commands.map(getCommandData));
  console.log(`[commands] Synced ${commands.size} slash commands.`);
}

async function replyWithError(interaction, content) {
  const response = {
    content,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.deferred && !interaction.replied) {
    const edited = await interaction.editReply({ content })
      .then(() => true)
      .catch(() => false);

    if (!edited) {
      await interaction.followUp(response).catch(() => null);
    }

    return;
  }

  if (interaction.replied) {
    await interaction.followUp(response).catch(() => null);
    return;
  }

  await interaction.reply(response).catch(() => null);
}

async function handleSlashCommand(client, commands, interaction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);

  if (!command) {
    return;
  }

  if (command.devOnly && !devs.includes(interaction.user.id)) {
    await replyWithError(interaction, 'Only developers are allowed to run this command.');
    return;
  }

  if (command.testOnly && interaction.guildId !== testServer) {
    await replyWithError(interaction, 'This command cannot be run here.');
    return;
  }

  const missingMemberPermission = command.permissionsRequired?.find(
    (permission) => !interaction.memberPermissions?.has(permission),
  );

  if (missingMemberPermission) {
    await replyWithError(interaction, 'You do not have permission to use this command.');
    return;
  }

  const missingBotPermission = command.botPermissions?.find(
    (permission) => !interaction.appPermissions?.has(permission),
  );

  if (missingBotPermission) {
    await replyWithError(interaction, 'I do not have the permissions needed to run this command.');
    return;
  }

  try {
    await command.callback(client, interaction);
  } catch (error) {
    console.error(`[commands] /${command.name} failed:`, error);
    await replyWithError(interaction, 'There was an error running that command.');
  }
}

module.exports = (client) => {
  const commands = loadSlashCommands();
  client.slashCommands = commands;

  client.on(Events.InteractionCreate, (interaction) => {
    handleSlashCommand(client, commands, interaction).catch((error) => {
      console.error('[commands] Interaction handler failed:', error);
    });
  });

  return () => syncSlashCommands(client, commands);
};

module.exports.getCommandData = getCommandData;
module.exports.handleSlashCommand = handleSlashCommand;
module.exports.loadSlashCommands = loadSlashCommands;
module.exports.syncSlashCommands = syncSlashCommands;
