const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Load environment variables
const fs = require('node:fs');
const path = require('node:path');

const clientID = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_TOKEN;

// Read all commands from the commands folder
const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Prepare REST module with token
const rest = new REST().setToken(token);

// Deploy commands globally or to a specific guild
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // If you want to register globally, remove `guildID` and use `Routes.applicationCommands(clientID)`
        if (process.env.GUILD_ID) {
            const guildID = process.env.GUILD_ID;
            const data = await rest.put(
                Routes.applicationGuildCommands(clientID, guildID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} guild-specific application (/) commands.`);
        } else {
            const data = await rest.put(
                Routes.applicationCommands(clientID),
                { body: commands },
            );
            console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
        }
    } catch (error) {
        console.error(error);
    }
})();
