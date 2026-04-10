const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');
const config = require('../../config.json'); 

// Helper function to pause execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('club-games')
        .setDescription('Lists games owned by club on BoardGameGeek.'),
    async execute(interaction) {
        const username = config.BGG_USERNAME;
        const ITEMS_PER_PAGE = 10; // Embeds look better with 10

        await interaction.deferReply();

        try {
            let collectionData = null;
            let retries = 0;
            const maxRetries = 5;

            // 1. Fetching logic with 202 Retry Handling
            while (retries < maxRetries) {
                const response = await axios.get(`https://boardgamegeek.com/xmlapi2/collection?username=${username}&own=1`, {
                    validateStatus: (status) => status === 200 || status === 202
                });

                if (response.status === 202) {
                    retries++;
                    // Wait 3 seconds before trying again
                    await sleep(3000);
                    continue;
                }

                collectionData = await parseStringPromise(response.data);
                break;
            }

            // 2. Error Checking
            if (!collectionData || !collectionData.items || !collectionData.items.item) {
                return interaction.editReply(`Could not find a collection for user "${username}". (BGG might be busy or the name is wrong).`);
            }

            // 3. Extract Game Names (Robustly)
            const games = collectionData.items.item.map(item => {
                const nameObj = item.name[0];
                // BGG names in collections can be a string OR an object with a "_" property
                return (typeof nameObj === 'string') ? nameObj : nameObj._;
            }).filter(name => name).sort(); // Sort alphabetically

            if (games.length === 0) {
                return interaction.editReply(`The user "${username}" has no games marked as 'owned'.`);
            }

            let currentPage = 0;
            const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);

            // 4. Generate Embed
            const generateEmbed = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const end = start + ITEMS_PER_PAGE;
                const pageGames = games.slice(start, end);
                
                const list = pageGames.map((game, i) => `**${start + i + 1}.** ${game}`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`Club Collection (${games.length} Games)`)
                    .setDescription(list)
                    .setColor(0x3f3a71) // Nice purple
                    .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev')
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next')
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page === totalPages - 1)
                );

                return { embeds: [embed], components: [buttons] };
            };

            const message = await interaction.editReply(generateEmbed(currentPage));

            // 5. Interaction Collector (Button Handling)
            const collector = message.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: "Only the person who ran the command can flip pages!", ephemeral: true });
                }

                if (i.customId === 'next') currentPage++;
                if (i.customId === 'prev') currentPage--;

                await i.update(generateEmbed(currentPage));
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error('BGG Collection Error:', error);
            await interaction.editReply('BGG is taking too long to respond. Please try again in 1 minute.');
        }
    },
};