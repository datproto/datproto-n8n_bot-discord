/**
 * Scrape Command Utilities
 * Helper functions for URL processing and data sanitization
 */

const { logger } = require('../../lib/logging');

/**
 * Clean and normalize URL for safe processing
 * @param {string} url - Raw URL input
 * @returns {string} Cleaned URL
 */
function cleanUrl(url) {
    try {
        const urlObj = new URL(url.trim());
        
        // Normalize the URL
        let cleanedUrl = urlObj.href;
        
        // Remove tracking parameters
        const trackingParams = [
            'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
            'fbclid', 'gclid', 'msclkid', '_ga', '_gl', 'ref', 'source'
        ];
        
        trackingParams.forEach(param => {
            urlObj.searchParams.delete(param);
        });
        
        cleanedUrl = urlObj.href;
        
        logger.debug('Cleaned URL', { original: url, cleaned: cleanedUrl });
        
        return cleanedUrl;
    } catch (error) {
        logger.warn('Failed to clean URL, returning original', { url, error });
        return url;
    }
}

/**
 * Sanitize extraction request text
 * @param {string} extractionRequest - Raw extraction request
 * @returns {string} Sanitized extraction request
 */
function sanitizeExtractionRequest(extractionRequest) {
    // Remove potential script tags and suspicious content
    let sanitized = extractionRequest
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');
    
    // Limit length (additional safety check)
    if (sanitized.length > 1000) {
        sanitized = sanitized.substring(0, 997) + '...';
        logger.warn('Extraction request truncated due to length', {
            originalLength: extractionRequest.length,
            truncatedLength: sanitized.length
        });
    }
    
    return sanitized;
}

/**
 * Generate a unique request ID for tracking
 * @param {Object} interaction - Discord interaction object
 * @returns {string} Unique request identifier
 */
function generateRequestId(interaction) {
    const timestamp = Date.now();
    const userId = interaction.user.id;
    const guildId = interaction.guildId || 'dm';
    const random = Math.random().toString(36).substring(2, 8);
    
    return `scrape_${guildId}_${userId}_${timestamp}_${random}`;
}

/**
 * Extract domain from URL for categorization
 * @param {string} url - URL to analyze
 * @returns {string} Domain name or 'unknown'
 */
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.toLowerCase();
    } catch (error) {
        logger.warn('Failed to extract domain from URL', { url, error });
        return 'unknown';
    }
}

module.exports = {
    cleanUrl,
    sanitizeExtractionRequest,
    generateRequestId,
    extractDomain
};
