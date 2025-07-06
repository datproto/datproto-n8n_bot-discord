/**
 * Scrape Command Response Formatters
 * Formatting functions for user-facing messages
 */

const { logger } = require('../../lib/logging');
const { extractDomain } = require('./utils');

/**
 * Format success message for scrape command completion
 * @param {Object} params - Parameters for success message
 * @param {string} params.url - The scraped URL
 * @param {string} params.extractionRequest - What was extracted
 * @param {string} params.outputSchema - The output schema used
 * @returns {string} Formatted success message
 */
function formatSuccessMessage({ url, extractionRequest, outputSchema }) {
    const domain = extractDomain(url);
    const timestamp = new Date().toLocaleTimeString();
    
    // Truncate long extraction requests for display
    const truncatedRequest = extractionRequest.length > 100 
        ? extractionRequest.substring(0, 97) + '...'
        : extractionRequest;
    
    // Determine output format from schema
    let schemaDescription = 'structured data';
    try {
        const parsed = JSON.parse(outputSchema);
        const keys = Object.keys(parsed);
        if (keys.length > 0) {
            schemaDescription = keys.length === 1 ? `${keys[0]} data` : `${keys.length} data fields`;
        }
    } catch (error) {
        // Use default description
    }
    
    const message = `✅ **Scrape Request Submitted Successfully**\n\n` +
                   `🌐 **Website:** ${domain}\n` +
                   `📋 **Extraction:** ${truncatedRequest}\n` +
                   `📊 **Output Format:** ${schemaDescription}\n` +
                   `⏰ **Submitted:** ${timestamp}\n\n` +
                   `🔄 Your request has been sent to our processing system. ` +
                   `The extracted data will be delivered according to your N8N workflow configuration.`;
    
    logger.debug('Formatted success message', {
        domain,
        requestLength: extractionRequest.length,
        schemaKeys: schemaDescription
    });
    
    return message;
}

/**
 * Format error message for scrape command failures
 * @param {Object} params - Parameters for error message
 * @param {string} params.error - The error that occurred
 * @param {string} [params.url] - The URL that failed (optional)
 * @param {string} [params.suggestion] - Suggestion for fixing the error
 * @returns {string} Formatted error message
 */
function formatErrorMessage({ error, url, suggestion }) {
    let message = `❌ **Scrape Request Failed**\n\n`;
    
    if (url) {
        const domain = extractDomain(url);
        message += `🌐 **Website:** ${domain}\n`;
    }
    
    message += `⚠️ **Error:** ${error}\n`;
    
    if (suggestion) {
        message += `💡 **Suggestion:** ${suggestion}\n`;
    }
    
    message += `\n🔧 **Need Help?** Make sure your URL is accessible and your extraction request is clear.`;
    
    logger.debug('Formatted error message', {
        error,
        url: url ? extractDomain(url) : 'unknown',
        hasSuggestion: !!suggestion
    });
    
    return message;
}

/**
 * Format validation error message with helpful guidance
 * @param {string} validationError - The validation error message
 * @returns {string} User-friendly validation error message
 */
function formatValidationError(validationError) {
    const message = `🚫 **Input Validation Failed**\n\n` +
                   `📋 **Issue:** ${validationError}\n\n` +
                   `✅ **Requirements:**\n` +
                   `• URL must start with http:// or https://\n` +
                   `• Extraction request: 10-1000 characters\n` +
                   `• Output schema: Valid JSON format (5-2000 characters)\n` +
                   `• No local/private network URLs for security\n\n` +
                   `💡 **Example:**\n` +
                   `URL: \`https://example.com\`\n` +
                   `Extraction: \`Extract all article titles and dates\`\n` +
                   `Schema: \`{"title": "string", "date": "string"}\``;
    
    return message;
}

