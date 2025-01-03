const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search-board-game')
        .setDescription('Search for a board game and get its details.')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name of the board game to search for')
                .setRequired(true)
        ),
    async execute(interaction) {
        const gameName = interaction.options.getString('name');

        // Defer the reply to allow time for fetching data
        await interaction.deferReply();

        try {
            // Search for the board game using the BGG API
            const searchResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`);
            const searchData = await parseStringPromise(searchResponse.data);

            // If no games are found, notify the user
            if (!searchData.items.item || searchData.items.item.length === 0) {
                return interaction.editReply(`No board games found with the name "${gameName}".`);
            }

            // Limit the search results to 20 items
            const limitedItems = searchData.items.item.slice(0, 20);
            const gameIds = limitedItems.map(item => item.$.id).join(',');

            // Retrieve detailed data for the limited matching games
            const detailsResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameIds}&stats=1`);
            const detailsData = await parseStringPromise(detailsResponse.data);

            // Extract and prioritize games by popularity (rank)
            const games = detailsData.items.item.map(item => {
                const name = item.name.find(n => n.$.type === 'primary').$.value;
                const yearPublished = item.yearpublished ? item.yearpublished[0].$.value : 'Unknown';
                const ratings = item.statistics[0].ratings[0];
                const rank = ratings.ranks[0].rank.find(r => r.$.type === 'subtype' && r.$.value !== 'Not Ranked');
                const playtime = item.playingtime ? item.playingtime[0].$.value : 'Unknown';
                const weight = ratings.averageweight ? parseFloat(ratings.averageweight[0].$.value) : 'Unknown';

                return {
                    name,
                    yearPublished,
                    rank: rank ? parseInt(rank.$.value, 10) : Infinity, // Higher numbers are less popular
                    numRatings: parseInt(ratings.usersrated[0].$.value, 10),
                    averageRating: parseFloat(ratings.average[0].$.value),
                    playtime,
                    weight,
                };
            });

            // Find the most popular game (lowest rank value)
            const mostPopularGame = games.reduce((mostPopular, game) => {
                return game.rank < mostPopular.rank ? game : mostPopular;
            });

            // Reply with the most popular game's details
            await interaction.editReply(
                `**${mostPopularGame.name}**
` +
                `- Year Published: ${mostPopularGame.yearPublished}
` +
                `- Popularity Rank: ${mostPopularGame.rank}
` +
                `- Number of Ratings: ${mostPopularGame.numRatings}
` +
                `- Average Rating: ${mostPopularGame.averageRating.toFixed(2)}
` +
                `- Average Playtime: ${mostPopularGame.playtime} minutes
` +
                `- Weight (Complexity): ${mostPopularGame.weight === 'Unknown' ? 'Unknown' : mostPopularGame.weight.toFixed(2)} / 5
`
            );
        } catch (error) {
            console.error('Error fetching board game data:', error);
            await interaction.editReply('An error occurred while fetching the board game details. Please try again later.');
        }
    },
};
