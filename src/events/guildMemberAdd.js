module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const welcomeRole = await member.guild.roles.cache.find(role => role.id === '919711530428289064');
        await member.roles.add(welcomeRole);
    
        const welcomeChannel = await member.guild.channels.cache.find(channel => channel.id === '883375089045889075')
        await welcomeChannel.fetch();
        welcomeChannel.send(`Hey ${member.user}, welcome to **CoolAid\'s Club**! Chill out and make sure you read the rules <:yepp:1277452287739957340>`);
        }
    }