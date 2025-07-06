/**
 * N8N Routing Service Layer
 * 
 * Centralized service for routing Discord commands to appropriate N8N webhook endpoints.
 * Implements retry logic, circuit breaker pattern, timeout handling, and response transformation.
 * 
 * @module N8NRouter
 */

const { EventEmitter } = require('events');
const RequestHandler = require('./requestHandler');
const CircuitBreakerManager = require('./circuitBreakerManager');
const EndpointManager = require('./endpointManager');

/**
 * N8N Router Service Class
 * Orchestrates routing of Discord commands to N8N webhook endpoints with resilience patterns
 */
class N8NRouter extends EventEmitter {
  constructor(options = {}) {
    super();

    // Configuration defaults
    this.config = {
      maxConcurrentRequests: options.maxConcurrentRequests || 10,
      ...options
    };

    // Initialize state
    this.activeRequests = new Set();

    // Initialize component services
    this.requestHandler = new RequestHandler(options);
    this.circuitBreakerManager = new CircuitBreakerManager(options);
    this.endpointManager = new EndpointManager();

    // Set up event forwarding
    this.setupEventForwarding();

    // Initialize circuit breakers for configured endpoints
    this.initializeCircuitBreakers();

    this.emit('service:initialized', { timestamp: new Date().toISOString() });
  }

  setupEventForwarding() {
    // Forward request handler events
    this.requestHandler.on('request:start', (data) => this.emit('request:start', data));
    this.requestHandler.on('request:success', (data) => this.emit('request:success', data));
    this.requestHandler.on('request:failure', (data) => this.emit('request:failure', data));

    // Forward circuit breaker events
    this.circuitBreakerManager.on('circuit:open', (data) => this.emit('circuit:open', data));
    this.circuitBreakerManager.on('circuit:close', (data) => this.emit('circuit:close', data));
    this.circuitBreakerManager.on('circuit:halfOpen', (data) => this.emit('circuit:halfOpen', data));

    // Forward endpoint manager events
    this.endpointManager.on('endpoints:initialized', (data) => this.emit('endpoints:initialized', data));
    this.endpointManager.on('endpoint:not_found', (data) => this.emit('endpoint:not_found', data));
  }

  initializeCircuitBreakers() {
    const availableCommands = this.endpointManager.getAvailableCommands();
    availableCommands.forEach(commandType => {
      this.circuitBreakerManager.createCircuitBreaker(
        commandType,
        this.requestHandler.executeRequest.bind(this.requestHandler)
      );
    });
  }

  /**
   * Route a command to the appropriate N8N endpoint
   * @param {string} commandType - The type of command to route
   * @param {Object} payload - The payload to send
   * @param {Object} options - Additional routing options
   * @returns {Promise<Object>} The response from the N8N endpoint
   */
  async routeCommand(commandType, payload, options = {}) {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Check concurrent request limit
      if (this.activeRequests.size >= this.config.maxConcurrentRequests) {
        throw new Error('Maximum concurrent requests exceeded');
      }

      // Add to active requests
      this.activeRequests.add(requestId);

      // Get routing information using enhanced endpoint manager
      const routingInfo = this.endpointManager.routeCommand(commandType, options);
      if (!routingInfo) {
        throw new Error(`No endpoint configured for command type: ${commandType}`);
      }

      // Check if command is supported and enabled
      const supportStatus = this.endpointManager.isCommandSupported(commandType);
      if (!supportStatus.supported) {
        throw new Error(`Command '${commandType}' is ${supportStatus.reason}`);
      }

      // Get or create circuit breaker for endpoint
      let circuitBreaker = this.circuitBreakerManager.getCircuitBreaker(commandType);
      if (!circuitBreaker) {
        circuitBreaker = this.circuitBreakerManager.createCircuitBreaker(
          commandType,
          this.requestHandler.executeRequest.bind(this.requestHandler)
        );
      }

      // Prepare request configuration using routing info
      const requestConfig = {
        method: routingInfo.endpoint.method,
        url: routingInfo.endpoint.url,
        data: payload,
        headers: routingInfo.endpoint.headers,
        timeout: routingInfo.endpoint.timeout,
        metadata: {
          ...routingInfo.metadata,
          requestId,
          startTime
        }
      };

      this.emit('command:routing', {
        requestId,
        commandType,
        routingInfo: routingInfo.routing,
        url: routingInfo.endpoint.url
      });

      // Execute request through circuit breaker
      const response = await circuitBreaker.fire(requestConfig);

      // Transform response with routing metadata
      const transformedResponse = this.requestHandler.transformResponse(response, commandType);
      transformedResponse.routing = routingInfo.routing;
      transformedResponse.requestId = requestId;

      this.emit('command:routed', {
        requestId,
        commandType,
        success: true,
        responseTime: Date.now() - startTime,
        priority: routingInfo.routing.priority,
        environment: routingInfo.routing.environment
      });

      return transformedResponse;

    } catch (error) {
      this.emit('command:error', {
        requestId,
        commandType,
        error: error.message,
        responseTime: Date.now() - startTime
      });
      throw error;
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Health check for a specific endpoint
   * @param {string} endpointKey - The endpoint to check
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck(endpointKey) {
    const routingInfo = this.endpointManager.routeCommand(endpointKey);
    if (!routingInfo) {
      return { healthy: false, error: 'Endpoint not configured' };
    }

    const healthUrl = routingInfo.endpoint.healthUrl || routingInfo.endpoint.url;
    const result = await this.requestHandler.healthCheck(healthUrl);

    return {
      ...result,
      endpoint: endpointKey,
      environment: routingInfo.routing.environment,
      priority: routingInfo.routing.priority
    };
  }

  /**
   * Generate unique request ID
   * @returns {string} Unique request identifier
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   * @returns {Object} Current service statistics
   */
  getStats() {
    return {
      ...this.requestHandler.getStats(),
      ...this.circuitBreakerManager.getStats(),
      ...this.endpointManager.getStats(),
      activeRequests: this.activeRequests.size
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    this.emit('service:shutdown:start');

    // Wait for active requests to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeRequests.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Shutdown component services
    this.circuitBreakerManager.shutdown();

    this.emit('service:shutdown:complete', {
      remainingRequests: this.activeRequests.size
    });
  }
}

module.exports = N8NRouter;
