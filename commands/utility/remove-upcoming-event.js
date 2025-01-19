const { SlashCommandBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'upcoming-events.csv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove-upcoming-events')
        .setDescription('Remove an upcoming event (Club Officers Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the event to remove')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles) // Only visible to users with specific permissions
        .setDMPermission(false), // Disable use in DMs
    async execute(interaction) {
        const clubOfficerRole = interaction.guild.roles.cache.find(role => role.name === 'Club Officer');

        // Check if the user has the required role
        if (!clubOfficerRole || !interaction.member.roles.cache.has(clubOfficerRole.id)) {
            return interaction.reply({
                content: 'You do not have permission to use this command. Only Club Officers can remove events.',
                ephemeral: true, // Makes the reply visible only to the user
            });
        }

        const title = interaction.options.getString('title');

        if (!fs.existsSync(FILE_PATH)) {
            return interaction.reply({
                content: 'No events found.',
                ephemeral: true,
            });
        }

        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        const events = data
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

        const csvData = filteredEvents.map(event => `${event.title},${event.date.toISOString()}`).join('\n');
        fs.writeFileSync(FILE_PATH, csvData);

        interaction.reply(`Event "${title}" has been removed.`);
    },
};
