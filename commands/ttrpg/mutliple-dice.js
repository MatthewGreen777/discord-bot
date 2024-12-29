const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll-dice')
        .setDescription('Roll multiple dice by selecting number of dice and sides.')
        .addIntegerOption(option =>
            option
                .setName('count')
                .setDescription('Number of dice to roll')
                .setRequired(true)
                .setMinValue(1) // At least one die
                .setMaxValue(10000) // Maximum 10,000 dice
        )
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('Number of sides each die has')
                .setRequired(true)
                .setMinValue(2) // Minimum 2 sides per die
                .setMaxValue(100) // Maximum 100 sides per die
        ),
    async execute(interaction) {
        try {
            // Get user inputs
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

            // Prepare parts of the response
            const resultsText = results.join(', ');
            const countsText = Object.entries(counts)
                .map(([number, frequency]) => `${number}: ${frequency}`)
                .join('\n');
            const total = results.reduce((sum, num) => sum + num, 0);

            // Construct full response
            let response = `You rolled **${count} dice** with **${sides} sides** each. Results: [${resultsText}]\n**Total**: ${total}\n**Counts**:\n${countsText}`;

            // Check if the original response is too long
            if (response.length > 2000) {
                response = `The results are too long to display. Here is a summary:\n**Total**: ${total}\n**Counts**:\n${countsText}`;

                // Check if the fallback response is also too long
                if (response.length > 2000) {
                    response = `The results are too long to display. Summary only:\n**Total**: ${total}`;
                }
            }

            // Send the response
            await interaction.reply(response);
        } catch (error) {
            console.error('Error executing roll-dice command:', error);
            await interaction.reply({
                content: 'There was an error while executing this command.',
                ephemeral: true,
            });
        }
    },
};
