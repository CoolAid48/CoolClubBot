module.exports = {
  name: 'ping',
description: `Replies with "Pong!" and the bot's ping`,

  run: async (client, message, args) => {
  message.reply(`Pong! Client: ${Date.now() - message.createdTimestamp}ms | Websocket: ${client.ws.ping}ms  <:nerdge:1276986587590164490>`)
  }
}


