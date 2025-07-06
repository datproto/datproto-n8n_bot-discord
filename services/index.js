const N8NRouter = require('./n8nRouter');
const RequestHandler = require('./requestHandler');
const CircuitBreakerManager = require('./circuitBreakerManager');
const EndpointManager = require('./endpointManager');
const RoutingTableBuilder = require('./routingTableBuilder');
const HealthMonitor = require('./healthMonitor');
const ConcurrentRequestManager = require('./concurrentRequestManager');
class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.healthMonitor = null;
    this.concurrentRequestManager = null;
  }
  async initialize(config = {}) {
    if (this.initialized) {
      throw new Error('Services already initialized');
    }

    try {
      const n8nRouter = new N8NRouter(config.n8nRouter || {});
      this.services.set('n8nRouter', n8nRouter);
      this.healthMonitor = new HealthMonitor(config.healthMonitor || {});
      this.services.set('healthMonitor', this.healthMonitor);
      this.concurrentRequestManager = new ConcurrentRequestManager(config.concurrentRequests || {});
      this.services.set('concurrentRequestManager', this.concurrentRequestManager);
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

      // Start health monitoring after initialization
      await this.startHealthMonitoring();

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
   * Start health monitoring for all services
   */
  async startHealthMonitoring() {
    if (!this.healthMonitor) {
      return;
    }

    const services = {
      n8nRouter: this.getN8NRouter(),
      requestHandler: this.getN8NRouter()?.requestHandler,
      circuitBreakerManager: this.getN8NRouter()?.circuitBreakerManager
    };

    this.healthMonitor.startMonitoring(services);

    // Set up health event handling
    this.healthMonitor.on('health:unhealthy', (data) => {
      console.warn('[HealthMonitor] Unhealthy status detected:', data.overall);
    });

    this.healthMonitor.on('monitoring:started', (data) => {
      console.log('[HealthMonitor] Health monitoring started with interval:', data.interval + 'ms');
    });
  }

  /**
   * Get health monitor instance
   * @returns {HealthMonitor} Health monitor instance
   */
  getHealthMonitor() {
    return this.healthMonitor;
  }

  /**
   * Get concurrent request manager instance
   * @returns {ConcurrentRequestManager} Concurrent request manager instance
   */
  getConcurrentRequestManager() {
    return this.concurrentRequestManager;
  }

  /**
   * Check health of all services (enhanced version)
   * @returns {Promise<Object>} Comprehensive health status
   */
  async healthCheck() {
    if (!this.initialized) {
      return { healthy: false, error: 'Services not initialized' };
    }

    // Use health monitor if available for comprehensive check
    if (this.healthMonitor) {
      return await this.healthMonitor.performHealthCheck();
    }

    // Fallback to basic health check
    return this.basicHealthCheck();
  }

  /**
   * Basic health check without health monitor
   * @returns {Promise<Object>} Basic health status
   */
  async basicHealthCheck() {
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
      // Stop health monitoring
      if (this.healthMonitor) {
        this.healthMonitor.stopMonitoring();
      }

      // Shutdown concurrent request manager
      if (this.concurrentRequestManager) {
        this.concurrentRequestManager.shutdown();
      }

      // Shutdown N8N Router
      const n8nRouter = this.services.get('n8nRouter');
      if (n8nRouter) {
        await n8nRouter.shutdown();
      }

      this.services.clear();
      this.healthMonitor = null;
      this.concurrentRequestManager = null;
      this.initialized = false;

      console.log('[ServiceManager] All services shut down successfully');
    } catch (error) {
      console.error('[ServiceManager] Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Get detailed health status including history and monitoring data
   * @returns {Object} Detailed health status
   */
  getDetailedHealthStatus() {
    if (!this.healthMonitor) {
      return { error: 'Health monitoring not available' };
    }

    return this.healthMonitor.getHealthStatus();
  }

  /**
   * Get concurrent request statistics
   * @returns {Object} Concurrent request statistics
   */
  getConcurrentRequestStats() {
    if (!this.concurrentRequestManager) {
      return { error: 'Concurrent request manager not available' };
    }

    return this.concurrentRequestManager.getDetailedStatus();
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
  HealthMonitor,
  ConcurrentRequestManager,
  ServiceManager,
  serviceManager
};
