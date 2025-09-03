// commands/other/initialize-history.js
const { SlashCommandBuilder } = require('discord.js');
const { logMessage } = require('../../message-logger');

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

                    for (const message of messages.values()) {
                        if (message.author.bot) continue;
                        await logMessage(message);
                        totalMessages++;
                    }

                    lastId = messages.last().id;
                } catch (err) {
                    console.error(`Error fetching messages from ${channel.name}:`, err);
                    done = true; // Skip channel if error
                }
            }
        }

        await interaction.editReply(`✅ History initialized! Processed **${totalMessages} messages**.`);
    }
};
