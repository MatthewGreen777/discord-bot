const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const csvWriter = require('csv-writer');

const filePath = path.join(__dirname, 'rps_choices.csv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rock-paper-scissors')
        .setDescription('Play Rock Paper Scissors with the bot!')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Your choice: Rock (r), Paper (p), or Scissors (s)')
                .setRequired(true)),
    async execute(interaction) {
        const userChoiceInput = interaction.options.getString('choice').toLowerCase();
        const validChoices = { r: 'rock', p: 'paper', s: 'scissors', rock: 'rock', paper: 'paper', scissors: 'scissors' };

        // Validate user input
        if (!validChoices[userChoiceInput]) {
            return interaction.reply('Invalid choice. Please choose Rock (r), Paper (p), or Scissors (s).');
        }

        const userChoice = validChoices[userChoiceInput];

        // Read the CSV file and calculate the best counter-choice
        const data = [];
        if (fs.existsSync(filePath)) {
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', row => data.push({
                    rock: parseInt(row.rock, 10) || 0,
                    paper: parseInt(row.paper, 10) || 0,
                    scissors: parseInt(row.scissors, 10) || 0,
                }))
                .on('end', () => {
                    // Calculate weighted probabilities
                    const choices = data.reduce((acc, row) => {
                        acc.rock += row.rock;
                        acc.paper += row.paper;
                        acc.scissors += row.scissors;
                        return acc;
                    }, { rock: 0, paper: 0, scissors: 0 });

                    const total = choices.rock + choices.paper + choices.scissors;
                    const probabilities = {
                        rock: choices.rock / total || 1 / 3,
                        paper: choices.paper / total || 1 / 3,
                        scissors: choices.scissors / total || 1 / 3,
                    };

                    // Select the bot's choice based on probabilities
                    const weightedChoices = {
                        rock: probabilities.scissors, // Scissors loses to rock
                        paper: probabilities.rock,    // Rock loses to paper
                        scissors: probabilities.paper // Paper loses to scissors
                    };

                    const botChoice = Object.entries(weightedChoices).reduce(
                        (max, entry) => entry[1] > max[1] ? entry : max,
                        ['rock', 0]
                    )[0];

                    // Determine the result
                    let result;
                    if (userChoice === botChoice) {
                        result = 'It\'s a tie!';
                    } else if (
                        (userChoice === 'rock' && botChoice === 'scissors') ||
                        (userChoice === 'paper' && botChoice === 'rock') ||
                        (userChoice === 'scissors' && botChoice === 'paper')
                    ) {
                        result = 'You win!';
                    } else {
                        result = 'You lose!';
                    }

                    // Update the CSV file
                    const updatedRow = data[0] || { rock: 0, paper: 0, scissors: 0 };
                    updatedRow[userChoice] += 1;

                    const csvWriterInstance = csvWriter.createObjectCsvWriter({
                        path: filePath,
                        header: [
                            { id: 'rock', title: 'rock' },
                            { id: 'paper', title: 'paper' },
                            { id: 'scissors', title: 'scissors' },
                        ],
                    });

                    csvWriterInstance.writeRecords([updatedRow])
                        .catch(console.error);

                    // Reply with the result
                    interaction.reply(`You chose ${userChoice}. The bot chose ${botChoice}. ${result}`);
                });
        } else {
            // Initialize CSV file if it doesn't exist
            fs.writeFileSync(filePath, 'rock,paper,scissors\n0,0,0');
            interaction.reply('No game data found. Starting a new game record. Please try again.');
        }
    },
};
