/**
 * Services Module Index
 * 
 * Central export point for all service modules.
 * Provides easy access to routing, monitoring, and other service components.
 * 
 * @module Services
 */

const N8NRouter = require('./n8nRouter');
const RequestHandler = require('./requestHandler');
const CircuitBreakerManager = require('./circuitBreakerManager');
const EndpointManager = require('./endpointManager');
const RoutingTableBuilder = require('./routingTableBuilder');

/**
 * Service factory and management
 */
class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialized = false;
  }

  /**
   * Initialize all services
   * @param {Object} config - Service configuration options
   */
  async initialize(config = {}) {
    if (this.initialized) {
      throw new Error('Services already initialized');
    }

    try {
      // Initialize N8N Router
      const n8nRouter = new N8NRouter(config.n8nRouter || {});
      this.services.set('n8nRouter', n8nRouter);

      // Set up service event forwarding if needed
      n8nRouter.on('service:initialized', (data) => {
        console.log('[N8NRouter] Service initialized:', data);
      });

      n8nRouter.on('command:routed', (data) => {
        console.log('[N8NRouter] Command routed:', data);
      });

      n8nRouter.on('circuit:open', (data) => {
        console.warn('[N8NRouter] Circuit breaker opened:', data);
      });

      n8nRouter.on('command:error', (data) => {
        console.error('[N8NRouter] Command error:', data);
      });

      this.initialized = true;
      console.log('[ServiceManager] All services initialized successfully');

      return this;
    } catch (error) {
      console.error('[ServiceManager] Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * Get a specific service
   * @param {string} serviceName - Name of the service to retrieve
   * @returns {Object} The requested service instance
   */
  getService(serviceName) {
    if (!this.initialized) {
      throw new Error('Services not initialized. Call initialize() first.');
    }

    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    return service;
  }

  /**
   * Get the N8N Router service
   * @returns {N8NRouter} The N8N router instance
   */
  getN8NRouter() {
    return this.getService('n8nRouter');
  }

  /**
   * Check health of all services
   * @returns {Promise<Object>} Health status of all services
   */
  async healthCheck() {
    if (!this.initialized) {
      return { healthy: false, error: 'Services not initialized' };
    }

    const results = {};

    try {
      // Check N8N Router health
      const n8nRouter = this.getN8NRouter();
      results.n8nRouter = {
        healthy: true,
        stats: n8nRouter.getStats()
      };
    } catch (error) {
      results.n8nRouter = {
        healthy: false,
        error: error.message
      };
    }

    const overallHealthy = Object.values(results).every(result => result.healthy);

    return {
      healthy: overallHealthy,
      timestamp: new Date().toISOString(),
      services: results
    };
  }

  /**
   * Graceful shutdown of all services
   */
  async shutdown() {
    if (!this.initialized) {
      return;
    }

    console.log('[ServiceManager] Shutting down services...');

    try {
      // Shutdown N8N Router
      const n8nRouter = this.services.get('n8nRouter');
      if (n8nRouter) {
        await n8nRouter.shutdown();
      }

      this.services.clear();
      this.initialized = false;

      console.log('[ServiceManager] All services shut down successfully');
    } catch (error) {
      console.error('[ServiceManager] Error during shutdown:', error);
      throw error;
    }
  }
}

// Create singleton instance
const serviceManager = new ServiceManager();

module.exports = {
  N8NRouter,
  RequestHandler,
  CircuitBreakerManager,
  EndpointManager,
  RoutingTableBuilder,
  ServiceManager,
  serviceManager
};
