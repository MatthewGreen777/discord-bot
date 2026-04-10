// commands/other/user-stats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const csvParser = require('csv-parser');
const path = require('path');

// We import the filePath from your logger
const { filePath } = require('../../message-logger'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-stats')
        .setDescription('Check word and message count of a user in this server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to look up (leave blank for yourself)')
                .setRequired(false)), // Now optional

    async execute(interaction) {
        // Fallback to the command caller if no target is provided
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guild.id;

        if (!fs.existsSync(filePath)) {
            return interaction.reply({ 
                content: 'No stats data found yet. Someone needs to send a message first!', 
                ephemeral: true 
            });
        }

        let foundRow = null;

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (row.userId === targetUser.id && row.guildId === guildId) {
                    foundRow = row;
                }
            })
            .on('end', () => {
                if (foundRow) {
                    // Create the Embed
                    const statsEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`📊 Server Stats: ${targetUser.username}`)
                        .setThumbnail(targetUser.displayAvatarURL())
                        .addFields(
                            { name: 'Messages Sent', value: `**${foundRow.messages}**`, inline: true },
                            { name: 'Message Rank', value: `#${foundRow.messageRank}`, inline: true },
                            { name: '\u200B', value: '\u200B', inline: false }, // Spacer
                            { name: 'Words Typed', value: `**${foundRow.words}**`, inline: true },
                            { name: 'Word Rank', value: `#${foundRow.wordRank}`, inline: true }
                        )
                        .setFooter({ text: `Stats for ${interaction.guild.name}` })
                        .setTimestamp();

                    interaction.reply({ embeds: [statsEmbed] });
                } else {
                    interaction.reply({
                        content: `No stats found for **${targetUser.username}** in this server.`,
                        ephemeral: true
                    });
                }
            })
            .on('error', (err) => {
                console.error('CSV Parsing Error:', err);
                interaction.reply({ 
                    content: 'There was an error retrieving the stats.', 
                    ephemeral: true 
                });
            });
    }
};