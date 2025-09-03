const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;

const filePath = path.join(__dirname, '../../data/message-stats.csv');

// Helper: fetch all messages in a channel
async function fetchAllMessages(channel) {
    let allMessages = [];
    let lastId = null;

    while (true) {
        const options = { limit: 100 };
        if (lastId) options.before = lastId;

        const messages = await channel.messages.fetch(options);
        if (messages.size === 0) break;

        allMessages = allMessages.concat(Array.from(messages.values()));
        lastId = messages.last().id;

        // prevent hitting global rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return allMessages;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('initialize-history')
        .setDescription('Fetch all past messages in this server and initialize message stats.'),
    async execute(interaction) {
        await interaction.reply('Starting history initialization... This may take a while ⏳');

        const stats = {}; // { userId: { username, words, messages } }

        const channels = interaction.guild.channels.cache.filter(c => c.isTextBased());

        for (const [id, channel] of channels) {
            try {
                const messages = await fetchAllMessages(channel);

                for (const msg of messages) {
                    if (msg.author.bot) continue;

                    if (!stats[msg.author.id]) {
                        stats[msg.author.id] = {
                            username: msg.author.tag,
                            words: 0,
                            messages: 0
                        };
                    }

                    const wordCount = msg.content.split(/\s+/).filter(Boolean).length;

                    stats[msg.author.id].messages += 1;
                    stats[msg.author.id].words += wordCount;
                }

                console.log(`Fetched ${messages.length} messages from #${channel.name}`);
            } catch (err) {
                console.error(`Failed to fetch from ${channel.name}:`, err);
            }
        }

        // Save to CSV
        const csvWriterInstance = csvWriter({
            path: filePath,
            header: [
                { id: 'username', title: 'username' },
                { id: 'userId', title: 'userId' },
                { id: 'words', title: 'words' },
                { id: 'messages', title: 'messages' },
            ],
        });

        const records = Object.entries(stats).map(([userId, data]) => ({
            username: data.username,
            userId,
            words: data.words,
            messages: data.messages
        }));

        await csvWriterInstance.writeRecords(records);

        await interaction.followUp(`✅ Finished initializing history! Collected data for **${records.length} users**.`);
    }
};
