const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { parseStringPromise } = require('xml2js');

const filePath = path.join(__dirname, 'member-board-games.csv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listgames')
        .setDescription('Retrieve a list of board games owned by a user.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The Discord user to retrieve games for.')
                .setRequired(true)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const discordId = targetUser.id;

        // Load BGG usernames from CSV
        const users = await new Promise((resolve, reject) => {
            const results = [];
            if (!fs.existsSync(filePath)) return resolve([]);
            fs.createReadStream(filePath)
                .pipe(csvParser())
                .on('data', data => {
                    data.discordId = data['Discord ID']?.trim();
                    data.bggUsername = data['BGG Username']?.trim();
                    results.push(data);
                })
                .on('end', () => resolve(results))
                .on('error', reject);
        });

        const user = users.find(u => u.discordId === discordId);
        if (!user) {
            return interaction.reply(`${targetUser.username} has not set their BGG username.`);
        }

        const username = user.bggUsername;
        const ITEMS_PER_PAGE = 20;

        await interaction.deferReply();

        try {
            // Fetch the user's collection from BGG API
            const collectionResponse = await axios.get(`https://boardgamegeek.com/xmlapi2/collection?username=${username}&own=1`);
            const collectionData = await parseStringPromise(collectionResponse.data);

            // Check if the API response contains valid data
            if (!collectionData.items || !collectionData.items.item) {
                const errorMessage = collectionData.message || 'No games found or user does not exist.';
                return interaction.editReply(`Error: ${errorMessage}`);
            }

            // Extract games from the response
            const games = collectionData.items.item.map(item => item.name[0]._);

            if (games.length === 0) {
                return interaction.editReply(`No games found for user "${username}".`);
            }

            let currentPage = 0;

            // Helper function to generate the paginated embed
            const generateEmbed = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const pageGames = games.slice(start, end);
                const embedContent = pageGames.map((game, index) => `${start + index + 1}. ${game}`).join('\n');

                return {
                    content: `**Games owned by Club**\n${embedContent}\n\nPage ${page + 1} of ${Math.ceil(games.length / ITEMS_PER_PAGE)}`,
                    components: [
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('previous')
                                .setLabel('⬅️ Previous')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(page === 0),
                            new ButtonBuilder()
                                .setCustomId('next')
                                .setLabel('➡️ Next')
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(end >= games.length)
                        )
                    ]
                };
            };

            // Send the initial embed
            const initialEmbed = generateEmbed(currentPage);
            const message = await interaction.editReply(initialEmbed);

            // Create a collector to handle button interactions
            const filter = (i) => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({ filter, time: 60000 });

            collector.on('collect', async (buttonInteraction) => {
                if (buttonInteraction.customId === 'next') {
                    currentPage++;
                } else if (buttonInteraction.customId === 'previous') {
                    currentPage--;
                }

                const updatedEmbed = generateEmbed(currentPage);
                await buttonInteraction.update(updatedEmbed);
            });

            collector.on('end', async () => {
                // Disable buttons after collector ends
                const disabledComponents = initialEmbed.components[0].components.map(button =>
                    button.setDisabled(true)
                );

                await interaction.editReply({ components: [new ActionRowBuilder().addComponents(disabledComponents)] });
            });
        } catch (error) {
            console.error('Error fetching games from BGG:', error);
            await interaction.editReply('An error occurred while fetching the game list. Please try again later.');
        }
    },
};
