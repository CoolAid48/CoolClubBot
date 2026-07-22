const giveUserXp = require('../features/leveling');
const handleTrapMessage = require('../features/trapMessages');

const GREETINGS = new Set(['hello', 'hi', 'wsg', 'wsp']);

async function replyToGreeting(message) {
  if (!message.author.bot && GREETINGS.has(message.content.toLowerCase())) {
    await message.reply(
      "Hello! I am CoolClubBot and I'll be helping out around this server... Check out the code that made me [here on Github](<https://github.com/CoolAid48/CoolClubBot>) <:binoculars:1267649939941363773>",
    );
  }
}

module.exports = async (client, message) => {
  await Promise.all([
    giveUserXp(client, message),
    handleTrapMessage(client, message),
    replyToGreeting(message),
  ]);
};
