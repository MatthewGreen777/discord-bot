// message-logger.js
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

// Create a directory for stats if it doesn't exist
const statsDir = path.join(__dirname, 'stats');
if (!fs.existsSync(statsDir)) {
    fs.mkdirSync(statsDir);
}

const csvHeader = [
    { id: 'userId', title: 'userId' },
    { id: 'username', title: 'username' },
    { id: 'messages', title: 'messages' },
    { id: 'words', title: 'words' },
    { id: 'messageRank', title: 'messageRank' },
    { id: 'wordRank', title: 'wordRank' }
];

// Helper to get the specific file for a server
const getGuildFilePath = (guildId) => path.join(statsDir, `${guildId}.csv`);

async function logMessage(message) {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const filePath = getGuildFilePath(guildId);
    const userId = message.author.id;
    const username = message.author.username;
    const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;

    // Initialize file if this is the first message in this server
    if (!fs.existsSync(filePath)) {
        const writer = csvWriter({ path: filePath, header: csvHeader });
        await writer.writeRecords([]);
    }

    const rows = [];
    let userFound = false;

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                let messages = parseInt(row.messages) || 0;
                let words = parseInt(row.words) || 0;

                if (row.userId === userId) {
                    messages += 1;
                    words += wordCount;
                    userFound = true;
                }

                rows.push({
                    userId: row.userId,
                    username: row.userId === userId ? username : row.username,
                    messages: messages,
                    words: words
                });
            })
            .on('end', () => {
                if (!userFound) {
                    rows.push({ userId, username, messages: 1, words: wordCount });
                }

                // Rank the users (Local to this file/server only)
                const byMessages = [...rows].sort((a, b) => b.messages - a.messages);
                const byWords = [...rows].sort((a, b) => b.words - a.words);

                rows.forEach(user => {
                    user.messageRank = byMessages.findIndex(r => r.userId === user.userId) + 1;
                    user.wordRank = byWords.findIndex(r => r.userId === user.userId) + 1;
                });

                const writer = csvWriter({ path: filePath, header: csvHeader });
                writer.writeRecords(rows).then(resolve).catch(reject);
            })
            .on('error', reject);
    });
}

// We export the function instead of a static path now
module.exports = { logMessage, getGuildFilePath };