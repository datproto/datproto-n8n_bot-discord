/**
 * Configuration Validator
 * Joi validation functions for configuration and environment variables
 */

const {
  configSchema,
  envSchema,
  endpointSchema,
  environmentSchema,
  globalSchema
} = require('./schema');

/**
 * Validate complete configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validated configuration
 * @throws {Error} If validation fails
 */
function validateConfig(config) {
  const { error, value } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Configuration validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate environment variables
 * @param {Object} env - Environment variables object (default: process.env)
 * @returns {Object} Validated environment variables
 * @throws {Error} If validation fails
 */
function validateEnvironmentVariables(env = process.env) {
  const { error, value } = envSchema.validate(env, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Environment validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate single endpoint configuration
 * @param {Object} endpoint - Endpoint configuration
 * @returns {Object} Validated endpoint configuration
 * @throws {Error} If validation fails
 */
function validateEndpoint(endpoint) {
  const { error, value } = endpointSchema.validate(endpoint, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Endpoint validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate environment-specific configuration
 * @param {Object} envConfig - Environment configuration
 * @returns {Object} Validated environment configuration
 * @throws {Error} If validation fails
 */
function validateEnvironmentConfig(envConfig) {
  const { error, value } = environmentSchema.validate(envConfig, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Environment config validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate global configuration
 * @param {Object} globalConfig - Global configuration
 * @returns {Object} Validated global configuration
 * @throws {Error} If validation fails
 */
function validateGlobalConfig(globalConfig) {
  const { error, value } = globalSchema.validate(globalConfig, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join('; ');
    throw new Error(`Global config validation failed: ${errorMessage}`);
  }

  return value;
}

/**
 * Validate and sanitize configuration with detailed error reporting
 * @param {Object} config - Configuration object
 * @returns {Object} Result object with isValid, errors, and value
 */
function validateConfigSafe(config) {
  try {
    const value = validateConfig(config);
    return {
      isValid: true,
      errors: [],
      value
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message],
      value: null
    };
  }
}

/**
 * Validate environment variables with detailed error reporting
 * @param {Object} env - Environment variables
 * @returns {Object} Result object with isValid, errors, and value
 */
function validateEnvironmentVariablesSafe(env = process.env) {
  try {
    const value = validateEnvironmentVariables(env);
    return {
      isValid: true,
      errors: [],
      value
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [error.message],
      value: null
    };
  }
}

/**
 * Validate configuration and throw detailed error if invalid
 * @param {Object} config - Configuration object
 * @throws {Error} Detailed validation error
 */
function assertValidConfig(config) {
  const result = validateConfigSafe(config);
  if (!result.isValid) {
    throw new Error(`Invalid configuration: ${result.errors.join(', ')}`);
  }
}

/**
 * Validate environment variables and throw detailed error if invalid
 * @param {Object} env - Environment variables
 * @throws {Error} Detailed validation error
 */
function assertValidEnvironment(env = process.env) {
  const result = validateEnvironmentVariablesSafe(env);
  if (!result.isValid) {
    throw new Error(`Invalid environment: ${result.errors.join(', ')}`);
  }
}

module.exports = {
  validateConfig,
  validateEnvironmentVariables,
  validateEndpoint,
  validateEnvironmentConfig,
  validateGlobalConfig,
  validateConfigSafe,
  validateEnvironmentVariablesSafe,
  assertValidConfig,
  assertValidEnvironment
};
