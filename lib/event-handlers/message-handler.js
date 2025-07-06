/**
 * Message Event Handler Module
 * Handles Discord message creation events
 */

const { createEventData } = require('../event-data');
const { sendToN8n } = require('../n8n-service');
const { logger, correlation } = require('../logging');

/**
 * Handle Discord message creation events
 * @param {Object} message - Discord message object
 * @returns {Promise<void>} Promise that resolves when message is processed
 */
const handleMessageCreate = async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    const correlationId = correlation.startCorrelation();

    try {
        const isThread = message.channel.isThread();
        const eventType = isThread ? 'thread_message' : 'message_create';
        
        logger.info('Processing message event', {
            correlationId,
            eventType,
            messageId: message.id,
            channelId: message.channel.id,
            guildId: message.guild?.id,
            isThread
        });

        const messageData = createEventData(message, eventType, { isThread });
        await sendToN8n(messageData, eventType);

        logger.debug('Message event processed successfully', { correlationId, eventType });
    } catch (error) {
        logger.error('Error processing message event', { correlationId, error });
    } finally {
        correlation.endCorrelation();
    }
};

/**
 * Register message event handlers with Discord client
 * @param {Object} client - Discord client instance
 */
const registerMessageHandlers = (client) => {
    client.on('messageCreate', handleMessageCreate);
};

module.exports = {
    handleMessageCreate,
    registerMessageHandlers
};
