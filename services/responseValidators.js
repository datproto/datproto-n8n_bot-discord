/**
 * Response Validators Module
 * 
 * Handles validation of response data structures
 * 
 * @module ResponseValidators
 */

/**
 * Response Validators Class
 * Contains validation logic for different response types
 */
class ResponseValidators {
  /**
   * Validate response data structure
   * @param {*} data - Response data
   * @param {string} commandType - Command type
   * @returns {Object} Validation result
   */
  validateResponseData(data, commandType) {
    const warnings = [];

    if (!data) {
      warnings.push('Response data is null or undefined');
      return { valid: false, warnings };
    }

    // Command-specific validation
    switch (commandType) {
      case 'scrape':
        if (!data.content && !data.text && !data.html) {
          warnings.push('Scrape response missing content data');
        }
        break;
      case 'process':
        if (!data.result && !data.output) {
          warnings.push('Process response missing result data');
        }
        break;
    }

    return { valid: warnings.length === 0, warnings };
  }

  /**
   * Extract error message from response
   * @param {Object} response - HTTP response
   * @returns {string} Error message
   */
  extractErrorMessage(response) {
    if (response.data) {
      if (typeof response.data === 'string') {
        return response.data;
      }
      if (response.data.message) {
        return response.data.message;
      }
      if (response.data.error) {
        return response.data.error;
      }
    }

    return response.statusText || `HTTP ${response.status} Error`;
  }

  /**
   * Categorize error type based on status code
   * @param {number} status - HTTP status code
   * @returns {string} Error category
   */
  categorizeError(status) {
    if (status >= 400 && status < 500) {
      return 'client_error';
    }
    if (status >= 500) {
      return 'server_error';
    }
    return 'unknown_error';
  }
}

module.exports = ResponseValidators;
