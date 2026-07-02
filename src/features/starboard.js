const EMOJI = '1337589969526722693';
const COLLARD_EMOJI = `<:coolai2Collard:${EMOJI}>`;
const THRESHOLD = 3;
const STARBOARD_CHANNEL_ID = '1340016566296776728';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function getFooterText(date = new Date()) {
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();

  return `CoolAid's Club • Collard Board • ${monthName} ${ordinal(day)}, ${year}`;
}

function getMessageUrl(message) {
  return `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
}

function getTotalReactionCount(message) {
  return message.reactions.cache.reduce((total, messageReaction) => total + messageReaction.count, 0);
}

function buildStarboardEmbed(message) {
  const messageUrl = getMessageUrl(message);
  const embed = {
    color: 0x0070e9,
    author: {
      name: message.author.tag,
      icon_url: message.author.displayAvatarURL({ dynamic: true }),
    },
    description: message.content || '*[No content]*',
    fields: [
      {
        name: `From: ${message.channel}`,
        value: `[Go to message](${messageUrl})`,
      },
      {
        name: `${COLLARD_EMOJI} ${getTotalReactionCount(message)}`,
        value: 'Total reactions',
        inline: true,
      },
    ],
    footer: {
      text: getFooterText(),
    },
  };

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment && attachment.contentType?.startsWith('image')) {
      embed.image = { url: attachment.url };
    }
  }

  return embed;
}

module.exports = (client) => {
  client.on('messageReactionAdd', async (reaction) => {
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Failed to fetch reaction:', error);
        return;
      }
    }

    const { message, emoji } = reaction;

    if (emoji.name !== EMOJI && emoji.id !== EMOJI) {
      return;
    }

    if (reaction.count < THRESHOLD) {
      return;
    }

    const starboardChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);

    if (!starboardChannel || !starboardChannel.isTextBased()) {
      console.error('Starboard channel not found or is not text-based.');
      return;
    }

    const fetchedMessages = await starboardChannel.messages.fetch({ limit: 100 });
    const messageUrl = getMessageUrl(message);
    const existingMessage = fetchedMessages.find(
      (msg) =>
        msg.embeds.length > 0 &&
        msg.embeds[0].fields?.some((field) => field.value?.includes(messageUrl)),
    );

    if (existingMessage) {
      await existingMessage.edit({ embeds: [buildStarboardEmbed(message)] });
      return;
    }

    // Send the embed
    await starboardChannel.send({ embeds: [buildStarboardEmbed(message)] });
  });
};
