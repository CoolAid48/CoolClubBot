const readline = require('readline');
const { ChannelType } = require('discord.js');

// SEND MESSAGES AS THE BOT
const BOT_CHANNEL_ID = '883363142204293152';

/*
staff-lounge    919278682806296596
general         883363142204293152
announcements   902983875238715405
vip-chat        982830372398198794
code-chat       995336131300294676
birthdays       1288283039146967111
bot-commands    947979392708149319
*/

module.exports = (client) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.on('line', async (input) => {
    if (input.toLowerCase() === 'exit') {
      rl.close();
      client.destroy();
      return;
    }

    try {
      const channel = await client.channels.fetch(BOT_CHANNEL_ID);
      if (channel && channel.type === ChannelType.GuildText) {
        await channel.send(input);
        console.log(`Message sent: ${input}`);
      } else {
        console.log('Channel not found or not a text channel');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
};