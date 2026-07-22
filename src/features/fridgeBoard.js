const { Events } = require('discord.js');

const FRIDGE_EMOJI_ID = '1210994184752734278';
const FRIDGE_EMOJI = `<:fridge:${FRIDGE_EMOJI_ID}>`;
const THRESHOLD = 3;
const FRIDGE_BOARD_CHANNEL_ID = '1340016566296776728';
const fridgeBoardPosts = new Map();

function getMessageUrl(message) {
  return `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
}

function isFridgeEmoji(emoji) {
  return emoji.id === FRIDGE_EMOJI_ID;
}

function getFridgeReactionCount(message) {
  return message.reactions.cache.find((reaction) => isFridgeEmoji(reaction.emoji))?.count ?? 0;
}

function buildFridgeBoardEmbed(message) {
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
        value: `[Go to message](${messageUrl})\n\n**${FRIDGE_EMOJI} ${getFridgeReactionCount(message)}**`,
      },
    ],
    footer: {
      text: 'Fridge Board',
    },
    timestamp: (message.createdAt || new Date()).toISOString(),
  };

  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    if (attachment && attachment.contentType?.startsWith('image')) {
      embed.image = { url: attachment.url };
    }
  }

  return embed;
}

async function findExistingPost(fridgeBoardChannel, message) {
  const cachedPostId = fridgeBoardPosts.get(message.id);

  if (cachedPostId) {
    const cachedPost = await fridgeBoardChannel.messages.fetch(cachedPostId).catch(() => null);

    if (cachedPost) {
      return cachedPost;
    }

    fridgeBoardPosts.delete(message.id);
  }

  const messageUrl = getMessageUrl(message);
  const recentPosts = await fridgeBoardChannel.messages.fetch({ limit: 100 });
  const existingPost = recentPosts.find((post) => (
    post.embeds[0]?.fields?.some((field) => field.value?.includes(messageUrl))
  ));

  if (existingPost) {
    fridgeBoardPosts.set(message.id, existingPost.id);
  }

  return existingPost;
}

async function handleFridgeBoardReaction(client, reaction) {
  const { message, emoji } = reaction;

  if (!message.guild || !isFridgeEmoji(emoji) || reaction.count < THRESHOLD) {
    return;
  }

  if (message.partial) {
    await message.fetch();
  }

  const fridgeBoardChannel = await client.channels.fetch(FRIDGE_BOARD_CHANNEL_ID);

  if (!fridgeBoardChannel?.isTextBased() || !fridgeBoardChannel.isSendable?.()) {
    console.error('[fridge-board] Channel not found or unavailable.');
    return;
  }

  const existingPost = await findExistingPost(fridgeBoardChannel, message);

  if (existingPost) {
    await existingPost.edit({
      embeds: [buildFridgeBoardEmbed(message)],
    });
    return;
  }

  const fridgeBoardPost = await fridgeBoardChannel.send({
    embeds: [buildFridgeBoardEmbed(message)],
  });
  fridgeBoardPosts.set(message.id, fridgeBoardPost.id);
}

function registerFridgeBoard(client) {
  client.on(Events.MessageReactionAdd, async (reaction) => {
    try {
      if (reaction.partial) {
        await reaction.fetch();
      }

      await handleFridgeBoardReaction(client, reaction);
    } catch (error) {
      console.error('[fridge-board] Failed to process message reaction:', error);
    }
  });
}

module.exports = registerFridgeBoard;
module.exports.buildFridgeBoardEmbed = buildFridgeBoardEmbed;
module.exports.handleFridgeBoardReaction = handleFridgeBoardReaction;
module.exports.isFridgeEmoji = isFridgeEmoji;
