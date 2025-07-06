const logger = require('./logger');

/**
 * Correlation ID middleware and utilities
 * Provides request tracking across the application
 */

/**
 * Start a new correlation context
 * @param {string} [correlationId] - Optional correlation ID, generates new if not provided
 * @returns {string} The correlation ID being used
 */
function startCorrelation(correlationId = null) {
  const id = correlationId || logger.generateCorrelationId();
  logger.setCorrelationId(id);
  logger.debug('Started correlation context', { correlationId: id });
  return id;
}

/**
 * End current correlation context
 */
function endCorrelation() {
  const correlationId = logger.getCorrelationId();
  if (correlationId) {
    logger.debug('Ended correlation context', { correlationId });
    logger.setCorrelationId(null);
  }
}

/**
 * Execute function with correlation context
 * @param {Function} fn - Function to execute
 * @param {string} [correlationId] - Optional correlation ID
 * @returns {Promise<*>} Function result
 */
async function withCorrelation(fn, correlationId = null) {
  const id = startCorrelation(correlationId);
  try {
    return await fn(id);
  } finally {
    endCorrelation();
  }
}

/**
 * Discord command correlation wrapper
 * @param {Object} interaction - Discord interaction object
 * @returns {string} Correlation ID for the command
 */
function startCommandCorrelation(interaction) {
  const correlationId = logger.generateCorrelationId();
  logger.setCorrelationId(correlationId);
  
  logger.info('Discord command started', {
    correlationId,
    command: interaction.commandName,
    user: interaction.user?.username,
    guild: interaction.guild?.name,
    channel: interaction.channel?.name
  });
  
  return correlationId;
}

/**
 * End Discord command correlation
 * @param {string} correlationId - The correlation ID to end
 * @param {boolean} success - Whether the command was successful
 * @param {Error} [error] - Error if command failed
 */
function endCommandCorrelation(correlationId, success = true, error = null) {
  if (success) {
    logger.info('Discord command completed successfully', { correlationId });
  } else {
    logger.error('Discord command failed', { correlationId, error });
  }
  endCorrelation();
}

/**
 * HTTP request correlation wrapper
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @returns {string} Correlation ID for the request
 */
function startRequestCorrelation(url, method = 'GET') {
  const correlationId = logger.generateCorrelationId();
  logger.setCorrelationId(correlationId);
  
  logger.info('HTTP request started', {
    correlationId,
    url,
    method
  });
  
  return correlationId;
}

/**
 * End HTTP request correlation
 * @param {string} correlationId - The correlation ID to end
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in milliseconds
 */
function endRequestCorrelation(correlationId, statusCode, duration) {
  logger.info('HTTP request completed', {
    correlationId,
    statusCode,
    duration
  });
  endCorrelation();
}

module.exports = {
  startCorrelation,
  endCorrelation,
  withCorrelation,
  startCommandCorrelation,
  endCommandCorrelation,
  startRequestCorrelation,
  endRequestCorrelation,
  // Direct logger access for correlation IDs
  getCorrelationId: () => logger.getCorrelationId(),
  generateCorrelationId: () => logger.generateCorrelationId()
};
