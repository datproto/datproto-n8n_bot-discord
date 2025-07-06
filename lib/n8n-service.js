/**
 * N8N Service Module
 * Handles communication with N8N webhook endpoints
 */

const axios = require('axios');
const { logger, correlation } = require('./logging');

/**
 * Send data to N8N webhook endpoint
 * @param {Object} data - Data to send to N8N
 * @param {string} eventType - Type of event being sent
 * @returns {Promise<void>} Promise that resolves when data is sent
 */
const sendToN8n = async (data, eventType) => {
    const correlationId = correlation.getCorrelationId() || correlation.startCorrelation();

    try {
        const payload = {
            event_type: eventType,
            timestamp: Date.now(),
            correlation_id: correlationId,
            ...data
        };

        logger.info('Sending data to N8N', {
            correlationId,
            eventType,
            timestamp: new Date(payload.timestamp).toISOString(),
            payloadSize: JSON.stringify(payload).length
        });

        logger.debug('N8N payload details', {
            correlationId,
            eventType,
            payload: JSON.stringify(payload, null, 2)
        });

        await axios.post(process.env.N8N_WEBHOOK_URL, payload);
        
        logger.info('Successfully forwarded event to N8N', {
            correlationId,
            eventType
        });
    } catch (error) {
        logger.error('Error forwarding event to N8N', {
            correlationId,
            eventType,
            error
        });
        throw error;
    }
};

module.exports = {
    sendToN8n
};
