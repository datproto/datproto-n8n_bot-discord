/**
 * Default Configuration Values
 * Fallback configuration when endpoints.json is missing or invalid
 */

const defaultConfig = {
  endpoints: {
    scrape: {
      url: 'http://localhost:5678/webhook/scrape',
      timeout: 30000,
      retries: 3,
      priority: 1,
      enabled: true
    },
    analyze: {
      url: 'http://localhost:5678/webhook/analyze',
      timeout: 45000,
      retries: 2,
      priority: 2,
      enabled: true
    },
    monitor: {
      url: 'http://localhost:5678/webhook/monitor',
      timeout: 60000,
      retries: 2,
      priority: 3,
      enabled: true
    },
    notify: {
      url: 'http://localhost:5678/webhook/notify',
      timeout: 15000,
      retries: 1,
      priority: 1,
      enabled: true
    }
  },
  environments: {
    development: {
      overrides: {},
      logLevel: 'debug',
      healthCheckInterval: 30000
    },
    staging: {
      overrides: {},
      logLevel: 'info',
      healthCheckInterval: 60000
    },
    production: {
      overrides: {},
      logLevel: 'warn',
      healthCheckInterval: 120000
    }
  },
  global: {
    rateLimiting: {
      perUser: 10,
      global: 100,
      windowMs: 60000
    },
    queue: {
      maxSize: 1000,
      concurrency: 5
    },
    monitoring: {
      enabled: true,
      metricsRetention: 86400000
    }
  }
};

/**
 * Get default configuration for a specific environment
 * @param {string} environment - Environment name
 * @returns {Object} Default configuration
 */
function getDefaultConfig(environment = 'development') {
  const config = JSON.parse(JSON.stringify(defaultConfig)); // Deep clone

  // Apply environment-specific defaults if needed
  const envConfig = config.environments[environment];
  if (!envConfig) {
    console.warn(`Unknown environment: ${environment}, using development defaults`);
    return config;
  }

  return config;
}

/**
 * Get minimal working configuration
 * Used when all other loading methods fail
 * @returns {Object} Minimal configuration
 */
function getMinimalConfig() {
  return {
    endpoints: {
      scrape: {
        url: 'http://localhost:5678/webhook/scrape',
        timeout: 30000,
        retries: 1,
        priority: 1,
        enabled: true
      }
    },
    environments: {
      development: {
        overrides: {},
        logLevel: 'info',
        healthCheckInterval: 60000
      },
      staging: {
        overrides: {},
        logLevel: 'info',
        healthCheckInterval: 60000
      },
      production: {
        overrides: {},
        logLevel: 'warn',
        healthCheckInterval: 120000
      }
    },
    global: {
      rateLimiting: {
        perUser: 5,
        global: 50,
        windowMs: 60000
      },
      queue: {
        maxSize: 100,
        concurrency: 1
      },
      monitoring: {
        enabled: false,
        metricsRetention: 3600000
      }
    }
  };
}

/**
 * Get default endpoint configuration for a command
 * @param {string} commandName - Command name
 * @returns {Object} Default endpoint configuration
 */
function getDefaultEndpoint(commandName) {
  const defaults = getDefaultConfig();
  return defaults.endpoints[commandName] || {
    url: `http://localhost:5678/webhook/${commandName}`,
    timeout: 30000,
    retries: 1,
    priority: 1,
    enabled: true
  };
}

module.exports = {
  defaultConfig,
  getDefaultConfig,
  getMinimalConfig,
  getDefaultEndpoint
};
