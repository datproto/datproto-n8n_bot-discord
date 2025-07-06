/**
 * Scrape Command Input Validator
 * Validates and sanitizes input parameters for scrape command
 */

const Joi = require('joi');
const { logger } = require('../../lib/logging');

/**
 * Joi schema for scrape command input validation
 */
const scrapeInputSchema = Joi.object({
    url: Joi.string()
        .uri({ scheme: ['http', 'https'] })
        .required()
        .messages({
            'string.uri': 'Please provide a valid URL starting with http:// or https://',
            'any.required': 'URL is required'
        }),
    
    extractionRequest: Joi.string()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.min': 'Extraction request must be at least 10 characters long',
            'string.max': 'Extraction request must be less than 1000 characters',
            'any.required': 'Extraction request is required'
        }),
    
    outputSchema: Joi.string()
        .min(5)
        .max(2000)
        .required()
        .custom((value, helpers) => {
            try {
                JSON.parse(value);
                return value;
            } catch (error) {
                return helpers.error('outputSchema.invalid');
            }
        })
        .messages({
            'string.min': 'Output schema must be at least 5 characters long',
            'string.max': 'Output schema must be less than 2000 characters',
            'any.required': 'Output schema is required',
            'outputSchema.invalid': 'Output schema must be valid JSON format'
        })
});

/**
 * Advanced URL validation with additional security checks
 * @param {string} url - URL to validate
 * @returns {Object} Validation result with details
 */
function validateUrl(url) {
    try {
        const urlObj = new URL(url);
        
        // Basic protocol check
        if (!['http:', 'https:'].includes(urlObj.protocol)) {
            return {
                isValid: false,
                error: 'URL must use HTTP or HTTPS protocol'
            };
        }

        // Check for localhost/private IP addresses
        const hostname = urlObj.hostname.toLowerCase();
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.startsWith('172.')) {
            return {
                isValid: false,
                error: 'Local and private network URLs are not allowed for security reasons'
            };
        }

        // Check for suspicious patterns
        if (hostname.includes('..') || url.includes('..')) {
            return {
                isValid: false,
                error: 'URL contains suspicious patterns'
            };
        }

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: 'Invalid URL format'
        };
    }
}

/**
 * Validate extraction request for common issues
 * @param {string} extractionRequest - The extraction request to validate
 * @returns {Object} Validation result
 */
function validateExtractionRequest(extractionRequest) {
    // Check for potentially harmful patterns
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /eval\(/i,
        /document\./i,
        /window\./i
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(extractionRequest)) {
            return {
                isValid: false,
                error: 'Extraction request contains potentially unsafe content'
            };
        }
    }

    return { isValid: true };
}

/**
 * Validate output schema format and structure
 * @param {string} outputSchema - The output schema to validate
 * @returns {Object} Validation result
 */
function validateOutputSchema(outputSchema) {
    try {
        const parsed = JSON.parse(outputSchema);
        
        // Check if it's an object (not array or primitive)
        if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
            return {
                isValid: false,
                error: 'Output schema must be a JSON object, not an array or primitive value'
            };
        }

        // Check for reasonable complexity (not too nested)
        const depth = getObjectDepth(parsed);
        if (depth > 5) {
            return {
                isValid: false,
                error: 'Output schema is too deeply nested (maximum 5 levels allowed)'
            };
        }

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: 'Output schema must be valid JSON format'
        };
    }
}

/**
 * Calculate the maximum depth of a nested object
 * @param {Object} obj - Object to analyze
 * @returns {number} Maximum depth
 */
function getObjectDepth(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return 0;
    }
    
    let maxDepth = 1;
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            maxDepth = Math.max(maxDepth, 1 + getObjectDepth(obj[key]));
        }
    }
    
    return maxDepth;
}

/**
 * Main validation function for scrape command inputs
 * @param {Object} input - Input object containing url, extractionRequest, outputSchema
 * @returns {Object} Validation result with isValid flag and error message
 */
function validateScrapeInput(input) {
    // Joi schema validation
    const { error, value } = scrapeInputSchema.validate(input, { abortEarly: false });
    
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join('; ');
        logger.warn('Scrape input validation failed (Joi)', { 
            input: { 
                url: input.url, 
                extractionLength: input.extractionRequest?.length,
                schemaLength: input.outputSchema?.length 
            }, 
            error: errorMessage 
        });
        
        return {
            isValid: false,
            error: errorMessage
        };
    }

    // Additional URL validation
    const urlValidation = validateUrl(value.url);
    if (!urlValidation.isValid) {
        return urlValidation;
    }

    // Additional extraction request validation
    const extractionValidation = validateExtractionRequest(value.extractionRequest);
    if (!extractionValidation.isValid) {
        return extractionValidation;
    }

    // Additional output schema validation
    const schemaValidation = validateOutputSchema(value.outputSchema);
    if (!schemaValidation.isValid) {
        return schemaValidation;
    }

    return { isValid: true, value };
}

module.exports = {
    validateScrapeInput,
    validateUrl,
    validateExtractionRequest,
    validateOutputSchema,
    scrapeInputSchema
};
