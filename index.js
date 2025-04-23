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
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.AutoModerationConfiguration,
        GatewayIntentBits.AutoModerationExecution
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction, Partials.ThreadMember, Partials.User]
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

// Utility function to create thread data object
const createThreadData = (thread, eventType, author = null, changes = null) => {
    const threadOwner = author || thread.owner;
    return {
        content: {
            text: eventType === 'thread_member_join' ? `${author?.tag} joined the thread` :
                  eventType === 'thread_member_leave' ? `${author?.tag} left the thread` :
                  thread.name,
            type: eventType
        },
        author: {
            id: threadOwner?.id || thread.ownerId,
            username: threadOwner?.username || 'Unknown',
            discriminator: threadOwner?.discriminator || '0000'
        },
        channel: {
            id: thread.parentId,
            name: thread.parent?.name || 'Unknown',
            type: thread.parent?.type || 'text'
        },
        guild: thread.guild ? {
            id: thread.guild.id,
            name: thread.guild.name
        } : null,
        message_id: thread.id,
        original_message: thread,
        timestamp: Date.now(),
        thread: {
            id: thread.id,
            name: thread.name,
            type: thread.type,
            archived: thread.archived,
            auto_archive_duration: thread.autoArchiveDuration,
            locked: thread.locked,
            parent_id: thread.parentId,
            rate_limit_per_user: thread.rateLimitPerUser
        },
        ...(changes && { changes })
    };
};

// Thread Creation Handler
client.on('threadCreate', async (thread) => {
    console.log('Thread created:', thread.name);
    try {
        const threadData = createThreadData(thread, 'thread_create');
        await sendToN8n(threadData, 'thread_create');
    } catch (error) {
        console.error('Error processing thread creation:', error);
    }
});

// Thread Deletion Handler
client.on('threadDelete', async (thread) => {
    console.log('Thread deleted:', thread.name);
    try {
        const threadData = createThreadData(thread, 'thread_delete');
        await sendToN8n(threadData, 'thread_delete');
    } catch (error) {
        console.error('Error processing thread deletion:', error);
    }
});

// Thread Update Handler
client.on('threadUpdate', async (oldThread, newThread) => {
    console.log('Thread updated:', newThread.name);
    try {
        const changes = {
            name: oldThread.name !== newThread.name ? {
                old: oldThread.name,
                new: newThread.name
            } : null,
            archived: oldThread.archived !== newThread.archived ? {
                old: oldThread.archived,
                new: newThread.archived
            } : null,
            locked: oldThread.locked !== newThread.locked ? {
                old: oldThread.locked,
                new: newThread.locked
            } : null,
            auto_archive_duration: oldThread.autoArchiveDuration !== newThread.autoArchiveDuration ? {
                old: oldThread.autoArchiveDuration,
                new: newThread.autoArchiveDuration
            } : null,
            rate_limit_per_user: oldThread.rateLimitPerUser !== newThread.rateLimitPerUser ? {
                old: oldThread.rateLimitPerUser,
                new: newThread.rateLimitPerUser
            } : null
        };

        const threadData = createThreadData(newThread, 'thread_update', null, changes);
        await sendToN8n(threadData, 'thread_update');
    } catch (error) {
        console.error('Error processing thread update:', error);
    }
});

// Thread Member Join Handler
client.on('threadMemberAdd', async (member) => {
    console.log('User joined thread:', member.thread.name);
    try {
        const threadData = createThreadData(member.thread, 'thread_member_join', member.user);
        await sendToN8n(threadData, 'thread_member_join');
    } catch (error) {
        console.error('Error processing thread member join:', error);
    }
});

// Thread Member Leave Handler
client.on('threadMemberRemove', async (member) => {
    console.log('User left thread:', member.thread.name);
    try {
        const threadData = createThreadData(member.thread, 'thread_member_leave', member.user);
        await sendToN8n(threadData, 'thread_member_leave');
    } catch (error) {
        console.error('Error processing thread member leave:', error);
    }
}); 