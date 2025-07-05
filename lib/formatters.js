/**
 * Data Formatting Utilities for Discord N8N Bot
 * Provides consistent formatting functions for Discord objects
 */

/**
 * Format Discord user object into standardized structure
 * @param {Object} user - Discord user object
 * @returns {Object} Formatted user data
 */
const formatUser = (user) => ({
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    tag: user.tag
});

/**
 * Format Discord channel object into standardized structure
 * @param {Object} channel - Discord channel object
 * @returns {Object} Formatted channel data
 */
const formatChannel = (channel) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type
});

/**
 * Format Discord guild object into standardized structure
 * @param {Object} guild - Discord guild object
 * @returns {Object|null} Formatted guild data or null if no guild
 */
const formatGuild = (guild) => guild ? {
    id: guild.id,
    name: guild.name
} : null;

/**
 * Format Discord message object into standardized structure
 * @param {Object} message - Discord message object
 * @returns {Object} Formatted message data
 */
const formatMessage = (message) => ({
    id: message.id,
    content: message.content,
    author: formatUser(message.author),
    channel: formatChannel(message.channel),
    guild: formatGuild(message.guild),
    timestamp: message.createdTimestamp
});

/**
 * Format Discord reaction object into standardized structure
 * @param {Object} reaction - Discord reaction object
 * @returns {Object} Formatted reaction data
 */
const formatReaction = (reaction) => ({
    emoji: reaction.emoji.toString(),
    emoji_id: reaction.emoji.id,
    emoji_name: reaction.emoji.name,
    animated: reaction.emoji.animated
});

/**
 * Determine the content type of a Discord message
 * @param {Object} message - Discord message object
 * @returns {string} Content type identifier
 */
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
    // Note: bot_mention detection requires client reference - will be handled at call site
    if (message.content.includes('@')) return 'mention';
    if (message.content.match(/https?:\/\/\S+/)) return 'link';
    if (message.content.trim() === '') return 'empty';
    return 'text';
};

module.exports = {
    formatUser,
    formatChannel,
    formatGuild,
    formatMessage,
    formatReaction,
    getContentType
};
