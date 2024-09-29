module.exports = {
    name: 'hofarmor',
    description: 'Replies with "!hofarmor"',
    
    run: async (client, message, args) => {
        message.reply("When joining the HOF you will start with Leather armor. Upgrading to Iron at 50 > Gold at 75 > Diamond at 100 and Netherite at 200 + a price. | Trims will be available for those who have pre-purchased Netherite armor. ")
    }
}