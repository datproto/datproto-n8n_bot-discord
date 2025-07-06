/**
 * Fallback Response Manager Module
 * 
 * Handles creation of fallback responses for various failure scenarios
 * 
 * @module FallbackResponseManager
 */

/**
 * Fallback Response Manager Class
 * Creates standardized fallback responses for different error conditions
 */
class FallbackResponseManager {
  constructor(config = {}) {
    this.config = {
      defaultRetryAfter: config.defaultRetryAfter || '60s',
      includeDebugInfo: config.includeDebugInfo || false,
      ...config
    };
  }

  /**
   * Create fallback response when circuit breaker is open
   * @param {string} commandType - The command type
   * @param {string} requestId - The request identifier
   * @param {number} startTime - The request start time
   * @param {Object} options - Additional options
   * @returns {Object} Fallback response
   */
  createCircuitBreakerFallback(commandType, requestId, startTime, options = {}) {
    return {
      success: false,
      commandType,
      status: 503,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      requestId,
      error: {
        code: 503,
        message: options.customMessage || `Service temporarily unavailable - circuit breaker is open for ${commandType}`,
        details: 'The service is temporarily unavailable due to repeated failures. Please try again later.',
        type: 'circuit_breaker_open'
      },
      data: null,
      fallback: true,
      metadata: {
        circuitBreakerState: 'open',
        retryAfter: options.retryAfter || this.config.defaultRetryAfter,
        fallbackType: 'circuit_breaker'
      }
    };
  }

  /**
   * Create fallback response for rate limiting
   * @param {string} commandType - The command type
   * @param {string} requestId - The request identifier
   * @param {number} startTime - The request start time
   * @param {Object} options - Additional options
   * @returns {Object} Fallback response
   */
  createRateLimitFallback(commandType, requestId, startTime, options = {}) {
    return {
      success: false,
      commandType,
      status: 429,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      requestId,
      error: {
        code: 429,
        message: 'Rate limit exceeded. Please try again later.',
        details: `Too many requests for ${commandType}. Rate limit will reset soon.`,
        type: 'rate_limit_exceeded'
      },
      data: null,
      fallback: true,
      metadata: {
        retryAfter: options.retryAfter || '30s',
        fallbackType: 'rate_limit'
      }
    };
  }

  /**
   * Create fallback response for service unavailable
   * @param {string} commandType - The command type
   * @param {string} requestId - The request identifier
   * @param {number} startTime - The request start time
   * @param {Object} options - Additional options
   * @returns {Object} Fallback response
   */
  createServiceUnavailableFallback(commandType, requestId, startTime, options = {}) {
    return {
      success: false,
      commandType,
      status: 503,
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      requestId,
      error: {
        code: 503,
        message: 'Service temporarily unavailable',
        details: options.details || 'The requested service is currently unavailable. Please try again later.',
        type: 'service_unavailable'
      },
      data: null,
      fallback: true,
      metadata: {
        retryAfter: options.retryAfter || this.config.defaultRetryAfter,
        fallbackType: 'service_unavailable'
      }
    };
  }
}

module.exports = FallbackResponseManager;
