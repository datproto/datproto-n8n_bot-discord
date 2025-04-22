require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel]
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Determine content type
    let contentType = 'text';
    if (message.stickers.size > 0) {
        contentType = 'sticker';
    } else if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType?.startsWith('image/')) {
            contentType = 'image';
        } else if (attachment.contentType?.startsWith('video/')) {
            contentType = 'video';
        } else if (attachment.contentType?.startsWith('audio/')) {
            contentType = 'audio';
        } else {
            contentType = 'file';
        }
    } else if (message.embeds.length > 0) {
        contentType = 'embed';
    } else if (message.poll) {
        contentType = 'poll';
    } else if (message.reference) {
        contentType = 'reply';
    } else if (message.mentions.has(client.user)) {
        contentType = 'bot_mention';
    } else if (message.content.match(/https?:\/\/\S+/)) {
        contentType = 'link';
    } else if (message.content.trim() === '') {
        contentType = 'empty';
    }

    // Log the received message
    console.log('Received Discord message:',message);
    console.log('----------------------------------------');

    try {
        // Prepare the message data to send to n8n
        const messageData = {
            content: {
                text: message.content,
                type: contentType
            },
            author: {
                id: message.author.id,
                username: message.author.username,
                discriminator: message.author.discriminator
            },
            channel: {
                id: message.channel.id,
                name: message.channel.name,
                type: message.channel.type
            },
            guild: message.guild ? {
                id: message.guild.id,
                name: message.guild.name
            } : null,
            message_id: message.id,
            original_message: message,
            timestamp: message.createdTimestamp
        };

        // Send the message to n8n webhook
        await axios.post(process.env.N8N_WEBHOOK_URL, messageData);
        
        console.log(`Forwarded message from ${message.author.tag} to n8n`);
    } catch (error) {
        console.error('Error forwarding message to n8n:', error);
    }
});

// Handle errors
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down...');
    client.destroy();
    process.exit(0);
});

// Login to Discord with your app's token
client.login(process.env.DISCORD_TOKEN); 