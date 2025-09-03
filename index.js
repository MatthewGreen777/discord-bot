const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageFlags } = require('discord.js');
const { scheduleSongOfTheDay } = require('./commands/utility/song-of-the-day');
const { logMessage } = require('./commands/other/message-logger'); // 👈 add message logger
require('dotenv').config(); // Load .env variables

const token = process.env.DISCORD_TOKEN;
const clientID = process.env.DISCORD_CLIENT_ID;

const client = new Client({ 
    intents: [ 
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,   // 👈 required for message events
        GatewayIntentBits.MessageContent   // 👈 required to read message text
    ] 
});

client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

// Load all commands dynamically
for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle when bot joins a new guild
client.on(Events.GuildCreate, guild => {
    const guildCreateHandler = require('./events/guildcreate');
    guildCreateHandler(guild);
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', flags: MessageFlags.Ephemeral });
        }
    }
});

// 👇 NEW: log all messages for stats
client.on('messageCreate', async (message) => {
    await logMessage(message).catch(console.error);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    scheduleSongOfTheDay(client); // Keep your song-of-the-day scheduler
});

client.login(token);
