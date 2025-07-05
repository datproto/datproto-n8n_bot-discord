/**
 * N8N Service Module
 * Handles communication with N8N webhook endpoints
 */

const axios = require('axios');

/**
 * Send data to N8N webhook endpoint
 * @param {Object} data - Data to send to N8N
 * @param {string} eventType - Type of event being sent
 * @returns {Promise<void>} Promise that resolves when data is sent
 */
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

module.exports = {
    sendToN8n
};
