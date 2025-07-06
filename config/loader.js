/**
 * Configuration Loader with Fallback Logic
 * Handles configuration loading with multiple fallback strategies
 */

const fs = require('fs');
const path = require('path');
const { merge } = require('lodash');
const { validateConfig, validateConfigSafe } = require('./validator');
const { getDefaultConfig, getMinimalConfig } = require('./defaults');

class ConfigurationLoader {
  constructor() {
    this.loadOrder = [
      'loadFromFile',
      'loadFromDefaults',
      'loadMinimal'
    ];
    this.loadAttempts = [];
  }

  /**
   * Load configuration with fallback strategies
   * @param {string} configPath - Path to configuration file
   * @returns {Object} Loaded and validated configuration
   */
  loadWithFallback(configPath) {
    this.loadAttempts = [];

    for (const method of this.loadOrder) {
      try {
        const config = this[method](configPath);

        // Validate the loaded configuration
        const validatedConfig = validateConfig(config);

        this.loadAttempts.push({
          method,
          success: true,
          config: validatedConfig
        });

        console.log(`Configuration loaded successfully using: ${method}`);
        return validatedConfig;

      } catch (error) {
        this.loadAttempts.push({
          method,
          success: false,
          error: error.message
        });

        console.warn(`Failed to load config with ${method}:`, error.message);
        continue;
      }
    }

    // If all methods fail, throw error with details
    const errorDetails = this.loadAttempts.map(
      attempt => `${attempt.method}: ${attempt.error}`
    ).join('; ');

    throw new Error(`All configuration loading methods failed: ${errorDetails}`);
  }

  /**
   * Load configuration from file
   * @param {string} configPath - Path to configuration file
   * @returns {Object} Configuration object
   */
  loadFromFile(configPath) {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const stat = fs.statSync(configPath);
    if (!stat.isFile()) {
      throw new Error(`Configuration path is not a file: ${configPath}`);
    }

    let configData;
    try {
      configData = fs.readFileSync(configPath, 'utf8');
    } catch (error) {
      throw new Error(`Cannot read configuration file: ${error.message}`);
    }

    let config;
    try {
      config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Invalid JSON in configuration file: ${error.message}`);
    }

    return config;
  }

  /**
   * Load default configuration
   * @returns {Object} Default configuration
   */
  loadFromDefaults() {
    const environment = process.env.NODE_ENV || 'development';
    return getDefaultConfig(environment);
  }

  /**
   * Load minimal configuration as last resort
   * @returns {Object} Minimal configuration
   */
  loadMinimal() {
    console.warn('Using minimal configuration as fallback');
    return getMinimalConfig();
  }

  /**
   * Safe load with detailed error reporting
   * @param {string} configPath - Path to configuration file
   * @returns {Object} Result with success status and config/errors
   */
  loadSafe(configPath) {
    try {
      const config = this.loadWithFallback(configPath);
      return {
        success: true,
        config,
        attempts: this.loadAttempts,
        method: this.loadAttempts.find(a => a.success)?.method
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        attempts: this.loadAttempts,
        config: null
      };
    }
  }

  /**
   * Merge user configuration with defaults
   * @param {Object} userConfig - User provided configuration
   * @param {Object} defaultConfig - Default configuration
   * @returns {Object} Merged configuration
   */
  mergeWithDefaults(userConfig, defaultConfig) {
    if (!userConfig || typeof userConfig !== 'object') {
      return defaultConfig;
    }

    return merge({}, defaultConfig, userConfig);
  }

  /**
   * Load configuration with partial fallback
   * Allows incomplete configurations by merging with defaults
   * @param {string} configPath - Path to configuration file
   * @returns {Object} Merged configuration
   */
  loadWithPartialFallback(configPath) {
    const defaultConfig = getDefaultConfig();

    try {
      const userConfig = this.loadFromFile(configPath);

      // Try to validate the merged configuration
      const mergedConfig = this.mergeWithDefaults(userConfig, defaultConfig);
      const validationResult = validateConfigSafe(mergedConfig);

      if (validationResult.isValid) {
        console.log('Configuration loaded with partial fallback');
        return validationResult.value;
      } else {
        console.warn('Merged configuration invalid, using defaults');
        return validateConfig(defaultConfig);
      }

    } catch (error) {
      console.warn(`Failed to load user config, using defaults: ${error.message}`);
      return validateConfig(defaultConfig);
    }
  }

  /**
   * Get loading attempt history
   * @returns {Array} Array of loading attempts
   */
  getLoadAttempts() {
    return [...this.loadAttempts];
  }

  /**
   * Reset loading attempt history
   */
  resetAttempts() {
    this.loadAttempts = [];
  }
}

module.exports = {
  ConfigurationLoader
};
