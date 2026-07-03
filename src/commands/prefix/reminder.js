const { PermissionFlagsBits } = require('discord.js');

const REMINDER_CHANNEL_ID = '1289355661313970197';

function hasReminderPermission(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator)
    || member.permissions.has(PermissionFlagsBits.ManageMessages);
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function formatTimestamp(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getMessageUrl(message) {
  return message.url || `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
}

function escapeCodeBlock(value) {
  return value.replace(/```/g, "`\u200b``");
}

function buildReminderMessage(message, reminderText) {
  const reminderBlock = [
    `[${formatTimestamp(message.createdAt)}]: Reminder`,
    `created by ${message.author.username}`,
    '',
    escapeCodeBlock(reminderText),
  ].join('\n');

  return `\`\`\`\n${reminderBlock}\n\`\`\`${getMessageUrl(message)}`;
}

module.exports = {
  name: 'reminder',
  description: 'Creates a staff reminder and logs it to the reminders channel.',

  run: async (client, message, args) => {
    if (!message.guild || !message.member) {
      await message.reply('Use this command inside the server.');
      return;
    }

    if (!hasReminderPermission(message.member)) {
      await message.reply('Only mods and admins can create reminders.');
      return;
    }

    const reminderText = args.join(' ').trim();
    if (!reminderText) {
      await message.reply('Please include reminder text, like `!reminder Check the YouTube command`.');
      return;
    }

    const reminderChannel = await client.channels.fetch(REMINDER_CHANNEL_ID);
    if (!reminderChannel || !reminderChannel.isTextBased()) {
      await message.reply('I could not find the reminders channel.');
      return;
    }

    await reminderChannel.send(buildReminderMessage(message, reminderText));

    await message.reply(`<:coolai2Noted:1522619494487556287> Reminder set: "${reminderText}"`);
  },
};
