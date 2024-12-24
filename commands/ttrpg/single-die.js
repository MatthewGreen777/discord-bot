const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roll-die')
        .setDescription('Rolls an X-sided die and returns the result.')
        .addIntegerOption(option =>
            option
                .setName('sides')
                .setDescription('Number of sides on the die')
                .setRequired(true)
                .setMinValue(2) // Minimum value for a die is 2
        ),
    async execute(interaction) {
        // Get the number of sides from the user's input
        const sides = interaction.options.getInteger('sides');
        
        // Roll the die
        const result = Math.floor(Math.random() * sides) + 1;

        // Reply with the result
        await interaction.reply(`You rolled a **${sides}-sided die** and got **${result}**!`);
    },
};
