const fs = require('node:fs');
const path = require('node:path');
const defaultConfig = require('../config.json');

module.exports = guild => {
    const configDirectory = path.join(__dirname, '../configs');

    // Ensure the `configs` directory exists
    if (!fs.existsSync(configDirectory)) {
        fs.mkdirSync(configDirectory);
    }

    const guildConfigPath = path.join(configDirectory, `${guild.id}.json`);

    // Check if the config already exists for this guild
    if (!fs.existsSync(guildConfigPath)) {
        const guildConfig = {
            ...defaultConfig,
            guildID: guild.id,
        };

        // Write the guild-specific configuration to a file
        fs.writeFileSync(guildConfigPath, JSON.stringify(guildConfig, null, 2));
        console.log(`Created config for guild: ${guild.name} (${guild.id})`);
    } else {
        console.log(`Config already exists for guild: ${guild.name} (${guild.id})`);
    }
};
