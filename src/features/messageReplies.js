module.exports = (client) => {
  client.on('messageCreate', (message) => {
    if (message.author.bot) {
      return;
    }

    if (message.content === 'hello') {
      message.reply(
        "Hello! I am CoolClubBot and I'll be helping out around here for the mods, always in development... <:binoculars:1267649939941363773>",
      );
    }
  });
};