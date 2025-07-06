/**
 * Error Handling Module Index
 * Exports all error classes and utilities
 */

// Base error classes
const { BaseError, N8NError, ConfigError, ValidationError } = require('./base');

// Specialized error classes
const { 
  DiscordError, 
  CircuitBreakerError, 
  RateLimitError, 
  ServiceError, 
  AuthError 
} = require('./specialized');

// Error utilities
const {
  isOperationalError,
  classifyError,
  getErrorSeverity,
  isRetryableError,
  normalizeError,
  createApiErrorResponse,
  logError
} = require('./utils');

module.exports = {
  // Base errors
  BaseError,
  N8NError,
  ConfigError,
  ValidationError,
  
  // Specialized errors
  DiscordError,
  CircuitBreakerError,
  RateLimitError,
  ServiceError,
  AuthError,
  
  // Utilities
  isOperationalError,
  classifyError,
  getErrorSeverity,
  isRetryableError,
  normalizeError,
  createApiErrorResponse,
  logError,
  
  // Error factory for common use cases
  createError: {
    n8n: N8NError,
    config: ConfigError,
    validation: ValidationError,
    discord: DiscordError,
    circuitBreaker: CircuitBreakerError,
    rateLimit: RateLimitError,
    service: ServiceError,
    auth: AuthError
  }
};
