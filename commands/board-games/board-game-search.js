const { SlashCommandBuilder } = require('discord.js');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchboardgame')
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

            // Limit the total results to 100 and process in batches of 20
            const totalItems = searchData.items.item.slice(0, 100);
            const batchSize = 20;

            const games = [];
            for (let i = 0; i < totalItems.length; i += batchSize) {
                const batch = totalItems.slice(i, i + batchSize);
                const gameIds = batch.map(item => item.$.id).join(',');

                // Retrieve detailed data for the current batch
                const detailsResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameIds}&stats=1`);
                const detailsData = await parseStringPromise(detailsResponse.data);

                // Extract games data
                const batchGames = detailsData.items.item.map(item => {
                    const name = item.name.find(n => n.$.type === 'primary').$.value;
                    const yearPublished = item.yearpublished ? item.yearpublished[0].$.value : 'Unknown';
                    const ratings = item.statistics[0].ratings[0];
                    const rank = ratings.ranks[0].rank.find(r => r.$.type === 'subtype' && r.$.value !== 'Not Ranked');
                    const numRatings = parseInt(ratings.usersrated[0].$.value, 10);
                    const averageRating = parseFloat(ratings.average[0].$.value);
                    const playtime = item.playingtime ? item.playingtime[0].$.value : 'Unknown';
                    const weight = ratings.averageweight ? parseFloat(ratings.averageweight[0].$.value) : 'Unknown';

                    return {
                        name,
                        yearPublished,
                        rank: rank ? parseInt(rank.$.value, 10) : Infinity,
                        numRatings,
                        averageRating,
                        playtime,
                        weight,
                    };
                });

                games.push(...batchGames);
            }

            // Find the game with the most ratings (votes)
            const mostVotedGame = games.reduce((mostVoted, game) => {
                return game.numRatings > mostVoted.numRatings ? game : mostVoted;
            });

            // Reply with the most popular game's details
            await interaction.editReply(
                `**${mostVotedGame.name}**
` +
                `- Year Published: ${mostVotedGame.yearPublished}
` +
                `- Popularity Rank: ${mostVotedGame.rank === Infinity ? 'Not Ranked' : mostVotedGame.rank}
` +
                `- Number of Ratings: ${mostVotedGame.numRatings}
` +
                `- Average Rating: ${mostVotedGame.averageRating.toFixed(2)}
` +
                `- Average Playtime: ${mostVotedGame.playtime} minutes
` +
                `- Weight (Complexity): ${mostVotedGame.weight === 'Unknown' ? 'Unknown' : mostVotedGame.weight.toFixed(2)} / 5
`
            );
        } catch (error) {
            console.error('Error fetching board game data:', error);
            await interaction.editReply('An error occurred while fetching the board game details. Please try again later.');
        }
    },
};
