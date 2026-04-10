// message-logger.js
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

const filePath = path.join(__dirname, 'message-stats.csv');

// Updated Header with guildId
const csvHeader = [
    { id: 'guildId', title: 'guildId' }, // New Column
    { id: 'userId', title: 'userId' },
    { id: 'username', title: 'username' },
    { id: 'messages', title: 'messages' },
    { id: 'words', title: 'words' },
    { id: 'messageRank', title: 'messageRank' },
    { id: 'wordRank', title: 'wordRank' }
];

if (!fs.existsSync(filePath)) {
    const writer = csvWriter({ path: filePath, header: csvHeader });
    writer.writeRecords([]); 
}

async function logMessage(message) {
    if (message.author.bot || !message.guild) return; // Ignore DMs

    const guildId = message.guild.id;
    const userId = message.author.id;
    const username = message.author.username;
    const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;

    const rows = [];
    let userFound = false;

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                // Check if BOTH userId and guildId match
                if (row.userId === userId && row.guildId === guildId) {
                    row.messages = parseInt(row.messages) + 1;
                    row.words = parseInt(row.words) + wordCount;
                    row.username = username;
                    userFound = true;
                }
                rows.push({
                    guildId: row.guildId,
                    userId: row.userId,
                    username: row.username,
                    messages: parseInt(row.messages),
                    words: parseInt(row.words),
                });
            })
            .on('end', () => {
                if (!userFound) {
                    rows.push({ guildId, userId, username, messages: 1, words: wordCount });
                }

                // Recalculate ranks ONLY for the current server
                const guildRows = rows.filter(r => r.guildId === guildId);
                const byMessages = [...guildRows].sort((a, b) => b.messages - a.messages);
                const byWords = [...guildRows].sort((a, b) => b.words - a.words);

                rows.forEach(user => {
                    if (user.guildId === guildId) {
                        user.messageRank = byMessages.findIndex(r => r.userId === user.userId) + 1;
                        user.wordRank = byWords.findIndex(r => r.userId === user.userId) + 1;
                    }
                });

                const writer = csvWriter({ path: filePath, header: csvHeader });
                writer.writeRecords(rows).then(resolve).catch(reject);
            })
            .on('error', reject);
    });
}

module.exports = { logMessage, filePath };