const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-upcoming-events')
        .setDescription('Remove an event from the list. (Club Officers Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the event to remove.')
                .setRequired(true)),
    async execute(interaction) {
        const clubOfficerRole = interaction.guild.roles.cache.find(role => role.name === 'Club Officers');

        // Check if the user has the required role
        if (!clubOfficerRole || !interaction.member.roles.cache.has(clubOfficerRole.id)) {
            return interaction.reply({
                content: 'You do not have permission to use this command. Only Club Officers can remove events.',
                ephemeral: true, // Makes the reply visible only to the user
            });
        }

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, `upcoming-events-${guildId}.csv`);
        const title = interaction.options.getString('title');

        if (!fs.existsSync(filePath)) {
            return interaction.reply({
                content: 'No events have been added yet.',
                ephemeral: true,
            });
        }

        const events = fs.readFileSync(filePath, 'utf-8')
            .trim()
            .split('\n')
            .map(line => {
                const [storedTitle, storedDate] = line.split(',');
                return { title: storedTitle, date: new Date(storedDate) };
            });

        const filteredEvents = events.filter(event => event.title.toLowerCase() !== title.toLowerCase());

        if (events.length === filteredEvents.length) {
            return interaction.reply({
                content: `No event with the title "${title}" was found.`,
                ephemeral: true,
            });
        }

        // Save updated events back to the file
        const csvData = filteredEvents.map(event => `${event.title},${event.date.toISOString()}`).join('\n');
        fs.writeFileSync(filePath, csvData);

        interaction.reply(`Event "${title}" has been removed.`);
    },
};
