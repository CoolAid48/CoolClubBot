module.exports = (client) => {
  client.on('messageCreate', (message) => {
    if (message.author.bot) {
      return;
    }

    if (message.content === 'hello' || message.content === 'hi' || message.content === 'wsg' || message.content === 'wsp') {
      message.reply(
        "Hello! I am CoolClubBot and I'll be helping out around this server... Check out the code that made me [here on Github](<https://github.com/CoolAid48/CoolClubBot>) <:binoculars:1267649939941363773>",
      );
    }
  });
};