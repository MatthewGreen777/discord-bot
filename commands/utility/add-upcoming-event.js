const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'upcoming-events.csv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-upcoming-events')
        .setDescription('Add a new upcoming event (Club Officers Only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('The title of the event')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('date')
                .setDescription('The date of the event (YYYY-MM-DD)')
                .setRequired(true)),
    async execute(interaction) {
        const clubOfficerRole = interaction.guild.roles.cache.find(role => role.name === 'Club Officer');

        if (!clubOfficerRole || !interaction.member.roles.cache.has(clubOfficerRole.id)) {
            return interaction.reply('You do not have permission to use this command. Only Club Officers can add events.');
        }

        const title = interaction.options.getString('title');
        const dateInput = interaction.options.getString('date');
        const date = new Date(dateInput);

        if (isNaN(date.getTime())) {
            return interaction.reply('Invalid date format. Please use YYYY-MM-DD.');
        }

        let events = [];
        if (fs.existsSync(FILE_PATH)) {
            const data = fs.readFileSync(FILE_PATH, 'utf-8');
            events = data
                .trim()
                .split('\n')
                .map(line => {
                    const [storedTitle, storedDate] = line.split(',');
                    return { title: storedTitle, date: new Date(storedDate) };
                })
                .filter(event => event.date >= new Date());
        }

        events.push({ title, date });
        events.sort((a, b) => new Date(a.date) - new Date(b.date));

        const csvData = events.map(event => `${event.title},${event.date.toISOString()}`).join('\n');
        fs.writeFileSync(FILE_PATH, csvData);

        interaction.reply(`Event "${title}" on ${dateInput} has been added.`);
    },
};
