const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll-dice')
        .setDescription('Roll multiple dice with a specified number of sides and see how many times each number was rolled.')
        .addIntegerOption(option =>
            option
                .setName('count')
                .setDescription('Number of dice to roll')
                .setRequired(true)
                .setMinValue(1) // At least one die
        )
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('Number of sides each die has')
                .setRequired(true)
                .setMinValue(2) // Minimum 2 sides per die
        ),
    async execute(interaction) {
        // Get the user inputs
        const count = interaction.options.getInteger('count');
        const sides = interaction.options.getInteger('sides');

        // Roll the dice
        const results = [];
        for (let i = 0; i < count; i++) {
            results.push(Math.floor(Math.random() * sides) + 1);
        }

        // Count occurrences of each number
        const counts = {};
        for (let i = 1; i <= sides; i++) {
            counts[i] = results.filter(num => num === i).length;
        }

        // Create a formatted response
        const resultsText = results.join(', ');
        const countsText = Object.entries(counts)
            .map(([number, frequency]) => `${number}: ${frequency}`)
            .join('\n');

        const total = results.reduce((sum, num) => sum + num, 0);

        // Response text
        const response = `You rolled **${count} dice** with **${sides} sides** each. Results: [${resultsText}]\n**Total**: ${total}\n**Counts**:\n${countsText}`;

        // Ensure response doesn't exceed Discord's character limit
        if (response.length > 2000) {
            await interaction.reply({
                content: "The results are too long to display. Here is a summary:\n" +
                        `**Total**: ${total}\n` +
                         `**Counts**:\n ${countsText}\n`, 
            });
        } else {
            await interaction.reply(response);
        }
    },
};