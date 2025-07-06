/**
 * Response Utils Module
 * 
 * Utility functions for response processing
 * 
 * @module ResponseUtils
 */

/**
 * Response Utils Class
 * Contains utility functions for response processing
 */
class ResponseUtils {
  /**
   * Extract relevant headers from response
   * @param {Object} headers - Response headers
   * @returns {Object} Filtered relevant headers
   */
  extractRelevantHeaders(headers) {
    const relevantHeaders = {};
    const importantHeaders = [
      'content-type', 'content-length', 'x-response-time',
      'x-request-id', 'cache-control', 'etag'
    ];

    importantHeaders.forEach(header => {
      if (headers[header]) {
        relevantHeaders[header] = headers[header];
      }
    });

    return relevantHeaders;
  }

  /**
   * Calculate response size in bytes
   * @param {Object} response - HTTP response
   * @returns {number} Response size in bytes
   */
  calculateResponseSize(response) {
    if (response.headers['content-length']) {
      return parseInt(response.headers['content-length'], 10);
    }

    if (response.data) {
      if (typeof response.data === 'string') {
        return Buffer.byteLength(response.data, 'utf8');
      }
      if (typeof response.data === 'object') {
        return Buffer.byteLength(JSON.stringify(response.data), 'utf8');
      }
    }

    return 0;
  }
}

module.exports = ResponseUtils;
