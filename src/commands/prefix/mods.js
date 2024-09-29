module.exports = {
    name: 'mods',
    description: 'Replies with "!mods"',
    
    run: async (client, message, args) => {
        message.reply("You can find the list of all of CoolAid's mods and resource packs here! https://justpaste.it/CoolAid_UltimatePacksList")
    }
}