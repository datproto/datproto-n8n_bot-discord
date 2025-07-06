/**
 * Logging Module Index
 * Exports all logging utilities and configuration
 */

const logger = require('./logger');
const correlation = require('./correlation');

module.exports = {
  logger,
  correlation,
  // Convenience exports
  log: logger,
  withCorrelation: correlation.withCorrelation,
  startCorrelation: correlation.startCorrelation,
  endCorrelation: correlation.endCorrelation
};
