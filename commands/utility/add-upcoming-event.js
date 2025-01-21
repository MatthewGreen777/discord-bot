const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-upcoming-events')
        .setDescription('Add a new event to the list. (Club Officers Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the event.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('The date of the event (YYYY-MM-DD).')
                .setRequired(true)),
    async execute(interaction) {
        const clubOfficerRole = interaction.guild.roles.cache.find(role => role.name === 'Club Officer');

        // Check if the user has the required role
        if (!clubOfficerRole || !interaction.member.roles.cache.has(clubOfficerRole.id)) {
            return interaction.reply({
                content: 'You do not have permission to use this command. Only Club Officers can add events.',
                ephemeral: true, // Only visible to the user
            });
        }

        const guildId = interaction.guild.id;
        const filePath = path.join(__dirname, `upcoming-events-${guildId}.csv`);
        const title = interaction.options.getString('title');
        const dateInput = interaction.options.getString('date');
        const date = new Date(dateInput);

        // Validate the date input
        if (isNaN(date.getTime())) {
            return interaction.reply({
                content: 'Invalid date format. Please use YYYY-MM-DD.',
                ephemeral: true,
            });
        }

        // Read and parse existing events
        let events = [];
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf-8');
            events = data
                .trim()
                .split('\n')
                .map(line => {
                    const [storedTitle, storedDate] = line.split(',');
                    return { title: storedTitle, date: new Date(storedDate) };
                })
                .filter(event => event.date >= new Date());
        }

        // Add the new event and sort the list by date
        events.push({ title, date });
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Write the updated list back to the file
        const csvData = events.map(event => `${event.title},${event.date.toISOString()}`).join('\n');
        fs.writeFileSync(filePath, csvData);

        interaction.reply(`Event "${title}" on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} has been added.`);
    },
};
