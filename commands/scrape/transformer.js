/**
 * Scrape Command Data Transformer - Core Functions
 * Main transformation logic for N8N processing
 */

const { logger } = require('../../lib/logging');
const { cleanUrl, sanitizeExtractionRequest, generateRequestId } = require('./utils');
const { determinePriority, estimateComplexity, suggestTimeout, determineRetryStrategy } = require('./processing');
const { formatSuccessMessage, formatErrorMessage } = require('./formatters');

/**
 * Transform scrape input data into N8N-compatible format
 * @param {Object} params - Input parameters
 * @param {string} params.url - Target URL to scrape
 * @param {string} params.extractionRequest - What data to extract
 * @param {string} params.outputSchema - Desired output structure
 * @param {Object} params.interaction - Discord interaction object
 * @returns {Object} Transformed data for N8N processing
 */
function transformScrapeData({ url, extractionRequest, outputSchema, interaction }) {
    const timestamp = Date.now();
    
    // Parse output schema for validation (we know it's valid from validator)
    let parsedSchema;
    try {
        parsedSchema = JSON.parse(outputSchema);
    } catch (error) {
        // This shouldn't happen as validator already checked it
        logger.warn('Failed to parse output schema in transformer', { error });
        parsedSchema = {};
    }

    // Build comprehensive data payload
    const transformedData = {
        // Core scraping parameters
        url: cleanUrl(url),
        extraction_request: sanitizeExtractionRequest(extractionRequest),
        output_schema: parsedSchema,
        
        // Metadata
        timestamp,
        request_id: generateRequestId(interaction),
        
        // Discord context
        user_context: {
            user_id: interaction.user.id,
            username: interaction.user.username,
            guild_id: interaction.guildId,
            channel_id: interaction.channelId,
            channel_name: interaction.channel?.name
        },
        
        // Processing hints for N8N
        processing_hints: {
            priority: determinePriority(extractionRequest),
            estimated_complexity: estimateComplexity(url, extractionRequest),
            timeout_suggestion: suggestTimeout(url, extractionRequest),
            retry_strategy: determineRetryStrategy(url)
        },
        
        // Response preferences
        response_preferences: {
            format: 'json',
            include_metadata: true,
            max_response_size: 50000, // 50KB limit
            truncate_on_overflow: true
        }
    };

    logger.debug('Transformed scrape data for N8N', {
        url: transformedData.url,
        requestId: transformedData.request_id,
        complexity: transformedData.processing_hints.estimated_complexity,
        userId: interaction.user.id
    });

    return transformedData;
}

module.exports = {
    transformScrapeData,
    formatSuccessMessage,
    formatErrorMessage
};
