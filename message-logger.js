// message-logger.js
const fs = require('fs');
const path = require('path');
const csvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parser');

const filePath = path.join(__dirname, 'message-stats.csv');

if (!fs.existsSync(filePath)) {
    const writer = csvWriter({
        path: filePath,
        header: [
            { id: 'userId', title: 'userId' },
            { id: 'username', title: 'username' },
            { id: 'messages', title: 'messages' },
            { id: 'words', title: 'words' },
            { id: 'messageRank', title: 'messageRank' },
            { id: 'wordRank', title: 'wordRank' }
        ]
    });
    writer.writeRecords([]); // Initialize empty file
}

async function logMessage(message) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const username = message.author.username;
    const wordCount = message.content.trim().split(/\s+/).filter(Boolean).length;

    const rows = [];
    let userFound = false;

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                if (row.userId === userId) {
                    row.messages = parseInt(row.messages) + 1;
                    row.words = parseInt(row.words) + wordCount;
                    row.username = username; // update username
                    userFound = true;
                }
                rows.push({
                    userId: row.userId,
                    username: row.username,
                    messages: parseInt(row.messages),
                    words: parseInt(row.words),
                });
            })
            .on('end', () => {
                if (!userFound) {
                    rows.push({
                        userId,
                        username,
                        messages: 1,
                        words: wordCount,
                    });
                }

                // 🔹 Recalculate ranks
                const byMessages = [...rows].sort((a, b) => b.messages - a.messages);
                const byWords = [...rows].sort((a, b) => b.words - a.words);

                rows.forEach(user => {
                    user.messageRank = byMessages.findIndex(r => r.userId === user.userId) + 1;
                    user.wordRank = byWords.findIndex(r => r.userId === user.userId) + 1;
                });

                const writer = csvWriter({
                    path: filePath,
                    header: [
                        { id: 'userId', title: 'userId' },
                        { id: 'username', title: 'username' },
                        { id: 'messages', title: 'messages' },
                        { id: 'words', title: 'words' },
                        { id: 'messageRank', title: 'messageRank' },
                        { id: 'wordRank', title: 'wordRank' }
                    ]
                });

                writer.writeRecords(rows).then(resolve).catch(reject);
            })
            .on('error', reject);
    });
}

module.exports = { logMessage, filePath };
