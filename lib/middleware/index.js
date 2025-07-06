/**
 * Middleware Module Index
 * Exports all middleware components for error handling and validation
 */

const {
  DiscordErrorHandler,
  GlobalErrorHandler,
  discordErrorHandler,
  globalErrorHandler
} = require('./error-handler');

const {
  ValidationMiddleware,
  validationMiddleware
} = require('./validation');

const { createCommonValidators, sanitizeInput } = require('./validators');

module.exports = {
  // Error handling
  DiscordErrorHandler,
  GlobalErrorHandler,
  discordErrorHandler,
  globalErrorHandler,
  
  // Validation
  ValidationMiddleware,
  validationMiddleware,
  createCommonValidators,
  sanitizeInput,
  
  // Convenience exports
  errorHandler: discordErrorHandler,
  validator: validationMiddleware
};
