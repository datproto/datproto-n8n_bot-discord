/**
 * Configuration Schema Definitions
 * Joi validation schemas for Discord N8N Bot configuration
 */

const Joi = require('joi');

// Endpoint configuration schema
const endpointSchema = Joi.object({
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .description('N8N webhook endpoint URL'),

  timeout: Joi.number()
    .integer()
    .min(1000)
    .max(300000)
    .default(30000)
    .description('Request timeout in milliseconds'),

  retries: Joi.number()
    .integer()
    .min(0)
    .max(10)
    .default(3)
    .description('Number of retry attempts'),

  priority: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(1)
    .description('Endpoint priority (higher = more priority)'),

  enabled: Joi.boolean()
    .default(true)
    .description('Whether endpoint is enabled')
});

// Environment configuration schema
const environmentSchema = Joi.object({
  overrides: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .optional()
    .description('Environment-specific configuration overrides'),

  logLevel: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .default('info')
    .description('Logging level for this environment'),

  healthCheckInterval: Joi.number()
    .integer()
    .min(5000)
    .max(3600000)
    .default(60000)
    .description('Health check interval in milliseconds')
});

// Rate limiting configuration schema
const rateLimitingSchema = Joi.object({
  perUser: Joi.number()
    .integer()
    .min(1)
    .max(1000)
    .default(10)
    .description('Requests per user per window'),

  global: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(100)
    .description('Global requests per window'),

  windowMs: Joi.number()
    .integer()
    .min(1000)
    .max(3600000)
    .default(60000)
    .description('Rate limiting window in milliseconds')
});

// Queue configuration schema
const queueSchema = Joi.object({
  maxSize: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1000)
    .description('Maximum queue size'),

  concurrency: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(5)
    .description('Maximum concurrent requests')
});

// Monitoring configuration schema
const monitoringSchema = Joi.object({
  enabled: Joi.boolean()
    .default(true)
    .description('Whether monitoring is enabled'),

  metricsRetention: Joi.number()
    .integer()
    .min(3600000)
    .max(2592000000)
    .default(86400000)
    .description('Metrics retention period in milliseconds')
});

// Global configuration schema
const globalSchema = Joi.object({
  rateLimiting: rateLimitingSchema.required(),
  queue: queueSchema.required(),
  monitoring: monitoringSchema.required()
});

// Main configuration schema
const configSchema = Joi.object({
  endpoints: Joi.object()
    .pattern(
      Joi.string().pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/), // Valid command names
      endpointSchema
    )
    .min(1)
    .required()
    .description('Command endpoint configurations'),

  environments: Joi.object({
    development: environmentSchema.required(),
    staging: environmentSchema.required(),
    production: environmentSchema.required()
  }).required(),

  global: globalSchema.required()
});

// Environment variables schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),

  DISCORD_TOKEN: Joi.string()
    .required()
    .description('Discord bot token'),

  LOG_LEVEL: Joi.string()
    .valid('debug', 'info', 'warn', 'error')
    .optional(),

  RATE_LIMIT_PER_USER: Joi.number()
    .integer()
    .min(1)
    .optional(),

  RATE_LIMIT_GLOBAL: Joi.number()
    .integer()
    .min(1)
    .optional()
}).pattern(
  // Allow dynamic N8N endpoint URLs via environment variables
  /^N8N_[A-Z_]+_URL$/,
  Joi.string().uri({ scheme: ['http', 'https'] })
).pattern(
  // Allow dynamic endpoint timeouts
  /^N8N_[A-Z_]+_TIMEOUT$/,
  Joi.number().integer().min(1000).max(300000)
);

module.exports = {
  configSchema,
  endpointSchema,
  environmentSchema,
  rateLimitingSchema,
  queueSchema,
  monitoringSchema,
  globalSchema,
  envSchema
};
