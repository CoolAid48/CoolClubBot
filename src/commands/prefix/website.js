module.exports = {
  name: 'website',
  description: 'Replies with a link to CoolAid\'s website home page',
  
  run: async (client, message, args) => {
      message.reply("Check out CoolAid's website here: <https://coolaid.live> <a:JAM:1256258144632307784>")
  }
}