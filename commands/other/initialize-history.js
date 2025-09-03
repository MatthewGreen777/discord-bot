const { SlashCommandBuilder } = require('discord.js');
const { logMessages } = require('../../message-logger'); // ✅ use new bulk logger

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('initialize-history')
        .setDescription('Fetch all past messages in this server and initialize message stats.'),

    async execute(interaction) {
        await interaction.reply('⏳ Initializing message history... This may take a while.');

        let totalMessages = 0;
        const guild = interaction.guild;

        for (const [channelId, channel] of guild.channels.cache) {
            if (!channel.isTextBased()) continue;

            let lastId;
            let done = false;

            while (!done) {
                try {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    const messages = await channel.messages.fetch(options);

                    if (messages.size === 0) {
                        done = true;
                        break;
                    }

                    // Filter messages
                    const validMessages = [];
                    for (const message of messages.values()) {
                        if (message.author.bot) continue;

                        const hasText = message.content && message.content.trim().length > 0;
                        const hasAttachment = message.attachments.size > 0;
                        const hasEmbed = message.embeds.length > 0;

                        if (hasText || hasAttachment || hasEmbed) {
                            validMessages.push(message);
                        }
                    }

                    // ✅ Bulk log instead of per-message
                    if (validMessages.length > 0) {
                        await logMessages(validMessages);
                        totalMessages += validMessages.length;
                    }

                    lastId = messages.last().id;

                    // Prevent rate limits
                    await sleep(250);

                    // Progress update every 5k messages
                    if (totalMessages % 5000 === 0) {
                        await interaction.followUp(
                            `📊 Processed ${totalMessages} messages so far... (channel: #${channel.name})`
                        );
                    }

                } catch (err) {
                    console.error(`Error fetching messages from ${channel.name}:`, err);
                    done = true; // Skip this channel if an error occurs
                }
            }
        }

        await interaction.editReply(`✅ History initialized! Processed **${totalMessages} messages** across all channels.`);
    }
};
