/**
 * Global Error Handler
 * Handles uncaught exceptions and promise rejections
 */

const { logger } = require('../logging');

/**
 * Global Error Handler
 * Handles uncaught exceptions and promise rejections
 */
class GlobalErrorHandler {
  constructor() {
    this.setupGlobalHandlers();
  }

  /**
   * Set up global error handlers
   */
  setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack,
        type: 'uncaughtException'
      });

      // Graceful shutdown
      this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        promise: promise.toString(),
        type: 'unhandledRejection'
      });

      // Graceful shutdown
      this.gracefulShutdown('unhandledRejection');
    });

    // Handle process warnings
    process.on('warning', (warning) => {
      logger.warn('Process Warning', {
        name: warning.name,
        message: warning.message,
        stack: warning.stack
      });
    });
  }

  /**
   * Graceful shutdown on critical errors
   * @param {string} reason - Shutdown reason
   */
  gracefulShutdown(reason) {
    logger.error(`Initiating graceful shutdown due to: ${reason}`);

    setTimeout(() => {
      logger.error('Forceful shutdown - graceful shutdown timeout');
      process.exit(1);
    }, 10000); // 10 second timeout

    // Allow time for cleanup
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }
}

// Singleton instance
const globalErrorHandler = new GlobalErrorHandler();

module.exports = {
  GlobalErrorHandler,
  globalErrorHandler
};
