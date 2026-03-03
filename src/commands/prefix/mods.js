module.exports = {
    name: 'mods',
    description: 'Replies with a link to Coolaid\'s mods list',
    
    run: async (client, message, args) => {
        message.reply("You can find Coolaid's full list of packs and mods he uses [here](https://coolaid.live/pages/mods-packs-list)")
    }
}