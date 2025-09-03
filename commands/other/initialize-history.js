// commands/utility/initialize-history.js
const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

const filePath = path.join(__dirname, '../../data/message-stats.csv');

// Helper function to fetch all messages in a channel
async function fetchAllMessages(channel) {
    let allMessages = [];
    let lastId = null;

    try {
        while (true) {
            const options = { limit: 100 };
            if (lastId) options.before = lastId;

            const messages = await channel.messages.fetch(options);
            if (messages.size === 0) break;

            allMessages.push(...messages.values());
            lastId = messages.last().id;

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error(`Failed to fetch messages from channel ${channel.name}:`, error);
    }

    return allMessages;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('initialize-history')
        .setDescription('Fetches all past messages in this server and initializes message stats.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const stats = {}; // { userId: { username, messages, words } }

        // Get all text channels
        const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

        for (const channel of channels.values()) {
            console.log(`Fetching messages from #${channel.name}...`);
            const messages = await fetchAllMessages(channel);

            for (const msg of messages) {
                if (msg.author.bot) continue;

                const userId = msg.author.id;
                const username = msg.author.username;
                const wordCount = msg.content.trim().split(/\s+/).filter(Boolean).length;

                if (!stats[userId]) {
                    stats[userId] = { username, messages: 0, words: 0 };
                }

                stats[userId].messages++;
                stats[userId].words += wordCount;
            }
        }

        const csvWriterInstance = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'userId', title: 'userId' },
                { id: 'username', title: 'username' },
                { id: 'messages', title: 'messages' },
                { id: 'words', title: 'words' },
            ],
        });

        const records = Object.keys(stats).map(userId => ({
            userId,
            username: stats[userId].username,
            messages: stats[userId].messages,
            words: stats[userId].words,
        }));

        try {
            await csvWriterInstance.writeRecords(records);
            await interaction.editReply(
                `✅ Finished initializing history! Collected data for **${records.length} users** and saved to CSV.`
            );
            console.log('CSV file was written successfully!');
        } catch (err) {
            await interaction.editReply(`❌ An error occurred while writing to the CSV file.`);
            console.error('Error writing CSV:', err);
        }
    }
};