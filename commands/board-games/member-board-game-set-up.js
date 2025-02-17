const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');
const lockfile = require('proper-lockfile');

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
        const serverId = interaction.guild.id; // Unique per server
        const bggUsername = interaction.options.getString('username');

        const serverFilePath = path.join(__dirname, `server_${serverId}_board_games.csv`);

        let users = [];

        // Ensure file exists before reading
        if (fs.existsSync(serverFilePath)) {
            users = await new Promise((resolve) => {
                const results = [];
                fs.createReadStream(serverFilePath)
                    .pipe(csvParser())
                    .on('data', data => {
                        data.discordId = data['Discord ID'.trim()] || data['discordId']?.trim();
                        data.bggUsername = data['BGG Username'.trim()] || data['bggUsername']?.trim();
                        results.push(data);
                    })
                    .on('end', () => resolve(results))
                    .on('error', error => {
                        console.error("Error reading CSV:", error);
                        resolve([]);
                    });
            });
        }

        const existingUser = users.find(user => user.discordId === discordId);
        let message;

        if (existingUser) {
            existingUser.bggUsername = bggUsername;
            message = 'Your BGG username has been updated.';
        } else {
            users.push({ discordId, bggUsername });
            message = 'Your BGG username has been set.';
        }

        async function updateCSV(users) {
            try {
                const release = await lockfile.lock(serverFilePath);

                const writer = csvWriter({
                    path: serverFilePath,
                    header: [
                        { id: 'discordId', title: 'Discord ID' },
                        { id: 'bggUsername', title: 'BGG Username' },
                    ],
                });

                await writer.writeRecords(users);
                await release();
            } catch (error) {
                console.error("Error updating CSV:", error);
            }
        }

        await updateCSV(users);
        await interaction.reply(message);
    },
};
