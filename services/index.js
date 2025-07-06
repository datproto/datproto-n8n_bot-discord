const N8NRouter = require('./n8nRouter');
const RequestHandler = require('./requestHandler');
const CircuitBreakerManager = require('./circuitBreakerManager');
const EndpointManager = require('./endpointManager');
const RoutingTableBuilder = require('./routingTableBuilder');
const HealthMonitor = require('./healthMonitor');
const ConcurrentRequestManager = require('./concurrentRequestManager');
const { logger, correlation } = require('../lib/logging');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.initialized = false;
    this.healthMonitor = null;
    this.concurrentRequestManager = null;
    this.logger = logger.child('ServiceManager');
  }

  async initialize(config = {}) {
    if (this.initialized) {
      throw new Error('Services already initialized');
    }

    const correlationId = correlation.startCorrelation();

    try {
      this.logger.info('Initializing services', { correlationId, config });

      const n8nRouter = new N8NRouter(config.n8nRouter || {});
      this.services.set('n8nRouter', n8nRouter);

      this.healthMonitor = new HealthMonitor(config.healthMonitor || {});
      this.services.set('healthMonitor', this.healthMonitor);

      this.concurrentRequestManager = new ConcurrentRequestManager(config.concurrentRequests || {});
      this.services.set('concurrentRequestManager', this.concurrentRequestManager);

      n8nRouter.on('service:initialized', (data) => {
        this.logger.info('N8N Router service initialized', { correlationId, data });
      });

      n8nRouter.on('command:routed', (data) => {
        this.logger.info('Command routed successfully', { correlationId, data });
      });

      n8nRouter.on('circuit:open', (data) => {
        this.logger.warn('Circuit breaker opened', { correlationId, data });
      });

      n8nRouter.on('command:error', (data) => {
        this.logger.error('Command routing error', { correlationId, data });
      });

      this.initialized = true;
      await this.startHealthMonitoring();
      this.logger.info('All services initialized successfully', { correlationId });

      return this;
    } catch (error) {
      this.logger.error('Failed to initialize services', { correlationId, error });
      throw error;
    } finally {
      correlation.endCorrelation();
    }
  }

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

  getN8NRouter() {
    return this.getService('n8nRouter');
  }

  async startHealthMonitoring() {
    if (!this.healthMonitor) {
      return;
    }

    const correlationId = correlation.startCorrelation();

    try {
      const services = {
        n8nRouter: this.getN8NRouter(),
        requestHandler: this.getN8NRouter()?.requestHandler,
        circuitBreakerManager: this.getN8NRouter()?.circuitBreakerManager
      };

      this.healthMonitor.startMonitoring(services);

      this.healthMonitor.on('health:unhealthy', (data) => {
        this.logger.warn('Unhealthy status detected', { correlationId, overall: data.overall });
      });

      this.healthMonitor.on('monitoring:started', (data) => {
        this.logger.info('Health monitoring started', { correlationId, interval: data.interval });
      });
    } finally {
      correlation.endCorrelation();
    }
  }

  getHealthMonitor() {
    return this.getService('healthMonitor');
  }

  getConcurrentRequestManager() {
    return this.getService('concurrentRequestManager');
  }

  async healthCheck() {
    if (!this.initialized) {
      throw new Error('Services not initialized');
    }

    const correlationId = correlation.startCorrelation();
    
    try {
      const healthStatus = {
        overall: 'healthy',
        services: {},
        timestamp: new Date().toISOString()
      };

      for (const [serviceName, service] of this.services) {
        if (service && typeof service.healthCheck === 'function') {
          healthStatus.services[serviceName] = await service.healthCheck();
        }
      }

      const hasUnhealthyService = Object.values(healthStatus.services)
        .some(status => status && status.status === 'unhealthy');
      
      if (hasUnhealthyService) {
        healthStatus.overall = 'unhealthy';
      }

      this.logger.info('Health check completed', { correlationId, status: healthStatus.overall });
      return healthStatus;
    } catch (error) {
      this.logger.error('Health check failed', { correlationId, error });
      return {
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    } finally {
      correlation.endCorrelation();
    }
  }

  async basicHealthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      initialized: this.initialized,
      services: Array.from(this.services.keys()),
      timestamp: new Date().toISOString()
    };
  }

  async shutdown() {
    if (!this.initialized) {
      return;
    }

    const correlationId = correlation.startCorrelation();
    this.logger.info('Shutting down services', { correlationId });

    try {
      if (this.healthMonitor) {
        this.healthMonitor.stopMonitoring();
        this.logger.info('Health monitoring stopped', { correlationId });
      }

      if (this.concurrentRequestManager) {
        this.concurrentRequestManager.shutdown();
        this.logger.info('Concurrent request manager shut down', { correlationId });
      }

      const n8nRouter = this.services.get('n8nRouter');
      if (n8nRouter) {
        await n8nRouter.shutdown();
        this.logger.info('N8N Router shut down', { correlationId });
      }

      this.services.clear();
      this.healthMonitor = null;
      this.concurrentRequestManager = null;
      this.initialized = false;

      this.logger.info('All services shut down successfully', { correlationId });
    } catch (error) {
      this.logger.error('Error during shutdown', { correlationId, error });
      throw error;
    } finally {
      correlation.endCorrelation();
    }
  }

  getDetailedHealthStatus() {
    if (!this.healthMonitor) {
      return { error: 'Health monitoring not available' };
    }
    return this.healthMonitor.getHealthStatus();
  }

  getConcurrentRequestStats() {
    if (!this.concurrentRequestManager) {
      return { error: 'Concurrent request manager not available' };
    }
    return this.concurrentRequestManager.getDetailedStatus();
  }
}

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
