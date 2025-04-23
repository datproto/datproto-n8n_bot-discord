require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

// Utility functions for data formatting
const formatUser = (user) => ({
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    tag: user.tag
});

const formatChannel = (channel) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type
});

const formatGuild = (guild) => guild ? {
    id: guild.id,
    name: guild.name
} : null;

const formatMessage = (message) => ({
    id: message.id,
    content: message.content,
    author: formatUser(message.author),
    channel: formatChannel(message.channel),
    guild: formatGuild(message.guild),
    timestamp: message.createdTimestamp
});

const formatReaction = (reaction) => ({
    emoji: reaction.emoji.toString(),
    emoji_id: reaction.emoji.id,
    emoji_name: reaction.emoji.name,
    animated: reaction.emoji.animated
});

// Function to determine message content type
const getContentType = (message) => {
    if (message.stickers.size > 0) return 'sticker';
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        if (attachment.contentType?.startsWith('image/')) return 'image';
        if (attachment.contentType?.startsWith('video/')) return 'video';
        if (attachment.contentType?.startsWith('audio/')) return 'audio';
        return 'file';
    }
    if (message.embeds.length > 0) return 'embed';
    if (message.poll) return 'poll';
    if (message.reference) return 'reply';
    if (message.mentions.has(client.user)) return 'bot_mention';
    if (message.content.match(/https?:\/\/\S+/)) return 'link';
    if (message.content.trim() === '') return 'empty';
    return 'text';
};

// Function to send data to n8n
const sendToN8n = async (data, eventType) => {
    try {
        const payload = {
            event_type: eventType,
            timestamp: Date.now(),
            ...data
        };

        // Log the payload in a readable format
        console.log('\nSending to n8n:');
        console.log('Event Type:', eventType);
        console.log('Timestamp:', new Date(payload.timestamp).toISOString());
        console.log('Payload:', JSON.stringify(payload, null, 2));
        console.log('----------------------------------------');

        await axios.post(process.env.N8N_WEBHOOK_URL, payload);
        console.log(`Successfully forwarded ${eventType} to n8n`);
    } catch (error) {
        console.error(`Error forwarding ${eventType} to n8n:`, error);
    }
};

// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen for messages
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    console.log('Received Discord message:', message);
    console.log('----------------------------------------');

    try {
        const messageData = {
            content: {
                text: message.content,
                type: getContentType(message)
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

        await sendToN8n(messageData, 'message_create');
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Helper function to handle reaction events
const handleReaction = async (reaction, user, eventType) => {
    if (user.bot) return;

    // Fetch partial data if needed
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Error fetching reaction:', error);
            return;
        }
    }

    if (reaction.message.partial) {
        try {
            await reaction.message.fetch();
        } catch (error) {
            console.error('Error fetching message:', error);
            return;
        }
    }

    console.log(`${eventType === 'reaction_add' ? 'Received' : 'Removed'} reaction:`, {
        emoji: reaction.emoji.toString(),
        user: user.tag,
        messageId: reaction.message.id
    });

    try {
        const reactionData = {
            content: {
                text: reaction.emoji.toString(),
                type: 'reaction'
            },
            author: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator
            },
            channel: {
                id: reaction.message.channel.id,
                name: reaction.message.channel.name,
                type: reaction.message.channel.type
            },
            guild: reaction.message.guild ? {
                id: reaction.message.guild.id,
                name: reaction.message.guild.name
            } : null,
            message_id: reaction.message.id,
            original_message: reaction.message,
            timestamp: Date.now(),
            reaction: {
                emoji: reaction.emoji.toString(),
                emoji_id: reaction.emoji.id,
                emoji_name: reaction.emoji.name,
                animated: reaction.emoji.animated
            }
        };

        await sendToN8n(reactionData, eventType);
    } catch (error) {
        console.error(`Error processing ${eventType}:`, error);
    }
};

// Listen for reactions
client.on('messageReactionAdd', (reaction, user) => handleReaction(reaction, user, 'reaction_add'));
client.on('messageReactionRemove', (reaction, user) => handleReaction(reaction, user, 'reaction_remove'));

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