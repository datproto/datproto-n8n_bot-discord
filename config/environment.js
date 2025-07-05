/**
 * Environment Configuration Manager
 * Handles loading and merging of environment-specific configuration
 */

const fs = require('fs');
const path = require('path');
const { merge } = require('lodash');
const { loadEnvironmentVariables, getDiscordToken, validateEnvironmentVariables } = require('./env-loader');
const { validateConfig, assertValidEnvironment } = require('./validator');

class EnvironmentManager {
  constructor() {
    // Validate environment variables first
    assertValidEnvironment();

    this.currentEnv = process.env.NODE_ENV || 'development';
    this.configPath = path.join(__dirname, 'endpoints.json');
    this.config = null;
    this.envOverrides = {};
    this.envVariables = loadEnvironmentVariables();

    this.loadConfiguration();
  }

  /**
   * Load configuration from endpoints.json
   */
  loadConfiguration() {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }
      const configData = fs.readFileSync(this.configPath, 'utf8');
      const rawConfig = JSON.parse(configData);
      // Validate configuration against schema
      this.config = validateConfig(rawConfig);
      this.loadEnvironmentOverrides();
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load environment-specific overrides
   */
  loadEnvironmentOverrides() {
    if (!this.config.environments) {
      throw new Error('No environment configurations found');
    }
    const envConfig = this.config.environments[this.currentEnv];
    if (!envConfig) {
      throw new Error(`No configuration found for environment: ${this.currentEnv}`);
    }
    this.envOverrides = envConfig.overrides || {};
  }

  /**
   * Get endpoint configuration for a specific command
   * @param {string} commandName - The command name
   * @returns {Object} Endpoint configuration
   */
  getEndpointConfig(commandName) {
    const baseEndpoint = this.config.endpoints[commandName];
    if (!baseEndpoint) {
      throw new Error(`No endpoint configuration found for command: ${commandName}`);
    }
    // Apply environment overrides if they exist
    const overrideEndpoint = this.envOverrides.endpoints?.[commandName];
    let mergedEndpoint = overrideEndpoint
      ? merge({}, baseEndpoint, overrideEndpoint)
      : { ...baseEndpoint };
    // Apply environment variable overrides
    if (this.envVariables.endpointUrls[commandName]) {
      mergedEndpoint.url = this.envVariables.endpointUrls[commandName];
    }
    if (this.envVariables.endpointTimeouts[commandName]) {
      mergedEndpoint.timeout = this.envVariables.endpointTimeouts[commandName];
    }
    return mergedEndpoint;
  }

  /**
   * Get all endpoint configurations
   * @returns {Object} All endpoint configurations with environment overrides applied
   */
  getAllEndpoints() {
    const endpoints = {};

    for (const [commandName, endpoint] of Object.entries(this.config.endpoints)) {
      endpoints[commandName] = this.getEndpointConfig(commandName);
    }
    return endpoints;
  }

  /**
   * Get global configuration
   * @returns {Object} Global configuration with environment overrides applied
   */
  getGlobalConfig() {
    const baseGlobal = this.config.global;
    const overrideGlobal = this.envOverrides.global;

    let mergedGlobal = overrideGlobal
      ? merge({}, baseGlobal, overrideGlobal)
      : { ...baseGlobal };

    // Apply environment variable overrides for rate limiting
    if (this.envVariables.rateLimitPerUser !== undefined) {
      mergedGlobal.rateLimiting.perUser = this.envVariables.rateLimitPerUser;
    }
    if (this.envVariables.rateLimitGlobal !== undefined) {
      mergedGlobal.rateLimiting.global = this.envVariables.rateLimitGlobal;
    }
    return mergedGlobal;
  }

  /**
   * Get environment-specific configuration
   * @returns {Object} Current environment configuration
   */
  getEnvironmentConfig() {
    return this.config.environments[this.currentEnv];
  }

  /**
   * Get current environment name
   * @returns {string} Current environment
   */
  getCurrentEnvironment() {
    return this.currentEnv;
  }

  /**
   * Get complete merged configuration
   * @returns {Object} Complete configuration with all overrides applied
   */
  getCompleteConfig() {
    return {
      environment: this.currentEnv,
      endpoints: this.getAllEndpoints(),
      global: this.getGlobalConfig(),
      environmentConfig: this.getEnvironmentConfig()
    };
  }

  /**
   * Check if endpoint is enabled
   * @param {string} commandName - The command name
   * @returns {boolean} Whether endpoint is enabled
   */
  isEndpointEnabled(commandName) {
    const endpoint = this.getEndpointConfig(commandName);
    return endpoint.enabled !== false;
  }

  /**
   * Get available command names
   * @returns {Array<string>} List of available command names
   */
  getAvailableCommands() {
    return Object.keys(this.config.endpoints);
  }

  /**
   * Get enabled command names
   * @returns {Array<string>} List of enabled command names
   */
  getEnabledCommands() {
    return this.getAvailableCommands()
      .filter(command => this.isEndpointEnabled(command));
  }

  /**
   * Get environment variables
   * @returns {Object} Processed environment variables
   */
  getEnvironmentVariables() {
    return { ...this.envVariables };
  }

  /**
   * Get Discord token from environment
   * @returns {string} Discord bot token
   */
  getDiscordToken() {
    return getDiscordToken();
  }

  /**
   * Get log level with environment override
   * @returns {string} Log level
   */
  getLogLevel() {
    // Environment variable takes precedence over config file
    return this.envVariables.logLevel ||
      this.getEnvironmentConfig().logLevel ||
      'info';
  }

  /**
   * Reload configuration from file
   * Useful for hot-reloading functionality
   */
  reloadConfiguration() {
    // Re-validate environment variables
    assertValidEnvironment();
    this.envVariables = loadEnvironmentVariables();
    this.loadConfiguration();
  }

  /**
   * Validate endpoint URL format
   * @param {string} commandName - The command name
   * @returns {boolean} Whether URL is valid
   */
  validateEndpointUrl(commandName) {
    try {
      const endpoint = this.getEndpointConfig(commandName);
      new URL(endpoint.url);
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const environmentManager = new EnvironmentManager();

module.exports = {
  EnvironmentManager,
  environmentManager,
  getEndpointConfig: (cmd) => environmentManager.getEndpointConfig(cmd),
  getAllEndpoints: () => environmentManager.getAllEndpoints(),
  getGlobalConfig: () => environmentManager.getGlobalConfig(),
  getEnvironmentConfig: () => environmentManager.getEnvironmentConfig(),
  getCurrentEnvironment: () => environmentManager.getCurrentEnvironment(),
  getCompleteConfig: () => environmentManager.getCompleteConfig(),
  isEndpointEnabled: (cmd) => environmentManager.isEndpointEnabled(cmd),
  getAvailableCommands: () => environmentManager.getAvailableCommands(),
  getEnabledCommands: () => environmentManager.getEnabledCommands(),
  reloadConfiguration: () => environmentManager.reloadConfiguration(),
  validateEndpointUrl: (cmd) => environmentManager.validateEndpointUrl(cmd),
  getEnvironmentVariables: () => environmentManager.getEnvironmentVariables(),
  getDiscordToken: () => environmentManager.getDiscordToken(),
  getLogLevel: () => environmentManager.getLogLevel()
};
