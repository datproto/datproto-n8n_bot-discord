/**
 * Response Transformation Module
 * 
 * Handles response parsing, validation, and normalization for N8N endpoints
 * 
 * @module ResponseTransformer
 */

const ResponseNormalizers = require('./responseNormalizers');
const ResponseValidators = require('./responseValidators');
const ResponseUtils = require('./responseUtils');

/**
 * Response Transformer Class
 * Orchestrates response transformation using specialized modules
 */
class ResponseTransformer {
  constructor() {
    this.normalizers = new ResponseNormalizers();
    this.validators = new ResponseValidators();
    this.utils = new ResponseUtils();
  }

  /**
   * Transform response from N8N endpoint
   * @param {Object} response - The HTTP response
   * @param {string} commandType - The command type
   * @param {Object} options - Additional transformation options
   * @returns {Object} The transformed response
   */
  transformResponse(response, commandType, options = {}) {
    const startTime = options.startTime || Date.now();
    const responseTime = Date.now() - startTime;

    // Base response structure
    const baseResponse = {
      success: true,
      commandType,
      status: response.status,
      timestamp: new Date().toISOString(),
      responseTime,
      requestId: options.requestId
    };

    // Handle different response status codes
    if (response.status >= 400) {
      return this.transformErrorResponse(response, commandType, baseResponse);
    }

    // Transform successful response
    return this.transformSuccessResponse(response, commandType, baseResponse, options);
  }

  /**
   * Transform successful response with data validation and enrichment
   * @param {Object} response - The HTTP response
   * @param {string} commandType - The command type
   * @param {Object} baseResponse - Base response structure
   * @param {Object} options - Additional options
   * @returns {Object} The transformed successful response
   */
  transformSuccessResponse(response, commandType, baseResponse, options) {
    const transformedResponse = {
      ...baseResponse,
      data: this.normalizers.parseResponseData(response.data, commandType),
      metadata: {
        headers: this.utils.extractRelevantHeaders(response.headers),
        contentType: response.headers['content-type'] || 'unknown',
        size: this.utils.calculateResponseSize(response),
        encoding: response.headers['content-encoding'] || 'none'
      }
    };

    // Add routing information if provided
    if (options.routing) {
      transformedResponse.routing = {
        endpoint: options.routing.endpoint,
        priority: options.routing.priority,
        environment: options.routing.environment
      };
    }

    // Validate response data structure
    const validation = this.validators.validateResponseData(transformedResponse.data, commandType);
    if (!validation.valid) {
      transformedResponse.warnings = validation.warnings;
    }

    return transformedResponse;
  }

  /**
   * Transform error response with standardized error format
   * @param {Object} response - The HTTP response
   * @param {string} commandType - The command type  
   * @param {Object} baseResponse - Base response structure
   * @returns {Object} The transformed error response
   */
  transformErrorResponse(response, commandType, baseResponse) {
    return {
      ...baseResponse,
      success: false,
      error: {
        code: response.status,
        message: this.validators.extractErrorMessage(response),
        details: response.data || null,
        type: this.validators.categorizeError(response.status)
      },
      data: null
    };
  }
}

module.exports = ResponseTransformer;
