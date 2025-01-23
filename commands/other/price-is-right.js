const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');

const productsFilePath = path.join(__dirname, 'products.csv');
let products = [];

// Store active games by user ID, including a timeout ID
const activeGames = {};

// Load product data
fs.createReadStream(productsFilePath)
    .pipe(csvParser())
    .on('data', (row) => {
        products.push({
            id: row.id,
            name: row.name,
            price: parseFloat(row.price),
            imagePath: row.image_path,
        });
    })
    .on('end', () => {
        console.log('Product data loaded.');
    });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('price-is-right')
        .setDescription('Guess the price of a product! (Margin of 5%)')
        .addStringOption(option =>
            option.setName('guess')
                .setDescription('Your price guess (in dollars)')
                .setRequired(false)),
    async execute(interaction) {
        const userId = interaction.user.id;

        // Check if the user is making a guess
        const guess = interaction.options.getString('guess');
        if (guess) {
            // User is providing a guess
            if (!activeGames[userId]) {
                return interaction.reply('You have not started a game yet! Use the command without a guess to start.');
            }

            const gameData = activeGames[userId];
            const product = gameData.product;
            const userGuess = parseFloat(guess);

            if (isNaN(userGuess)) {
                return interaction.reply('Please provide a valid number for your guess.');
            }

            // Cancel the timeout for this game
            clearTimeout(gameData.timeoutId);

            // Calculate margin of error
            const margin = product.price * 0.05; // 5% margin
            const minPrice = product.price - margin;
            const maxPrice = product.price + margin;

            // Check the guess
            let response;
            if (userGuess >= minPrice && userGuess <= maxPrice) {
                response = `🎉 Correct! The price of the ${product.name} is $${product.price.toFixed(2)}.`;
            } else if (userGuess < product.price) {
                response = `Too low! The price of the ${product.name} is $${product.price.toFixed(2)}.`;
            } else {
                response = `Too high! The price of the ${product.name} is $${product.price.toFixed(2)}.`;
            }

            // Clear the active game for the user
            delete activeGames[userId];
            return interaction.reply(response);
        } else {
            // User is starting a new game
            const product = products[Math.floor(Math.random() * products.length)];
            if (!product) {
                return interaction.reply('No products available. Please try again later.');
            }

            // Show the product image
            const attachment = new AttachmentBuilder(product.imagePath);
            await interaction.reply({
                content: `**Guess the price of this product!**\n*Product:* ${product.name}\nUse the command again with your guess (e.g., \`/price-is-right guess:50\`).`,
                files: [attachment],
            });

            // Set a timeout to clear the game after 1 minute
            const timeoutId = setTimeout(() => {
                delete activeGames[userId];
                interaction.followUp(`Your game has expired! The price of the ${product.name} was $${product.price.toFixed(2)}.`);
            }, 60 * 1000); // 1 minute timeout

            // Store the game data with the timeout ID
            activeGames[userId] = { product, timeoutId };
        }
    },
};
