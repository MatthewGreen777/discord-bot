const { SlashCommandBuilder } = require('discord.js');
const { format } = require('date-fns');
const fs = require('fs');

// Load or initialize message counts
const messageCountsFile = './messageCounts.json';
let messageCounts = {};

if (fs.existsSync(messageCountsFile)) {
    messageCounts = JSON.parse(fs.readFileSync(messageCountsFile));
} else {
    fs.writeFileSync(messageCountsFile, JSON.stringify(messageCounts));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides detailed information about the user.'),
    async execute(interaction) {
        const { user, member } = interaction;

        // Basic details
        const username = user.username;
        const accountCreationDate = format(user.createdAt, 'yyyy-MM-dd HH:mm:ss');
        const serverJoinDate = format(member.joinedAt, 'yyyy-MM-dd HH:mm:ss');

        // Construct the response
        const response = `
**User Details**:
- Username: ${username}
- Account Created: ${accountCreationDate}
- Joined Server: ${serverJoinDate}
`;

        // Send the response
        await interaction.reply(response);
    },
};