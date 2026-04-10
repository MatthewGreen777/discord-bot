// commands/other/user-stats.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const csvParser = require('csv-parser');
const { getGuildFilePath } = require('../../message-logger'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-stats')
        .setDescription('Check stats in this server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to look up')
                .setRequired(false)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const filePath = getGuildFilePath(interaction.guild.id);

        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: 'No data for this server yet.', ephemeral: true });
        }

        let foundRow = null;
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (row.userId === targetUser.id) foundRow = row;
            })
            .on('end', () => {
                if (foundRow) {
                    const statsEmbed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`📊 ${targetUser.username}'s Stats`)
                        .setThumbnail(targetUser.displayAvatarURL())
                        .addFields(
                            { name: 'Messages', value: `**${foundRow.messages}** (Rank #${foundRow.messageRank})`, inline: true },
                            { name: 'Words', value: `**${foundRow.words}** (Rank #${foundRow.wordRank})`, inline: true }
                        )
                        .setFooter({ text: interaction.guild.name });

                    interaction.reply({ embeds: [statsEmbed] });
                } else {
                    interaction.reply({ content: 'User has no recorded stats here.', ephemeral: true });
                }
            });
    }
};