const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { getGuildFilePath } = require('../../message-logger'); // Correct import for per-server files

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-stats')
        .setDescription('REBUILD: Scans server history to rebuild this server\'s CSV. (Developer Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Role Check
        if (!interaction.member.roles.cache.some(role => role.name === 'Developer')) {
            return interaction.reply({ content: 'Only users with the **Developer** role can run this.', ephemeral: true });
        }

        await interaction.deferReply(); 

        const guild = interaction.guild;
        const filePath = getGuildFilePath(guild.id); // Gets the specific file path for THIS server
        const statsMap = new Map(); 

        try {
            // 2. Fetch all Text Channels the bot can see
            const channels = guild.channels.cache.filter(c => c.isTextBased());

            for (const [id, channel] of channels) {
                let lastId;

                while (true) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    // Fetch messages in chunks of 100
                    const messages = await channel.messages.fetch(options).catch(() => null);
                    if (!messages || messages.size === 0) break;

                    messages.forEach(msg => {
                        if (msg.author.bot) return;

                        const authorId = msg.author.id;
                        const words = msg.content.trim().split(/\s+/).filter(Boolean).length;

                        if (!statsMap.has(authorId)) {
                            statsMap.set(authorId, {
                                userId: authorId,
                                username: msg.author.username,
                                messages: 0,
                                words: 0
                            });
                        }

                        const userStats = statsMap.get(authorId);
                        userStats.messages += 1;
                        userStats.words += words;
                    });

                    lastId = messages.last().id;
                    if (messages.size < 100) break;
                }
            }

            // 3. Process data into Array and Calculate Ranks
            const newStatsArray = Array.from(statsMap.values());
            const sortedByMsgs = [...newStatsArray].sort((a, b) => b.messages - a.messages);
            const sortedByWords = [...newStatsArray].sort((a, b) => b.words - a.words);

            newStatsArray.forEach(user => {
                user.messageRank = sortedByMsgs.findIndex(u => u.userId === user.userId) + 1;
                user.wordRank = sortedByWords.findIndex(u => u.userId === user.userId) + 1;
            });

            // 4. Overwrite/Create the server-specific CSV
            const writer = csvWriter({
                path: filePath,
                header: [
                    { id: 'userId', title: 'userId' },
                    { id: 'username', title: 'username' },
                    { id: 'messages', title: 'messages' },
                    { id: 'words', title: 'words' },
                    { id: 'messageRank', title: 'messageRank' },
                    { id: 'wordRank', title: 'wordRank' }
                ]
            });

            await writer.writeRecords(newStatsArray);

            const successEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Server Sync Complete')
                .setDescription(`Rebuilt the stats file for **${guild.name}**.`)
                .addFields(
                    { name: 'Users Processed', value: `${newStatsArray.length}`, inline: true },
                    { name: 'File Name', value: `${guild.id}.csv`, inline: true }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('An error occurred while syncing history.');
        }
    }
};