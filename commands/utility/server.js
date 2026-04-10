const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
    async execute(interaction) {
        const { guild } = interaction;

        // Discord Timestamps: 
        // <t:SECONDS:F> shows a full date/time (e.g., April 10, 2026 5:00 PM)
        // <t:SECONDS:R> shows a relative time (e.g., 2 years ago)
        const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

        const serverEmbed = new EmbedBuilder()
            .setTitle(guild.name)
            .setThumbnail(guild.iconURL())
            .setColor(0x5865F2)
            .addFields(
                { name: 'Member Count', value: `${guild.memberCount}`, inline: true },
                { name: 'Created On', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true }
            );

        await interaction.reply({ embeds: [serverEmbed] });
    },
};