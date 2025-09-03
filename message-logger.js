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
            { id: 'words', title: 'words' }
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
                    row.username = username; // Update username if changed
                    userFound = true;
                }
                rows.push(row);
            })
            .on('end', () => {
                if (!userFound) {
                    rows.push({
                        userId,
                        username,
                        messages: 1,
                        words: wordCount
                    });
                }

                const writer = csvWriter({
                    path: filePath,
                    header: [
                        { id: 'userId', title: 'userId' },
                        { id: 'username', title: 'username' },
                        { id: 'messages', title: 'messages' },
                        { id: 'words', title: 'words' }
                    ]
                });

                writer.writeRecords(rows).then(resolve).catch(reject);
            })
            .on('error', reject);
    });
}

module.exports = { logMessage, filePath };
