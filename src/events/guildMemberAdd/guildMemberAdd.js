module.exports = async (client, member) => {
    try {
        console.log(`New member joined: ${member.user.tag}`);
        
        const welcomeRole = member.guild.roles.cache.find(role => role.id === '919711530428289064');
        
        if (!welcomeRole) {
            console.error('Welcome role not found!');
            return;
        }
        
        await member.roles.add(welcomeRole);
        console.log(`Added role to ${member.user.tag}`);
        
        const welcomeChannel = member.guild.channels.cache.find(channel => channel.id === '883375089045889075');
        
        if (!welcomeChannel) {
            console.error('Welcome channel not found!');
            return;
        }
        
        await welcomeChannel.send(`Hey ${member.user}, welcome to **CoolAid's Club**! Chill out and make sure you read the rules <:yepp:1277452287739957340>`);
        console.log(`Sent welcome message for ${member.user.tag}`);
        
    } catch (error) {
        console.error('Error in guildMemberAdd:', error);
    }
};