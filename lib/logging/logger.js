const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Winston Logger Configuration
 * Provides centralized, structured logging with file rotation and correlation ID support
 */
class Logger {
  constructor() {
    this.logger = null;
    this.correlationContext = new Map();
    this.initializeLogger();
  }

  /**
   * Initialize Winston logger with multiple transports
   */
  initializeLogger() {
    const logDir = path.join(process.cwd(), 'logs');
    
    // Custom format for structured logging
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, correlationId, service, ...meta }) => {
        return JSON.stringify({
          timestamp,
          level,
          message,
          correlationId: correlationId || 'none',
          service: service || 'discord-n8n-bot',
          ...meta
        });
      })
    );

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, correlationId, service }) => {
        const correlation = correlationId ? `[${correlationId.substring(0, 8)}]` : '';
        const serviceTag = service ? `[${service}]` : '';
        return `${timestamp} ${level}${serviceTag}${correlation}: ${message}`;
      })
    );

    // Application log transport with rotation
    const appLogTransport = new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat,
      level: 'info'
    });

    // Error log transport with rotation
    const errorLogTransport = new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error'
    });

    // Console transport for development
    const consoleTransport = new winston.transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    });

    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        appLogTransport,
        errorLogTransport,
        consoleTransport
      ],
      exitOnError: false
    });

    // Handle transport events
    appLogTransport.on('rotate', (oldFilename, newFilename) => {
      this.logger.info('Log file rotated', { oldFilename, newFilename });
    });

    this.logger.info('Logger initialized successfully', {
      logLevel: this.logger.level,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  /**
   * Generate a new correlation ID
   * @returns {string} UUID v4 correlation ID
   */
  generateCorrelationId() {
    return uuidv4();
  }

  /**
   * Set correlation ID for current context
   * @param {string} correlationId - Correlation ID to set
   */
  setCorrelationId(correlationId) {
    const contextKey = this.getCurrentContext();
    this.correlationContext.set(contextKey, correlationId);
  }

  /**
   * Get correlation ID for current context
   * @returns {string|null} Current correlation ID
   */
  getCorrelationId() {
    const contextKey = this.getCurrentContext();
    return this.correlationContext.get(contextKey) || null;
  }

  /**
   * Get current execution context key
   * @returns {string} Context identifier
   */
  getCurrentContext() {
    return process.pid.toString();
  }

  /**
   * Create child logger with service context
   * @param {string} service - Service name
   * @returns {Object} Child logger with service context
   */
  child(service) {
    return {
      debug: (message, meta = {}) => this.debug(message, { ...meta, service }),
      info: (message, meta = {}) => this.info(message, { ...meta, service }),
      warn: (message, meta = {}) => this.warn(message, { ...meta, service }),
      error: (message, meta = {}) => this.error(message, { ...meta, service })
    };
  }

  /**
   * Log debug message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this.logger.debug(message, {
      ...meta,
      correlationId: this.getCorrelationId()
    });
  }

  /**
   * Log info message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this.logger.info(message, {
      ...meta,
      correlationId: this.getCorrelationId()
    });
  }

  /**
   * Log warning message
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this.logger.warn(message, {
      ...meta,
      correlationId: this.getCorrelationId()
    });
  }

  /**
   * Log error message
   * @param {string} message - Log message
   * @param {Object|Error} meta - Additional metadata or Error object
   */
  error(message, meta = {}) {
    const errorMeta = meta instanceof Error ? {
      error: {
        message: meta.message,
        stack: meta.stack,
        name: meta.name
      }
    } : meta;

    this.logger.error(message, {
      ...errorMeta,
      correlationId: this.getCorrelationId()
    });
  }

  /**
   * Get logger statistics
   * @returns {Object} Logger statistics
   */
  getStats() {
    return {
      level: this.logger.level,
      transports: this.logger.transports.length,
      activeCorrelations: this.correlationContext.size
    };
  }

  /**
   * Cleanup correlation context
   */
  cleanup() {
    this.correlationContext.clear();
  }
}

// Export singleton instance
const loggerInstance = new Logger();
module.exports = loggerInstance;
