const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('infogithub')
		.setDescription('See source code for the bot.'),
	async execute(interaction) {
        await interaction.reply(`This is the GitHub link of the bot:\nhttps://github.com/MatthewGreen777/discord-bot`);
	},
};