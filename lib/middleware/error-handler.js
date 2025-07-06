/**
 * Error Middleware for Discord Bot
 * Handles errors in Discord interactions and application operations
 */

const { logger, correlation } = require('../logging');
const { logError, createApiErrorResponse, DiscordError, BaseError } = require('../errors');

/**
 * Discord Interaction Error Handler
 * Catches and handles errors during Discord command execution
 */
class DiscordErrorHandler {
  constructor(options = {}) {
    this.options = {
      enableStackTrace: process.env.NODE_ENV !== 'production',
      logLevel: options.logLevel || 'error',
      sendUserFriendlyMessages: options.sendUserFriendlyMessages !== false,
      includeCorrelationId: options.includeCorrelationId !== false,
      ...options
    };
  }

  /**
   * Handle Discord interaction errors
   * @param {Error} error - The error that occurred
   * @param {Object} interaction - Discord interaction object
   * @returns {Promise<void>}
   */
  async handleInteractionError(error, interaction) {
    const correlationId = correlation.getCorrelationId() || correlation.generateCorrelationId();
    
    try {
      // Log the error with context
      logError(logger, error, {
        correlationId,
        interactionId: interaction.id,
        commandName: interaction.commandName,
        userId: interaction.user?.id,
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
        operation: 'discord_interaction'
      });

      // Determine user-friendly message
      const userMessage = this.createUserFriendlyMessage(error, correlationId);

      // Reply to interaction if possible
      await this.replyToInteraction(interaction, userMessage, error);

    } catch (replyError) {
      // If we can't reply, log that too
      logger.error('Failed to reply to Discord interaction after error', {
        correlationId,
        originalError: error.message,
        replyError: replyError.message,
        interactionId: interaction.id
      });
    }
  }

  /**
   * Create user-friendly error message
   * @param {Error} error - The error
   * @param {string} correlationId - Correlation ID
   * @returns {string} User-friendly message
   */
  createUserFriendlyMessage(error, correlationId) {
    if (!this.options.sendUserFriendlyMessages) {
      return 'An error occurred while processing your request.';
    }

    let message = '';

    if (error instanceof DiscordError) {
      switch (error.details.type) {
        case 'command_not_found':
          message = 'Sorry, that command is not recognized.';
          break;
        case 'permission_denied':
          message = 'You don\'t have permission to use this command.';
          break;
        case 'rate_limited':
          message = 'Please wait a moment before trying again.';
          break;
        default:
          message = 'There was an issue with your Discord command.';
      }
    } else if (error instanceof BaseError) {
      switch (error.constructor.name) {
        case 'ValidationError':
          message = 'Please check your input and try again.';
          break;
        case 'N8NError':
          message = 'The service is temporarily unavailable. Please try again later.';
          break;
        case 'RateLimitError':
          message = 'You\'re sending requests too quickly. Please slow down.';
          break;
        case 'CircuitBreakerError':
          message = 'The service is currently unavailable. Please try again in a few minutes.';
          break;
        default:
          message = 'An unexpected error occurred. Please try again.';
      }
    } else {
      message = 'An unexpected error occurred. Please try again.';
    }

    // Add correlation ID if enabled and not in production
    if (this.options.includeCorrelationId && process.env.NODE_ENV !== 'production') {
      message += `\n\n*Error ID: ${correlationId.substring(0, 8)}*`;
    }

    return message;
  }

  /**
   * Reply to Discord interaction with error message
   * @param {Object} interaction - Discord interaction
   * @param {string} message - Error message
   * @param {Error} error - Original error
   */
  async replyToInteraction(interaction, message, error) {
    const replyOptions = {
      content: message,
      ephemeral: true // Only visible to the user
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    } catch (discordError) {
      // If Discord API fails, try followUp
      try {
        await interaction.followUp(replyOptions);
      } catch (followUpError) {
        // Log both errors if everything fails
        logger.error('Failed to send error response to Discord', {
          originalError: error.message,
          discordError: discordError.message,
          followUpError: followUpError.message,
          interactionId: interaction.id
        });
      }
    }
  }

  /**
   * Wrap Discord command handler with error handling
   * @param {Function} handler - Command handler function
   * @returns {Function} Wrapped handler with error handling
   */
  wrapCommandHandler(handler) {
    return async (interaction) => {
      const correlationId = correlation.startCommandCorrelation(interaction);
      
      try {
        await handler(interaction);
        correlation.endCommandCorrelation(correlationId, true);
      } catch (error) {
        correlation.endCommandCorrelation(correlationId, false, error);
        await this.handleInteractionError(error, interaction);
      }
    };
  }

  /**
   * Create middleware for service operations
   * @param {string} serviceName - Name of the service
   * @returns {Function} Middleware function
   */
  createServiceMiddleware(serviceName) {
    return async (operation, context = {}) => {
      const correlationId = correlation.getCorrelationId() || correlation.startCorrelation();
      
      try {
        logger.info(`${serviceName} operation started`, {
          correlationId,
          operation: operation.name || 'unknown',
          ...context
        });

        const result = await operation();

        logger.info(`${serviceName} operation completed`, {
          correlationId,
          operation: operation.name || 'unknown'
        });

        return result;

      } catch (error) {
        logError(logger, error, {
          correlationId,
          service: serviceName,
          operation: operation.name || 'unknown',
          ...context
        });

        // Re-throw with correlation ID if it's a BaseError
        if (error instanceof BaseError) {
          throw error.withCorrelationId(correlationId);
        }

        throw error;
      }
    };
  }
}

/**
 * Global Error Handler
 * Handles uncaught exceptions and promise rejections
 */
const { GlobalErrorHandler, globalErrorHandler } = require('./global-error-handler');

// Singleton instances
const discordErrorHandler = new DiscordErrorHandler();

module.exports = {
  DiscordErrorHandler,
  GlobalErrorHandler,
  discordErrorHandler,
  globalErrorHandler
};
