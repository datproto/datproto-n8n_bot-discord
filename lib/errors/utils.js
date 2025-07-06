/**
 * Error Utilities
 * Provides helper functions for error handling and classification
 */

const { BaseError } = require('./base');

/**
 * Check if error is operational (expected) vs programming error
 * @param {Error} error - Error to check
 * @returns {boolean} True if operational error
 */
function isOperationalError(error) {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  
  // Check for known operational error patterns
  const operationalPatterns = [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ENOTFOUND/,
    /ECONNRESET/,
    /Rate limit/i,
    /timeout/i,
    /not found/i
  ];
  
  return operationalPatterns.some(pattern => pattern.test(error.message));
}

/**
 * Classify error type from generic Error
 * @param {Error} error - Error to classify
 * @returns {string} Error category
 */
function classifyError(error) {
  if (error instanceof BaseError) {
    return error.constructor.name;
  }
  
  const message = error.message.toLowerCase();
  
  if (message.includes('validation') || message.includes('invalid')) {
    return 'ValidationError';
  }
  
  if (message.includes('config') || message.includes('environment')) {
    return 'ConfigError';
  }
  
  if (message.includes('discord') || message.includes('interaction')) {
    return 'DiscordError';
  }
  
  if (message.includes('n8n') || message.includes('webhook')) {
    return 'N8NError';
  }
  
  if (message.includes('circuit') || message.includes('breaker')) {
    return 'CircuitBreakerError';
  }
  
  if (message.includes('rate limit') || message.includes('throttle')) {
    return 'RateLimitError';
  }
  
  if (message.includes('auth') || message.includes('permission')) {
    return 'AuthError';
  }
  
  return 'UnknownError';
}

/**
 * Get error severity from any error type
 * @param {Error} error - Error to analyze
 * @returns {string} Severity level
 */
function getErrorSeverity(error) {
  if (error instanceof BaseError) {
    return error.getSeverity();
  }
  
  // Default severity classification
  const message = error.message.toLowerCase();
  
  if (message.includes('critical') || message.includes('fatal')) {
    return 'critical';
  }
  
  if (message.includes('connection') || message.includes('timeout')) {
    return 'high';
  }
  
  if (message.includes('validation') || message.includes('permission')) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Check if error should be retried
 * @param {Error} error - Error to check
 * @returns {boolean} True if retryable
 */
function isRetryableError(error) {
  if (error instanceof BaseError) {
    return error.isRetryable();
  }
  
  // Common retryable error patterns
  const retryablePatterns = [
    /ECONNREFUSED/,
    /ETIMEDOUT/,
    /ECONNRESET/,
    /50[0-9]/,  // 5xx HTTP status codes
    /timeout/i,
    /network/i,
    /temporary/i
  ];
  
  return retryablePatterns.some(pattern => pattern.test(error.message));
}

/**
 * Convert any error to standardized format
 * @param {Error} error - Error to normalize
 * @param {string} [correlationId] - Optional correlation ID
 * @returns {Object} Normalized error object
 */
function normalizeError(error, correlationId = null) {
  if (error instanceof BaseError) {
    const normalized = error.toJSON();
    if (correlationId) {
      normalized.details.correlationId = correlationId;
    }
    return normalized;
  }
  
  return {
    name: error.name || 'Error',
    message: error.message,
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: {
      correlationId,
      originalStack: error.stack,
      classification: classifyError(error)
    },
    timestamp: new Date().toISOString(),
    stack: error.stack,
    isOperational: isOperationalError(error),
    severity: getErrorSeverity(error),
    retryable: isRetryableError(error)
  };
}

/**
 * Create API-safe error response
 * @param {Error} error - Error to convert
 * @param {boolean} [includeStack=false] - Whether to include stack trace
 * @returns {Object} API response object
 */
function createApiErrorResponse(error, includeStack = false) {
  const normalized = normalizeError(error);
  
  const response = {
    error: {
      name: normalized.name,
      message: normalized.message,
      code: normalized.code,
      timestamp: normalized.timestamp,
      details: {
        ...normalized.details,
        severity: normalized.severity
      }
    }
  };
  
  if (includeStack && (process.env.NODE_ENV !== 'production')) {
    response.error.stack = normalized.stack;
  }
  
  return response;
}

/**
 * Log error with appropriate level based on severity
 * @param {Object} logger - Logger instance
 * @param {Error} error - Error to log
 * @param {Object} context - Additional context
 */
function logError(logger, error, context = {}) {
  const normalized = normalizeError(error, context.correlationId);
  const severity = normalized.severity;
  
  const logData = {
    ...normalized,
    context
  };
  
  switch (severity) {
    case 'critical':
      logger.error('Critical error occurred', logData);
      break;
    case 'high':
      logger.error('High severity error', logData);
      break;
    case 'medium':
      logger.warn('Medium severity error', logData);
      break;
    case 'low':
    default:
      logger.info('Low severity error', logData);
      break;
  }
}

module.exports = {
  isOperationalError,
  classifyError,
  getErrorSeverity,
  isRetryableError,
  normalizeError,
  createApiErrorResponse,
  logError
};
