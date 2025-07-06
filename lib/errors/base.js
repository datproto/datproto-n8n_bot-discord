/**
 * Base Error Class
 * Provides common error functionality and structured error data
 */
class BaseError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = {}) {
    super(message);
    
    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true; // Distinguishes operational vs programming errors
  }

  /**
   * Convert error to JSON for logging and API responses
   * @returns {Object} JSON representation of error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack,
      isOperational: this.isOperational
    };
  }

  /**
   * Get error for API response (no stack trace)
   * @returns {Object} Client-safe error representation
   */
  toApiResponse() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }

  /**
   * Get error severity level
   * @returns {string} Severity level (low, medium, high, critical)
   */
  getSeverity() {
    if (this.statusCode >= 500) return 'high';
    if (this.statusCode >= 400) return 'medium';
    return 'low';
  }

  /**
   * Check if error should be retried
   * @returns {boolean} Whether the error is retryable
   */
  isRetryable() {
    return this.statusCode >= 500 && this.statusCode !== 501;
  }

  /**
   * Create error with correlation ID
   * @param {string} correlationId - Request correlation ID
   * @returns {BaseError} Error instance with correlation ID
   */
  withCorrelationId(correlationId) {
    this.details.correlationId = correlationId;
    return this;
  }

  /**
   * Add context to error
   * @param {Object} context - Additional context
   * @returns {BaseError} Error instance with context
   */
  withContext(context) {
    this.details = { ...this.details, ...context };
    return this;
  }
}

/**
 * N8N Service Error
 * For errors related to N8N service communication
 */
class N8NError extends BaseError {
  constructor(message, endpoint = null, details = {}) {
    super(message, 'N8N_ERROR', 502, { endpoint, ...details });
  }

  static connectionFailed(endpoint, originalError) {
    return new N8NError(
      `Failed to connect to N8N endpoint: ${endpoint}`,
      endpoint,
      { originalError: originalError.message, type: 'connection_failed' }
    );
  }

  static requestTimeout(endpoint, timeout) {
    return new N8NError(
      `N8N request timeout after ${timeout}ms`,
      endpoint,
      { timeout, type: 'request_timeout' }
    );
  }

  static invalidResponse(endpoint, statusCode, responseBody) {
    return new N8NError(
      `Invalid response from N8N endpoint: ${statusCode}`,
      endpoint,
      { statusCode, responseBody, type: 'invalid_response' }
    );
  }

  static webhookNotFound(commandType) {
    return new N8NError(
      `No webhook endpoint configured for command: ${commandType}`,
      null,
      { commandType, type: 'webhook_not_found' }
    );
  }
}

/**
 * Configuration Error
 * For configuration-related errors
 */
class ConfigError extends BaseError {
  constructor(message, configKey = null, details = {}) {
    super(message, 'CONFIG_ERROR', 500, { configKey, ...details });
  }

  static missingRequired(configKey) {
    return new ConfigError(
      `Required configuration key missing: ${configKey}`,
      configKey,
      { type: 'missing_required' }
    );
  }

  static invalidValue(configKey, value, expectedType) {
    return new ConfigError(
      `Invalid configuration value for ${configKey}: expected ${expectedType}`,
      configKey,
      { value, expectedType, type: 'invalid_value' }
    );
  }

  static fileNotFound(filePath) {
    return new ConfigError(
      `Configuration file not found: ${filePath}`,
      null,
      { filePath, type: 'file_not_found' }
    );
  }

  static parseError(filePath, originalError) {
    return new ConfigError(
      `Failed to parse configuration file: ${filePath}`,
      null,
      { filePath, originalError: originalError.message, type: 'parse_error' }
    );
  }
}

/**
 * Validation Error
 * For input validation errors
 */
class ValidationError extends BaseError {
  constructor(message, field = null, details = {}) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
  }

  static required(field) {
    return new ValidationError(
      `Field '${field}' is required`,
      field,
      { type: 'required' }
    );
  }

  static invalidFormat(field, format) {
    return new ValidationError(
      `Field '${field}' has invalid format, expected: ${format}`,
      field,
      { expectedFormat: format, type: 'invalid_format' }
    );
  }

  static outOfRange(field, min, max, value) {
    return new ValidationError(
      `Field '${field}' value ${value} is out of range [${min}, ${max}]`,
      field,
      { min, max, value, type: 'out_of_range' }
    );
  }

  static multipleFields(errors) {
    const fields = Object.keys(errors);
    return new ValidationError(
      `Validation failed for fields: ${fields.join(', ')}`,
      null,
      { fieldErrors: errors, type: 'multiple_fields' }
    );
  }
}

module.exports = {
  BaseError,
  N8NError,
  ConfigError,
  ValidationError
};
