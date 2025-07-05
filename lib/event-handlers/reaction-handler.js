/**
 * Reaction Event Handler Module
 * Handles Discord message reaction events
 */

const { createEventData } = require('../event-data');
const { sendToN8n } = require('../n8n-service');

/**
 * Handle Discord reaction events (add/remove)
 * @param {Object} reaction - Discord reaction object
 * @param {Object} user - Discord user object
 * @param {string} eventType - Type of reaction event ('reaction_add' or 'reaction_remove')
 * @returns {Promise<void>} Promise that resolves when reaction is processed
 */
const handleReaction = async (reaction, user, eventType) => {
    // Ignore bot reactions
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

/**
 * Register reaction event handlers with Discord client
 * @param {Object} client - Discord client instance
 */
const registerReactionHandlers = (client) => {
    client.on('messageReactionAdd', (reaction, user) => 
        handleReaction(reaction, user, 'reaction_add'));
    client.on('messageReactionRemove', (reaction, user) => 
        handleReaction(reaction, user, 'reaction_remove'));
};

module.exports = {
    handleReaction,
    registerReactionHandlers
};
