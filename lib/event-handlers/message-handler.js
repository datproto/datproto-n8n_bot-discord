/**
 * Message Event Handler Module
 * Handles Discord message creation events
 */

const { createEventData } = require('../event-data');
const { sendToN8n } = require('../n8n-service');

/**
 * Handle Discord message creation events
 * @param {Object} message - Discord message object
 * @returns {Promise<void>} Promise that resolves when message is processed
 */
const handleMessageCreate = async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    try {
        const isThread = message.channel.isThread();
        const eventType = isThread ? 'thread_message' : 'message_create';
        const messageData = createEventData(message, eventType, { isThread });
        await sendToN8n(messageData, eventType);
    } catch (error) {
        console.error('Error processing message:', error);
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
