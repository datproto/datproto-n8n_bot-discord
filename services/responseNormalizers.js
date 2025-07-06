/**
 * Response Normalizers Module
 * 
 * Handles command-specific response data normalization
 * 
 * @module ResponseNormalizers
 */

/**
 * Response Normalizers Class
 * Contains command-specific normalization logic
 */
class ResponseNormalizers {
  /**
   * Normalize response object structure
   * @param {Object} data - Response data object
   * @param {string} commandType - The command type
   * @returns {Object} Normalized response object
   */
  normalizeResponseObject(data, commandType) {
    // Ensure consistent structure for common command types
    const normalized = { ...data };

    // Add standard fields if missing
    if (!normalized.id && data.id) normalized.id = data.id;
    if (!normalized.timestamp && !normalized.createdAt) {
      normalized.timestamp = new Date().toISOString();
    }

    // Command-specific normalization
    switch (commandType) {
      case 'scrape':
        return this.normalizeScrapeResponse(normalized);
      case 'process':
        return this.normalizeProcessResponse(normalized);
      default:
        return normalized;
    }
  }

  /**
   * Normalize scraping command responses
   * @param {Object} data - Raw scrape response data
   * @returns {Object} Normalized scrape response
   */
  normalizeScrapeResponse(data) {
    return {
      ...data,
      content: data.content || data.text || data.html || null,
      metadata: {
        url: data.url || data.source_url || null,
        title: data.title || null,
        description: data.description || data.summary || null,
        ...data.metadata
      },
      stats: {
        processingTime: data.processing_time || data.duration || null,
        size: data.content_size || data.size || null,
        ...data.stats
      }
    };
  }

  /**
   * Normalize processing command responses  
   * @param {Object} data - Raw process response data
   * @returns {Object} Normalized process response
   */
  normalizeProcessResponse(data) {
    return {
      ...data,
      result: data.result || data.output || data.response || null,
      status: data.status || 'completed',
      processingInfo: {
        steps: data.steps || data.stages || [],
        duration: data.duration || data.processing_time || null,
        ...data.processing_info
      }
    };
  }

  /**
   * Parse and normalize response data based on command type
   * @param {*} data - Raw response data
   * @param {string} commandType - The command type
   * @returns {Object} Parsed and normalized data
   */
  parseResponseData(data, commandType) {
    if (!data) return null;

    // If data is already an object, return as-is with normalization
    if (typeof data === 'object') {
      return this.normalizeResponseObject(data, commandType);
    }

    // Try to parse JSON if it's a string
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return this.normalizeResponseObject(parsed, commandType);
      } catch (error) {
        // Return string data as-is if JSON parsing fails
        return { content: data, type: 'text' };
      }
    }

    // Return primitive data wrapped in object
    return { content: data, type: typeof data };
  }
}

module.exports = ResponseNormalizers;