/**
 * Format processing status message for long-running requests
 * @param {Object} params - Status parameters
 * @param {string} params.status - Current processing status
 * @param {string} params.url - The URL being processed
 * @param {number} [params.progress] - Progress percentage (0-100)
 * @returns {string} Formatted status message
 */
function formatStatusMessage({ status, url, progress }) {
    const domain = extractDomain(url);
    const timestamp = new Date().toLocaleTimeString();
    
    let statusEmoji = '🔄';
    let statusText = status;
    
    switch (status.toLowerCase()) {
        case 'queued':
            statusEmoji = '⏳';
            statusText = 'Queued for processing';
            break;
        case 'processing':
            statusEmoji = '🔄';
            statusText = 'Currently processing';
            break;
        case 'extracting':
            statusEmoji = '🔍';
            statusText = 'Extracting data';
            break;
        case 'completing':
            statusEmoji = '🔧';
            statusText = 'Finalizing results';
            break;
    }
    
    let message = `${statusEmoji} **${statusText}**\n\n` +
                  `🌐 **Website:** ${domain}\n` +
                  `⏰ **Last Update:** ${timestamp}`;
    
    if (progress !== undefined && progress >= 0 && progress <= 100) {
        const progressBar = generateProgressBar(progress);
        message += `\n📊 **Progress:** ${progress}%\n${progressBar}`;
    }
    
    return message;
}

/**
 * Generate a simple text progress bar
 * @param {number} progress - Progress percentage (0-100)
 * @returns {string} Text progress bar
 */
function generateProgressBar(progress) {
    const totalBars = 20;
    const filledBars = Math.round((progress / 100) * totalBars);
    const emptyBars = totalBars - filledBars;
    
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

/**
 * Format help message for scrape command usage
 * @returns {string} Formatted help message
 */
function formatHelpMessage() {
    return `🤖 **Scrape Command Help**\n\n` +
           `**Usage:** \`/scrape url:<website> extraction_request:<what_to_extract> output_schema:<json_format>\`\n\n` +
           `**Parameters:**\n` +
           `• **url:** The website URL to scrape (must be public)\n` +
           `• **extraction_request:** Describe what data you want (10-1000 chars)\n` +
           `• **output_schema:** JSON structure for the results (5-2000 chars)\n\n` +
           `**Examples:**\n` +
           `\`\`\`\n` +
           `URL: https://news.ycombinator.com\n` +
           `Request: Extract top 5 story titles and their points\n` +
           `Schema: {"stories": [{"title": "string", "points": "number"}]}\n` +
           `\`\`\`\n\n` +
           `**Tips:**\n` +
           `• Be specific about what data you want\n` +
           `• Use clear, simple JSON schemas\n` +
           `• Avoid complex nested structures\n` +
           `• Test with simple requests first`;
}

/**
 * Format rate limit message when user hits limits
 * @param {Object} params - Rate limit parameters
 * @param {number} params.remainingRequests - Requests remaining
 * @param {number} params.resetTime - When limit resets (timestamp)
 * @returns {string} Formatted rate limit message
 */
function formatRateLimitMessage({ remainingRequests, resetTime }) {
    const resetDate = new Date(resetTime);
    const resetTimeString = resetDate.toLocaleTimeString();
    
    if (remainingRequests > 0) {
        return `⚠️ **Rate Limit Warning**\n\n` +
               `📊 **Remaining Requests:** ${remainingRequests}\n` +
               `🔄 **Limit Resets:** ${resetTimeString}\n\n` +
               `💡 Consider spacing out your requests to avoid hitting the limit.`;
    } else {
        return `🚫 **Rate Limit Exceeded**\n\n` +
               `⏰ **Limit Resets:** ${resetTimeString}\n\n` +
               `Please wait before submitting another scrape request.`;
    }
}

module.exports = {
    formatSuccessMessage,
    formatErrorMessage,
    formatValidationError,
    formatStatusMessage,
    formatHelpMessage,
    formatRateLimitMessage,
    generateProgressBar
};
