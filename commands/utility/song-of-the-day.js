const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');

const dataFolder = path.join(__dirname, 'song_data');
if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder);
}

function getServerCSVPath(guildId) {
    return path.join(dataFolder, `songs_${guildId}.csv`);
}

function ensureServerCSVExists(guildId) {
    const filePath = getServerCSVPath(guildId);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'date,songUrl\n', 'utf8');
    }
}

function addOrUpdateSong(guildId, date, songUrl) {
    const filePath = getServerCSVPath(guildId);
    ensureServerCSVExists(guildId);

    let data = fs.readFileSync(filePath, 'utf8').split('\n');
    let found = false;

    data = data.map(line => {
        if (line.startsWith(date)) {
            found = true;
            return `${date},${songUrl}`;
        }
        return line;
    });

    if (!found) {
        data.push(`${date},${songUrl}`);
    }

    fs.writeFileSync(filePath, data.join('\n'), 'utf8');
}

function removeSongFromCSV(guildId, date) {
    const filePath = getServerCSVPath(guildId);
    if (!fs.existsSync(filePath)) return;

    let data = fs.readFileSync(filePath, 'utf8').split('\n');
    data = data.filter(line => !line.startsWith(date) && line.trim() !== '');
    
    fs.writeFileSync(filePath, data.join('\n'), 'utf8');
}

function scheduleSongOfTheDay(client) {
    schedule.scheduleJob('17 6 * * *', async function () {
        for (const guild of [...client.guilds.cache.values()]) {
            const guildId = guild.id;
            const filePath = getServerCSVPath(guildId);
            if (!fs.existsSync(filePath)) continue;

            const today = new Date().toISOString().split('T')[0];
            const formattedDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });
            const data = fs.readFileSync(filePath, 'utf8').split('\n').slice(1);
            const songEntry = data.find(line => line.startsWith(today));

            if (songEntry) {
                const [, songUrl] = songEntry.split(',');

                const channel = guild.channels.cache.find(ch => ch.name === 'song-of-the-day');
                if (channel) {
                    channel.send(`${formattedDate}\n${songUrl} .`);
                }

                removeSongFromCSV(guildId, today);
            }
        }
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('song-of-the-day')
        .setDescription('Set a song for a specific date. (Club Officers only)')
        .addStringOption(option =>
            option.setName('date')
                .setDescription('Enter the date (YYYY-MM-DD)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('song_url')
                .setDescription('Enter the song URL')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const { guildId, member } = interaction;
        const date = interaction.options.getString('date');
        const songUrl = interaction.options.getString('song_url');
        const allowedRoles = ['Club Officer', 'Developer', 'Admin'];

        const hasPermision = member.roles.cache.some(role => allowedRoles.includes(role.name));
        if (!hasPermision) {
            return interaction.reply({ content: '⚠️ You do not have permission to use this command.', ephemeral: true });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return interaction.reply({ content: 'Invalid date format! Please use YYYY-MM-DD.', ephemeral: true });
        }

        ensureServerCSVExists(guildId);
        addOrUpdateSong(guildId, date, songUrl);
        return interaction.reply({ content: `✅ The song has been set for **${date}**!` });
    },

    scheduleSongOfTheDay
};
