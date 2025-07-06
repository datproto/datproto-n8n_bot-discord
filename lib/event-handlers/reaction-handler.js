/**
 * Reaction Event Handler Module
 * Handles Discord message reaction events
 */

const { createEventData } = require('../event-data');
const { sendToN8n } = require('../n8n-service');
const { logger, correlation } = require('../logging');

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

    const correlationId = correlation.startCorrelation();

    try {
        // Fetch partial data if needed
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                logger.error('Error fetching reaction', { correlationId, error });
                return;
            }
        }

        if (reaction.message.partial) {
            try {
                await reaction.message.fetch();
            } catch (error) {
                logger.error('Error fetching reaction message', { correlationId, error });
                return;
            }
        }

        const isThread = reaction.message.channel.isThread();
        
        logger.info('Processing reaction event', {
            correlationId,
            eventType,
            emoji: reaction.emoji.name,
            messageId: reaction.message.id,
            userId: user.id,
            isThread
        });

        const reactionData = createEventData(reaction.message, eventType, { 
            user, 
            emoji: reaction.emoji, 
            isThread 
        });
        
        await sendToN8n(reactionData, eventType);

        logger.debug('Reaction event processed successfully', { correlationId, eventType });
    } catch (error) {
        logger.error('Error processing reaction event', { correlationId, error });
    } finally {
        correlation.endCorrelation();
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
