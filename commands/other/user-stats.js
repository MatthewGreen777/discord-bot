// commands/other/user-stats.js
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const csvParser = require('csv-parser');
const { filePath } = require('../../message-logger'); // fixed path

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user-stats')
        .setDescription('Check word and message count of a user in this server.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user you want to look up')
                .setRequired(true)),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');

        if (!fs.existsSync(filePath)) {
            return interaction.reply('No stats data found yet.');
        }

        let found = false;

        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (row.userId === targetUser.id) {
                    found = true;
                    interaction.reply(
                        `📊 Stats for **${row.username}**:\n` +
                        `- Messages sent: **${row.messages}**\n` +
                        `- Words typed: **${row.words}**`
                    );
                }
            })
            .on('end', () => {
                if (!found) {
                    interaction.reply(`No stats found for ${targetUser.username}.`);
                }
            })
            .on('error', (err) => {
                console.error(err);
                interaction.reply('There was an error retrieving the stats.');
            });
    }
};