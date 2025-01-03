const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { format } = require('date-fns');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Provides detailed information about a user in a graphic.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to get information about')
                .setRequired(true)
        ),
    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const targetMember = interaction.guild.members.cache.get(targetUser.id);

        if (!targetMember) {
            return interaction.reply('Sorry, I could not find that user in the server.');
        }

        // User and server-specific stats
        const username = targetUser.username;
        let nickname = targetMember.nickname || targetMember.displayName || 'No nickname';
        const accountCreationDate = format(targetUser.createdAt, 'yyyy-MM-dd');
        const serverJoinDate = format(targetMember.joinedAt, 'yyyy-MM-dd');
        const roles = targetMember.roles.cache
            .filter(role => role.name !== '@everyone')
            .map(role => role.name)
            .join(', ') || 'No roles';

        try {
            // Create canvas and set dimensions
            const canvas = createCanvas(700, 400);
            const ctx = canvas.getContext('2d');

            // Background color
            ctx.fillStyle = '#2C2F33';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Add username
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(`${username}`, 200, 60);

            // Add user details
            ctx.font = '20px Arial';
            ctx.fillText(`User Nickname: ${nickname}`, 200, 100);
            ctx.fillText(`Account Created: ${accountCreationDate}`, 200, 140);
            ctx.fillText(`Joined Server: ${serverJoinDate}`, 200, 180);
            ctx.fillText(`Roles: ${roles}`, 200, 220);

            // Create attachment
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'user-stats.png' });

            // Reply with the graphic
            await interaction.reply({ files: [attachment] });
        } catch (error) {
            console.error('An error occurred:', error.message);
            await interaction.reply('Sorry, there was an error generating the user graphic.');
        }
    },
};
