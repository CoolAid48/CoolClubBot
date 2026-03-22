const { EmbedBuilder } = require('discord.js');

const rulesEmbed = new EmbedBuilder()
  .setColor('#0257B3')
  .setTitle('Server Rules')
  .setDescription(
    [
      '**1.** Respect the staff and especially each other. Use common sense, obey Discord TOS, listen to the mods, and don\'t be stupid',
      '',
      '**2.** All forms of racism, homophobia, xenophobia, sexism, or any other hate towards others is never tolerated and will result in an instant ban. This server doesn\'t promote harassment or bullying',
      '',
      '**3.** Do not directly discuss your age, and no sharing personal information... both in this server and in DMs, whether you care personally or not. Stay safe online!',
      '',
      '**4.** Keep all channels in this server English only',
      '',
      '**5.** Do not self promote anywhere in the server. This includes talking about your content, socials, or asking for streaming advice',
      '',
      '**6.** No NSFW posts, and no excessive swearing (keep it classy!)',
      '',
      '**7.** Do not spam/flood any chats, write your messages out fully. Do not spam ping anybody',
      '',
      '**8.** Absolutely asking for gifted subs or special roles, and do not ask why other people have roles that you do not',
    ].join('\n')
  )
  .setFooter({
    text: '*Violation of the rules can result in any punishment from a short mute to a permanent ban. Follow the rules, and you\'ll be fine. Have fun exploring the server and welcome to the Club!',
  });

module.exports = {
  name: 'rules',
  description: 'Replies with the full server rules embed',

  run: async (client, message, args) => {
    await message.channel.send({ embeds: [rulesEmbed] });
  },
};
  