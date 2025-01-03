const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('randomfact')
        .setDescription('Get a random fact from the list!'),
    async execute(interaction) {
        try {
            // Path to the CSV file
            const filePath = path.join(__dirname, '../../random-facts.csv');

            // Read the file contents
            const fileContent = fs.readFileSync(filePath, 'utf8');

            // Split the file into lines
            const facts = fileContent.split('\n').filter(line => line.trim() !== '');

            // Get a random fact
            const randomFact = facts[Math.floor(Math.random() * facts.length)];

            // Reply with the random fact
            await interaction.reply(randomFact);
        } catch (error) {
            console.error('Error reading random-facts.csv or replying:', error);
            await interaction.reply({
                content: 'Something went wrong while fetching a random fact!',
                ephemeral: true,
            });
        }
    },
};
