module.exports = (client) => {
  client.on('messageCreate', (message) => {
    if (message.author.bot) {
      return;
    }

    if (message.content === 'hello') {
      message.reply(
        "Hello! I am CoolClubBot and I'll be helping out around here... Check out the code that made me here: https://github.com/CoolAid48/CoolClubBot <:binoculars:1267649939941363773>",
      );
    }
  });
};