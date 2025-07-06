/**
 * Common Validators
 * Provides standard validation functions
 */

/**
 * Set up common validation rules
 * @returns {Map} Map of validator functions
 */
function createCommonValidators() {
  const validators = new Map();

  // URL validation
  validators.set('url', (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  });

  // Discord user ID validation
  validators.set('discordId', (value) => {
    return /^\d{17,19}$/.test(value);
  });

  // Command name validation
  validators.set('commandName', (value) => {
    return /^[a-z0-9_-]{1,32}$/.test(value);
  });

  // Generic string validation
  validators.set('string', (value, options = {}) => {
    if (typeof value !== 'string') return false;
    if (options.minLength && value.length < options.minLength) return false;
    if (options.maxLength && value.length > options.maxLength) return false;
    if (options.pattern && !options.pattern.test(value)) return false;
    return true;
  });

  // Number validation
  validators.set('number', (value, options = {}) => {
    const num = Number(value);
    if (isNaN(num)) return false;
    if (options.min !== undefined && num < options.min) return false;
    if (options.max !== undefined && num > options.max) return false;
    if (options.integer && !Number.isInteger(num)) return false;
    return true;
  });

  // Email validation
  validators.set('email', (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  });

  // Boolean validation
  validators.set('boolean', (value) => {
    return typeof value === 'boolean' || 
           value === 'true' || value === 'false' ||
           value === '1' || value === '0';
  });

  return validators;
}

/**
 * Sanitize input based on type
 * @param {*} value - Input value
 * @param {string} type - Value type
 * @returns {*} Sanitized value
 */
function sanitizeInput(value, type) {
  if (typeof value !== 'string') {
    return value;
  }

  // Basic sanitization
  let sanitized = value.trim();

  switch (type) {
    case 'string':
      // Remove null bytes and control characters
      sanitized = sanitized.replace(/\x00/g, '').replace(/[\x01-\x1F\x7F]/g, '');
      break;
    
    case 'url':
      // URL sanitization is handled by URL constructor validation
      break;
    
    case 'number':
      // Convert to number
      return Number(sanitized);
    
    case 'boolean':
      // Convert to boolean
      return sanitized === 'true' || sanitized === '1' || sanitized === true;
    
    case 'email':
      // Convert to lowercase
      sanitized = sanitized.toLowerCase();
      break;
  }

  return sanitized;
}

module.exports = {
  createCommonValidators,
  sanitizeInput
};
