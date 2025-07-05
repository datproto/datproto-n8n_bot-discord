/**
 * Event Data Creation Module
 * Creates unified data structures for Discord events
 */

const { formatUser, formatChannel, formatGuild } = require('./formatters');

/**
 * Create unified event data structure for Discord events
 * @param {Object} event - Discord event object
 * @param {string} eventType - Type of event
 * @param {Object} options - Additional options for event creation
 * @returns {Object} Unified event data structure
 */
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

module.exports = {
    createEventData
};
