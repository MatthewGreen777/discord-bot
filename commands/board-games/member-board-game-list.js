const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { parseStringPromise } = require('xml2js');

// Helper to handle BGG's required wait times
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('list-member-games')
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
        const serverId = interaction.guild.id;
        const serverFilePath = path.join(__dirname, `server_${serverId}_board_games.csv`);

        if (!fs.existsSync(serverFilePath)) {
            return interaction.reply({ content: `No board game data found for this server. Users must set their BGG username first.`, ephemeral: true });
        }

        // 1. Read CSV to find the BGG Username
        const users = await new Promise((resolve) => {
            const results = [];
            fs.createReadStream(serverFilePath)
                .pipe(csvParser())
                .on('data', data => results.push(data))
                .on('end', () => resolve(results))
                .on('error', () => resolve([]));
        });

        // Robustly find the user (handling potential space issues in CSV headers)
        const userEntry = users.find(u => {
            const rowId = u['Discord ID'] || u['discordId'] || u['ID'];
            return rowId?.trim() === discordId;
        });

        if (!userEntry) {
            return interaction.reply({ content: `${targetUser.username} hasn't linked their BGG account yet.`, ephemeral: true });
        }

        const bggUsername = userEntry['BGG Username'] || userEntry['bggUsername'] || userEntry['Username'];
        const ITEMS_PER_PAGE = 10;

        await interaction.deferReply();

        try {
            let collectionData = null;
            let retries = 0;
            const maxRetries = 5;

            // 2. Fetch with BGG 202 "Processing" handling
            while (retries < maxRetries) {
                const response = await axios.get(`https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(bggUsername)}&own=1`, {
                    validateStatus: (status) => status === 200 || status === 202
                });

                if (response.status === 202) {
                    retries++;
                    await sleep(3000); // Wait 3 seconds for BGG to generate the XML
                    continue;
                }

                collectionData = await parseStringPromise(response.data);
                break;
            }

            // 3. Validate response
            if (!collectionData?.items?.item) {
                return interaction.editReply(`No games found for BGG user "${bggUsername}". The profile might be private or empty.`);
            }

            // 4. Extract and Sort Names
            const games = collectionData.items.item.map(item => {
                const nameNode = item.name[0];
                return (typeof nameNode === 'string') ? nameNode : nameNode._;
            }).filter(n => n).sort();

            let currentPage = 0;
            const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);

            // 5. Build Pagination System
            const generatePage = (page) => {
                const start = page * ITEMS_PER_PAGE;
                const pageGames = games.slice(start, start + ITEMS_PER_PAGE);
                const list = pageGames.map((g, i) => `**${start + i + 1}.** ${g}`).join('\n');

                const embed = new EmbedBuilder()
                    .setTitle(`${targetUser.username}'s Collection`)
                    .setAuthor({ name: `BGG: ${bggUsername}` })
                    .setDescription(list || "No games found.")
                    .setColor(0x2F3136)
                    .setFooter({ text: `Page ${page + 1} of ${totalPages} (${games.length} total games)` });

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
                        .setDisabled(page >= totalPages - 1)
                );

                return { embeds: [embed], components: [buttons] };
            };

            const message = await interaction.editReply(generatePage(currentPage));

            // 6. Interaction Collector
            const collector = message.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) return i.reply({ content: "Run the command yourself to use buttons!", ephemeral: true });

                if (i.customId === 'next') currentPage++;
                else if (i.customId === 'prev') currentPage--;

                await i.update(generatePage(currentPage));
            });

            collector.on('end', () => {
                interaction.editReply({ components: [] }).catch(() => {});
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply("BGG's servers are a bit slow right now. Try again in a moment.");
        }
    },
};