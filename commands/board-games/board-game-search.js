const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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

        await interaction.deferReply();

        try {
            // 1. Search for the game
            const searchResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/search?query=${encodeURIComponent(gameName)}&type=boardgame`);
            const searchData = await parseStringPromise(searchResponse.data);

            const items = searchData.items.item;
            if (!items || items.length === 0) {
                return interaction.editReply(`No board games found with the name "${gameName}".`);
            }

            // 2. Grab the first 20 IDs. 
            // BGG allows max 20 per request. Doing more requires a 5-sec sleep between calls.
            const gameIds = items.slice(0, 20).map(item => item.$.id).join(',');

            // 3. Get detailed stats
            const detailsResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/thing?id=${gameIds}&stats=1`);
            const detailsData = await parseStringPromise(detailsResponse.data);

            const games = detailsData.items.item.map(item => {
                // Safely get the primary name
                const primaryNameNode = item.name.find(n => n.$.type === 'primary');
                const name = primaryNameNode ? primaryNameNode.$.value : 'Unknown';
                
                const yearPublished = item.yearpublished?.[0]?.$.value || 'Unknown';
                const stats = item.statistics?.[0]?.ratings?.[0];
                
                // Find the main "Board Game Rank" specifically
                const ranks = stats?.ranks?.[0]?.rank || [];
                const boardGameRankNode = ranks.find(r => r.$.name === 'boardgame');
                const rankValue = boardGameRankNode?.$.value;

                return {
                    name,
                    yearPublished,
                    rank: (rankValue && rankValue !== 'Not Ranked') ? parseInt(rankValue, 10) : Infinity,
                    numRatings: parseInt(stats?.usersrated?.[0]?.$.value || 0, 10),
                    averageRating: parseFloat(stats?.average?.[0]?.$.value || 0),
                    playtime: item.playingtime?.[0]?.$.value || 'Unknown',
                    weight: parseFloat(stats?.averageweight?.[0]?.$.value || 0),
                    thumbnail: item.thumbnail?.[0] || null
                };
            });

            // 4. Find the "Most Voted" game among the search results
            const mostVotedGame = games.reduce((prev, current) => 
                (prev.numRatings > current.numRatings) ? prev : current
            );

            // 5. Create a pretty Embed for the reply
            const embed = new EmbedBuilder()
                .setTitle(mostVotedGame.name)
                .setColor(0xFF5A00) // BGG Orange
                .setThumbnail(mostVotedGame.thumbnail)
                .addFields(
                    { name: '📅 Year', value: mostVotedGame.yearPublished.toString(), inline: true },
                    { name: '🏆 Rank', value: mostVotedGame.rank === Infinity ? 'Not Ranked' : `#${mostVotedGame.rank}`, inline: true },
                    { name: '⭐ Rating', value: `${mostVotedGame.averageRating.toFixed(1)} / 10 (${mostVotedGame.numRatings} votes)`, inline: true },
                    { name: '⚖️ Complexity', value: `${mostVotedGame.weight.toFixed(2)} / 5`, inline: true },
                    { name: '⏱️ Playtime', value: `${mostVotedGame.playtime} mins`, inline: true }
                )
                .setFooter({ text: 'Data from BoardGameGeek' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('BGG API Error:', error);
            await interaction.editReply('An error occurred while fetching data. BGG might be busy (Rate Limited).');
        }
    },
};