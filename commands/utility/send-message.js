const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-message')
        .setDescription('Send a message to a specific channel')
        // Secondary security: Hides the command from users who can't manage messages
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('The channel to send the message to')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('message')
                .setDescription('The message to send')
                .setRequired(true)
        ),
    async execute(interaction) {
        // 1. Role Check: Primary security for "Club Officer"
        // .some() checks if any of the user's roles match the name
        const hasRole = interaction.member.roles.cache.some(role => role.name === 'Club Officer');
        const isDev = interaction.member.roles.cache.some(role => role.name === 'Developer');

        if (!hasRole && !isDev) {
            return interaction.reply({ 
                content: 'You do not have the **Club Officer** role required to use this command.', 
                ephemeral: true 
            });
        }

        const channel = interaction.options.getChannel('channel');
        const message = interaction.options.getString('message');

        // Ensure the selected channel is actually a text channel
        if (!channel.isTextBased()) {
            return interaction.reply({ 
                content: 'Please select a valid text channel.', 
                ephemeral: true 
            });
        }

        try {
            await channel.send(message);
            await interaction.reply({ content: `Message sent to ${channel}`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'Failed to send message. Make sure I have permission to speak in that channel!', ephemeral: true });
        }
    },
};