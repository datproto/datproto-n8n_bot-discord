/**
 * Environment Variable Loader
 * Handles loading and processing of environment variables
 */

const { envSchema } = require('./schema');

// Load environment variables from .env file
require('dotenv').config();

/**
 * Load and process environment variables
 * @returns {Object} Processed environment variables
 */
function loadEnvironmentVariables() {
  const envVars = {
    nodeEnv: process.env.NODE_ENV || 'development',
    discordToken: process.env.DISCORD_TOKEN,
    logLevel: process.env.LOG_LEVEL,
    rateLimitPerUser: process.env.RATE_LIMIT_PER_USER ?
      parseInt(process.env.RATE_LIMIT_PER_USER, 10) : undefined,
    rateLimitGlobal: process.env.RATE_LIMIT_GLOBAL ?
      parseInt(process.env.RATE_LIMIT_GLOBAL, 10) : undefined
  };

  // Load N8N endpoint URLs from environment variables
  const endpointUrls = {};
  const endpointTimeouts = {};

  Object.keys(process.env).forEach(key => {
    // Match N8N_COMMANDNAME_URL pattern
    const urlMatch = key.match(/^N8N_([A-Z_]+)_URL$/);
    if (urlMatch) {
      const commandName = urlMatch[1].toLowerCase().replace(/_/g, '');
      endpointUrls[commandName] = process.env[key];
    }

    // Match N8N_COMMANDNAME_TIMEOUT pattern
    const timeoutMatch = key.match(/^N8N_([A-Z_]+)_TIMEOUT$/);
    if (timeoutMatch) {
      const commandName = timeoutMatch[1].toLowerCase().replace(/_/g, '');
      endpointTimeouts[commandName] = parseInt(process.env[key], 10);
    }
  });

  envVars.endpointUrls = endpointUrls;
  envVars.endpointTimeouts = endpointTimeouts;

  return envVars;
}

/**
 * Get Discord token from environment
 * @returns {string} Discord bot token
 */
function getDiscordToken() {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    throw new Error('DISCORD_TOKEN environment variable is required');
  }
  return token;
}

/**
 * Validate required environment variables
 * @throws {Error} If required variables are missing or invalid
 */
function validateEnvironmentVariables() {
  const { error } = envSchema.validate(process.env, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Environment validation failed: ${errorMessage}`);
  }
}

module.exports = {
  loadEnvironmentVariables,
  getDiscordToken,
  validateEnvironmentVariables
};
