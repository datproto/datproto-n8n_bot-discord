/**
 * Health Monitor Module
 * @module HealthMonitor
 */

const { EventEmitter } = require('events');

/**
 * Health Monitor Class
 */
class HealthMonitor extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      unhealthyThreshold: config.unhealthyThreshold || 3,
      ...config
    };

    this.healthStatus = new Map();
    this.healthHistory = new Map();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start health monitoring
   * @param {Object} services - Services to monitor
   */
  startMonitoring(services = {}) {
    if (this.isMonitoring) {
      return;
    }

    this.services = services;
    this.isMonitoring = true;

    // Initial health check
    this.performHealthCheck();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    this.emit('monitoring:started', { interval: this.config.healthCheckInterval });
  }
  /**
   * Stop health monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.emit('monitoring:stopped');
  }
  /**
   * Perform comprehensive health check
   * @returns {Promise<Object>} Health check results
   */
  async performHealthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      overall: { healthy: true, status: 'healthy' },
      services: {},
      system: this.getSystemHealth()
    };

    // Check individual services (only if services are available)
    if (this.services && this.services.n8nRouter) {
      results.services.n8nRouter = await this.checkN8NRouterHealth(this.services.n8nRouter);
    }

    if (this.services && this.services.requestHandler) {
      results.services.requestHandler = await this.checkRequestHandlerHealth(this.services.requestHandler);
    }

    if (this.services && this.services.circuitBreakerManager) {
      results.services.circuitBreaker = await this.checkCircuitBreakerHealth(this.services.circuitBreakerManager);
    }

    // Determine overall health
    const serviceHealths = Object.values(results.services);
    results.overall.healthy = serviceHealths.every(service => service.healthy);
    results.overall.status = results.overall.healthy ? 'healthy' : 'unhealthy';

    // Update health status and history
    this.updateHealthStatus('overall', results.overall);
    this.updateHealthHistory(results);

    // Emit health events
    this.emit('health:check', results);
    if (!results.overall.healthy) {
      this.emit('health:unhealthy', results);
    }

    return results;
  }
  /**
   * Check N8N Router health
   * @param {Object} router - N8N Router instance
   * @returns {Promise<Object>} Health status
   */
  async checkN8NRouterHealth(router) {
    try {
      const stats = router.getStats();
      const activeRequests = stats.activeRequests || 0;
      const maxConcurrent = router.config.maxConcurrentRequests || 10;

      return {
        healthy: true,
        status: 'operational',
        metrics: {
          activeRequests,
          maxConcurrentRequests: maxConcurrent,
          utilizationPercent: Math.round((activeRequests / maxConcurrent) * 100),
          totalRequests: stats.totalRequests || 0,
          successfulRequests: stats.successfulRequests || 0,
          failedRequests: stats.failedRequests || 0
        }
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error.message
      };
    }
  }
  /**
   * Check Request Handler health
   * @param {Object} handler - Request Handler instance
   * @returns {Promise<Object>} Health status
   */
  async checkRequestHandlerHealth(handler) {
    try {
      const stats = handler.getStats();

      return {
        healthy: true,
        status: 'operational',
        metrics: {
          totalRequests: stats.total || 0,
          successfulRequests: stats.successful || 0,
          failedRequests: stats.failed || 0,
          successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 100
        }
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error.message
      };
    }
  }
  /**
   * Check Circuit Breaker health
   * @param {Object} manager - Circuit Breaker Manager instance
   * @returns {Promise<Object>} Health status
   */
  async checkCircuitBreakerHealth(manager) {
    try {
      const stats = manager.getStats();
      const hasOpenCircuits = manager.hasOpenCircuits();

      return {
        healthy: !hasOpenCircuits,
        status: hasOpenCircuits ? 'degraded' : 'operational',
        metrics: {
          totalBreakers: stats.totalBreakers || 0,
          circuitBreakerTrips: stats.circuitBreakerTrips || 0,
          openCircuits: manager.getCircuitBreakersByState('open').length,
          closedCircuits: manager.getCircuitBreakersByState('closed').length
        }
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get system-level health metrics
   * @returns {Object} System health metrics
   */
  getSystemHealth() {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      uptime: Math.round(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      nodeVersion: process.version
    };
  }

  /**
   * Update health status for a service
   * @param {string} serviceName - Name of the service
   * @param {Object} status - Health status object
   */
  updateHealthStatus(serviceName, status) {
    this.healthStatus.set(serviceName, {
      ...status,
      lastUpdated: new Date().toISOString()
    });
  }

  /**
   * Update health history
   * @param {Object} healthResult - Complete health check result
   */
  updateHealthHistory(healthResult) {
    const history = this.healthHistory.get('global') || [];
    history.push(healthResult);

    // Keep only last 20 entries
    if (history.length > 20) {
      history.shift();
    }

    this.healthHistory.set('global', history);
  }

  /**
   * Get current health status
   * @returns {Object} Current health status
   */
  getHealthStatus() {
    return {
      status: Object.fromEntries(this.healthStatus),
      history: Object.fromEntries(this.healthHistory),
      monitoring: this.isMonitoring
    };
  }
}
module.exports = HealthMonitor;
