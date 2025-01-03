const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

const filePath = path.join(__dirname, 'member-board-games.csv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-owned-games')
        .setDescription('Set your list of games owned using BGG.')
        .addStringOption(option =>
            option
                .setName('username')
                .setDescription('Your BGG username.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const discordId = interaction.user.id;
        const bggUsername = interaction.options.getString('username');

        let users = [];

        // Read the existing CSV if it exists
        if (fs.existsSync(filePath)) {
            users = await new Promise((resolve, reject) => {
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csvParser())
                    .on('data', data => results.push(data))
                    .on('end', () => resolve(results))
                    .on('error', reject);
            });
        }

        // Check if the user already exists
        const existingUser = users.find(user => user.discordId === discordId);
        let message;

        if (existingUser) {
            existingUser.bggUsername = bggUsername;
            message = 'Your BGG username has been updated.';
        } else {
            users.push({ discordId, bggUsername });
            message = 'Your BGG username has been set.';
        }

        // Write to the CSV
        const writer = csvWriter({
            path: filePath,
            header: [
                { id: 'discordId', title: 'Discord ID' },
                { id: 'bggUsername', title: 'BGG Username' },
            ],
        });
        await writer.writeRecords(users);

        await interaction.reply(message);
    },
};
