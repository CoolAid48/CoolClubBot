const { EmbedBuilder } = require('discord.js');

const websiteEmbed = new EmbedBuilder()
  .setColor('#0257B3')
  .addFields(
    {
      name: "CoolAid's Website Links\n-------------------------",
      value: [
        '• [CoolAid.live](https://coolaid.live)',
        '• [Hardcore World Info](https://coolaid.live/pages/hardcore)',
        '• [CoolAid Mods List](https://coolaid.live/pages/mods-packs-list)',
        '• [Hall of Fame FAQ](https://coolaid.live/pages/hof-info)',
        '• [Setup and PC Specs](https://coolaid.live/pages/setup-specs)',
        '• [Contact Info](https://coolaid.live/pages/socials)',
        '• [Merch Store](https://shop.coolaid.live)',
        '• [GitHub Repo](https://github.com/CoolAid48/coolaid.live)',
      ].join('\n'),
      inline: true,
    },
    {
      name: `CoolAid48 Social Media\n-------------------------`,
      value: [
        '• [Twitch](https://www.twitch.tv/coolaid48)',
        '• [Youtube](https://www.youtube.com/@CoolAid48)',
        '• [Ko-Fi](https://ko-fi.com/coolaid48)',
        '• [Twitter](https://x.com/CoolAid48)',
        '• [Bluesky](https://bsky.app/profile/coolaid.live)',
        '• [Instagram](https://www.instagram.com/coolaid48)',
        '• [TikTok](https://www.tiktok.com/@coolaid48)',
        '• [Modrinth](https://modrinth.com/user/CoolAid)',
      ].join('\n'),
      inline: true,
    }
  );

module.exports = {
  name: 'socials',
  description: "Replies with CoolAid's website and social media links",

  run: async (client, message, args) => {
    await message.channel.send({ embeds: [websiteEmbed] });
  },
};