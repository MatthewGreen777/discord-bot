const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const FILE_PATH = path.join(__dirname, 'upcoming-events.csv');

// Helper function to format dates
function formatDate(date) {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });

    // Determine suffix
    const suffixIndex = day % 10 <= 3 && Math.floor(day / 10) !== 1 ? day % 10 : 0;
    const suffix = suffixes[suffixIndex];

    return `${month} ${day}${suffix}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upcoming-events')
        .setDescription('List all upcoming events in order by date.'),
    async execute(interaction) {
        if (!fs.existsSync(FILE_PATH)) {
            return interaction.reply('No upcoming events found.');
        }

        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        const events = data
            .trim()
            .split('\n')
            .map(line => {
                const [title, date] = line.split(',');
                return { title, date: new Date(date) };
            })
            .filter(event => 
                event.date.setHours(0, 0, 0, 0) >= new Date().setHours(0, 0, 0, 0)
            ) // Filter out past events, excluding today
            .sort((a, b) => a.date - b.date); // Sort by date

        if (events.length === 0) {
            return interaction.reply('No upcoming events found.');
        }

        const eventList = events
            .map(event => `${formatDate(event.date)}: ${event.title}`)
            .join('\n');

        interaction.reply(`**Upcoming Events:**\n${eventList}`);
    },
};