/**
 * Request Handler Module
 * 
 * Handles HTTP request execution, retry logic, and response transformation.
 * 
 * @module RequestHandler
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const { EventEmitter } = require('events');
const ResponseTransformer = require('./responseTransformer');

/**
 * Request Handler Class
 * Manages HTTP requests with retry logic and response transformation
 */
class RequestHandler extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0
    };

    // Initialize response transformer
    this.responseTransformer = new ResponseTransformer();

    this.initializeAxios();
  }

  /**
   * Initialize Axios client with retry logic and interceptors
   */
  initializeAxios() {
    this.httpClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Discord-N8N-Bot/1.0.0'
      }
    });

    // Configure axios-retry for exponential backoff with enhanced retry conditions
    axiosRetry(this.httpClient, {
      retries: this.config.retryAttempts,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        // Standard network or idempotent request errors
        if (axiosRetry.isNetworkOrIdempotentRequestError(error)) {
          return true;
        }

        // HTTP 5xx server errors
        if (error.response && error.response.status >= 500) {
          return true;
        }

        // Additional network/timeout errors that should be retried
        if (error.code) {
          const retryableCodes = [
            'ECONNABORTED',  // Request timeout
            'ENOTFOUND',     // DNS resolution failed
            'ETIMEDOUT',     // Connection timeout
            'ECONNRESET',    // Connection reset
            'EHOSTUNREACH'   // Host unreachable
          ];

          if (retryableCodes.includes(error.code)) {
            return true;
          }
        }

        return false;
      }
    });

    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.requestStats.total++;
        this.emit('request:start', { url: config.url, method: config.method });
        return config;
      },
      (error) => {
        this.emit('request:error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.requestStats.successful++;
        this.emit('request:success', {
          url: response.config.url,
          status: response.status
        });
        return response;
      },
      (error) => {
        this.requestStats.failed++;
        this.emit('request:failure', {
          url: error.config?.url,
          error: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute HTTP request
   * @param {Object} requestConfig - The request configuration
   * @returns {Promise<Object>} The HTTP response
   */
  async executeRequest(requestConfig) {
    return await this.httpClient(requestConfig);
  }

  /**
   * Build request configuration for axios
   * @param {Object} endpointConfig - The endpoint configuration
   * @param {Object} payload - The request payload
   * @param {Object} options - Additional options
   * @returns {Object} The axios request configuration
   */
  buildRequestConfig(endpointConfig, payload, options) {
    return {
      method: endpointConfig.method || 'POST',
      url: endpointConfig.url,
      data: payload,
      headers: {
        ...endpointConfig.headers,
        ...options.headers
      },
      timeout: options.timeout || this.config.timeout,
      startTime: Date.now()
    };
  }

  /**
   * Transform response from N8N endpoint using ResponseTransformer
   * @param {Object} response - The HTTP response
   * @param {string} commandType - The command type
   * @param {Object} options - Additional transformation options
   * @returns {Object} The transformed response
   */
  transformResponse(response, commandType, options = {}) {
    return this.responseTransformer.transformResponse(response, commandType, options);
  }

  /**
   * Health check for a specific endpoint
   * @param {string} url - The endpoint URL to check
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck(url) {
    try {
      const response = await this.httpClient.get(url, {
        timeout: 5000 // Short timeout for health checks
      });

      return {
        healthy: true,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get request statistics
   * @returns {Object} Current request statistics
   */
  getStats() {
    return { ...this.requestStats };
  }
}

module.exports = RequestHandler;
