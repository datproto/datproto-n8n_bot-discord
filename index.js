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

// Unified data structure creator
const createEventData = (event, eventType, options = {}) => {
    const {
        isThread = false,
        isReaction = false,
        isThreadEvent = false,
        changes = null,
        author = null
    } = options;

    // Get the appropriate channel and thread objects
    let channel, thread;
    if (isReaction) {
        // For reactions, we need to handle both thread and non-thread cases
        const messageChannel = event.message.channel;
        if (messageChannel.isThread()) {
            channel = messageChannel.parent;
            thread = messageChannel;
        } else {
            channel = messageChannel;
            thread = null;
        }
    } else {
        // For other events
        channel = isThread ? event.channel.parent : event.channel;
        thread = isThread ? event.channel : null;
    }

    const message = isReaction ? event.message : event;
    const eventAuthor = author || event.author || event.user;

    // Base data structure
    const data = {
        content: {
            text: isReaction ? event.emoji.toString() : 
                  isThreadEvent ? (eventType.includes('member') ? 
                    `${eventAuthor.tag} ${eventType.includes('join') ? 'joined' : 'left'} the thread` : 
                    event.name) : 
                  message.content,
            type: eventType
        },
        author: {
            id: eventAuthor.id,
            username: eventAuthor.username || 'Unknown',
            discriminator: eventAuthor.discriminator || '0000'
        },
        channel: {
            id: channel?.id || 'unknown',
            name: channel?.name || 'Unknown',
            type: channel?.type || 'text'
        },
        guild: message.guild ? {
            id: message.guild.id,
            name: message.guild.name
        } : null,
        message_id: message.id,
        original_message: message,
        timestamp: Date.now()
    };

    // Add thread data if it's a thread event or message in thread
    if (thread) {
        data.thread = {
            id: thread.id,
            name: thread.name,
            type: thread.type,
            archived: thread.archived,
            auto_archive_duration: thread.autoArchiveDuration,
            locked: thread.locked,
            parent_id: thread.parentId,
            rate_limit_per_user: thread.rateLimitPerUser
        };
    }

    // Add reaction data if it's a reaction event
    if (isReaction) {
        data.reaction = {
            emoji: event.emoji.toString(),
            emoji_id: event.emoji.id,
            emoji_name: event.emoji.name,
            animated: event.emoji.animated
        };
    }

    // Add changes if it's a thread update event
    if (changes) {
        data.changes = changes;
    }

    return data;
};

// Message handler
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    try {
        const isThread = message.channel.isThread();
        const eventType = isThread ? 'thread_message' : 'message_create';
        const messageData = createEventData(message, eventType, { isThread });
        await sendToN8n(messageData, eventType);
    } catch (error) {
        console.error('Error processing message:', error);
    }
});

// Reaction handler
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

    try {
        const isThread = reaction.message.channel.isThread();
        const fullEventType = isThread ? `thread_${eventType}` : eventType;
        const reactionData = createEventData(reaction, fullEventType, { 
            isThread, 
            isReaction: true,
            author: user 
        });
        await sendToN8n(reactionData, fullEventType);
    } catch (error) {
        console.error(`Error processing ${eventType}:`, error);
    }
};

// Thread event handlers
client.on('threadCreate', async (thread) => {
    try {
        const threadData = createEventData(thread, 'thread_create', { isThreadEvent: true });
        await sendToN8n(threadData, 'thread_create');
    } catch (error) {
        console.error('Error processing thread creation:', error);
    }
});

client.on('threadDelete', async (thread) => {
    try {
        const threadData = createEventData(thread, 'thread_delete', { isThreadEvent: true });
        await sendToN8n(threadData, 'thread_delete');
    } catch (error) {
        console.error('Error processing thread deletion:', error);
    }
});

client.on('threadUpdate', async (oldThread, newThread) => {
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

        const threadData = createEventData(newThread, 'thread_update', { 
            isThreadEvent: true,
            changes 
        });
        await sendToN8n(threadData, 'thread_update');
    } catch (error) {
        console.error('Error processing thread update:', error);
    }
});

client.on('threadMemberAdd', async (member) => {
    try {
        const threadData = createEventData(member.thread, 'thread_member_join', { 
            isThreadEvent: true,
            author: member.user 
        });
        await sendToN8n(threadData, 'thread_member_join');
    } catch (error) {
        console.error('Error processing thread member join:', error);
    }
});

client.on('threadMemberRemove', async (member) => {
    try {
        const threadData = createEventData(member.thread, 'thread_member_leave', { 
            isThreadEvent: true,
            author: member.user 
        });
        await sendToN8n(threadData, 'thread_member_leave');
    } catch (error) {
        console.error('Error processing thread member leave:', error);
    }
});

// Reaction event listeners
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