const { ValidationError } = require('../errors');
const { logger } = require('../logging');
const { createCommonValidators, sanitizeInput } = require('./validators');

/**
 * Validation Middleware Class
 */
class ValidationMiddleware {
  constructor() {
    this.validators = createCommonValidators();
  }

  /**
   * Add custom validator
   * @param {string} name - Validator name
   * @param {Function} validator - Validator function
   */
  addValidator(name, validator) {
    this.validators.set(name, validator);
  }

  /**
   * Validate Discord interaction options
   * @param {Object} interaction - Discord interaction
   * @param {Object} schema - Validation schema
   * @returns {Object} Validated and sanitized options
   */
  validateInteractionOptions(interaction, schema) {
    const options = {};
    const errors = {};

    // Get interaction options
    const interactionOptions = interaction.options?.data || [];
    const optionsMap = new Map(
      interactionOptions.map(opt => [opt.name, opt.value])
    );

    // Validate each schema field
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = optionsMap.get(fieldName);

      try {
        // Check required fields
        if (fieldSchema.required && (value === undefined || value === null)) {
          errors[fieldName] = `Field '${fieldName}' is required`;
          continue;
        }

        // Skip validation if value is undefined and not required
        if (value === undefined || value === null) {
          if (fieldSchema.default !== undefined) {
            options[fieldName] = fieldSchema.default;
          }
          continue;
        }

        // Validate and sanitize
        const validatedValue = this.validateField(fieldName, value, fieldSchema);
        options[fieldName] = validatedValue;

      } catch (error) {
        errors[fieldName] = error.message;
      }
    }

    // Throw validation error if there are errors
    if (Object.keys(errors).length > 0) {
      throw ValidationError.multipleFields(errors);
    }

    return options;
  }

  /**
   * Validate individual field
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @param {Object} schema - Field schema
   * @returns {*} Validated and sanitized value
   */
  validateField(fieldName, value, schema) {
    const { type, options = {}, sanitize = true } = schema;

    // Get validator
    const validator = this.validators.get(type);
    if (!validator) {
      throw new Error(`Unknown validator type: ${type}`);
    }

    // Sanitize input if enabled
    let sanitizedValue = sanitize ? this.sanitizeInput(value, type) : value;

    // Validate
    const isValid = validator(sanitizedValue, options);
    if (!isValid) {
      throw ValidationError.invalidFormat(fieldName, type);
    }

    // Apply transformations
    if (schema.transform) {
      sanitizedValue = schema.transform(sanitizedValue);
    }

    return sanitizedValue;
  }

  /**
   * Sanitize input based on type
   * @param {*} value - Input value
   * @param {string} type - Value type
   * @returns {*} Sanitized value
   */
  sanitizeInput(value, type) {
    return sanitizeInput(value, type);
  }

  /**
   * Create validation middleware for Discord commands
   * @param {Object} schema - Validation schema
   * @returns {Function} Middleware function
   */
  createCommandValidator(schema) {
    return (interaction, next) => {
      try {
        const validatedOptions = this.validateInteractionOptions(interaction, schema);
        
        // Add validated options to interaction
        interaction.validatedOptions = validatedOptions;
        
        logger.debug('Command options validated successfully', {
          command: interaction.commandName,
          options: Object.keys(validatedOptions)
        });

        return next();
      } catch (error) {
        logger.warn('Command validation failed', {
          command: interaction.commandName,
          error: error.message,
          details: error.details
        });
        throw error;
      }
    };
  }

  /**
   * Validate service configuration
   * @param {Object} config - Configuration object
   * @param {Object} schema - Configuration schema
   * @returns {Object} Validated configuration
   */
  validateConfig(config, schema) {
    const validated = {};
    const errors = {};

    for (const [key, fieldSchema] of Object.entries(schema)) {
      try {
        const value = config[key];
        
        if (fieldSchema.required && (value === undefined || value === null)) {
          errors[key] = `Configuration key '${key}' is required`;
          continue;
        }

        if (value !== undefined && value !== null) {
          validated[key] = this.validateField(key, value, fieldSchema);
        } else if (fieldSchema.default !== undefined) {
          validated[key] = fieldSchema.default;
        }
      } catch (error) {
        errors[key] = error.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw ValidationError.multipleFields(errors);
    }

    return validated;
  }
}

// Singleton instance
const validationMiddleware = new ValidationMiddleware();

module.exports = {
  ValidationMiddleware,
  validationMiddleware
};
