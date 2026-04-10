// commands/utility/sync-stats.js
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const { getGuildFilePath } = require('../../message-logger'); // Ensure path is correct

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sync-stats')
        .setDescription('REBUILD: Scans server history to rebuild this server\'s CSV. (Developer Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // 1. Role Check
        if (!interaction.member.roles.cache.some(role => role.name === 'Developer')) {
            return interaction.reply({ 
                content: 'Only users with the **Developer** role can run this command.', 
                ephemeral: true 
            });
        }

        /**
         * 2. IMMEDIATE RESPONSE
         * We reply instantly to satisfy Discord's 3-second limit.
         * We do NOT use deferReply here because the process exceeds the 15-minute token limit.
         */
        await interaction.reply({ 
            content: '🚀 **Sync Started.** I am scanning all channels. This may take a while depending on server size. I will send a final report in this channel when finished!' 
        });

        const guild = interaction.guild;
        const filePath = getGuildFilePath(guild.id);
        const statsMap = new Map();
        const startTime = Date.now();

        // 3. BACKGROUND PROCESSING
        // We do NOT "await" this whole block in a way that blocks the interaction response.
        try {
            const channels = guild.channels.cache.filter(c => c.isTextBased());

            for (const [id, channel] of channels) {
                let lastId;
                
                // Track progress in console for PM2 logs
                console.log(`[Sync] Starting scan for channel: #${channel.name}`);

                while (true) {
                    const options = { limit: 100 };
                    if (lastId) options.before = lastId;

                    // Fetch messages with a catch to prevent channel permission errors from stopping the sync
                    const messages = await channel.messages.fetch(options).catch(err => {
                        console.error(`Could not fetch messages for ${channel.name}:`, err.message);
                        return null;
                    });

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

            // 4. RANKING CALCULATION
            const newStatsArray = Array.from(statsMap.values());
            const sortedByMsgs = [...newStatsArray].sort((a, b) => b.messages - a.messages);
            const sortedByWords = [...newStatsArray].sort((a, b) => b.words - a.words);

            newStatsArray.forEach(user => {
                user.messageRank = sortedByMsgs.findIndex(u => u.userId === user.userId) + 1;
                user.wordRank = sortedByWords.findIndex(u => u.userId === user.userId) + 1;
            });

            // 5. WRITE TO CSV
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

            // 6. FINAL NOTIFICATION
            const endTime = Date.now();
            const durationMinutes = ((endTime - startTime) / 60000).toFixed(2);

            const completionEmbed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ Sync Complete')
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: 'Users Tracked', value: `${newStatsArray.length}`, inline: true },
                    { name: 'Time Taken', value: `${durationMinutes}m`, inline: true },
                    { name: 'Status', value: 'Database Rebuilt Successfully', inline: false }
                )
                .setTimestamp();

            // We use interaction.channel.send because the interaction token is likely expired
            await interaction.channel.send({ 
                content: `<@${interaction.user.id}>`, 
                embeds: [completionEmbed] 
            });

        } catch (error) {
            console.error('CRITICAL SYNC ERROR:', error);
            await interaction.channel.send('❌ **An error occurred during sync.** Rebuild failed. Check the PM2 logs for details.');
        }
    }
};