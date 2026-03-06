const EMOJI = '1337589969526722693';
const THRESHOLD = 3;
const STARBOARD_CHANNEL_ID = '1340016566296776728'; 

client.on('messageReactionAdd', async (reaction, user) => {
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Failed to fetch reaction:', error);
            return;
        }
    }

    const { message, emoji } = reaction;

    if (emoji.name !== EMOJI && emoji.id !== EMOJI) return;

    if (reaction.count >= THRESHOLD) {
        const starboardChannel = await client.channels.fetch(STARBOARD_CHANNEL_ID);

        if (!starboardChannel || !starboardChannel.isTextBased()) {
            console.error('Starboard channel not found or is not text-based.');
            return;
        }

        const fetchedMessages = await starboardChannel.messages.fetch({ limit: 100 });
        const existingMessage = fetchedMessages.find(msg =>
            msg.embeds.length > 0 && msg.embeds[0].footer?.text === `Message ID: ${message.id}`
        );

        if (existingMessage) return;

        // Starboard Embed
        const embed = {
            color: 0x0070e9,
            author: {
                name: message.author.tag,
                icon_url: message.author.displayAvatarURL({ dynamic: true })
            },
            description: message.content || '*[No content]*',
            fields: [
                {
                    name: `Source: ${message.channel}`,
                    value: `[Go to channel](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id})`
                }
            ],
            footer: {
                text: `Message ID: ${message.id}`
            },
            timestamp: new Date()
        };

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment && attachment.contentType?.startsWith('image')) {
                embed.image = { url: attachment.url };
            }
        }

        // Send the embed
        await starboardChannel.send({ embeds: [embed] });
    }
});