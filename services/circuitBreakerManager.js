/**
 * Circuit Breaker Manager Module
 * 
 * Manages circuit breakers for different endpoints to prevent cascading failures.
 * 
 * @module CircuitBreakerManager
 */

const CircuitBreaker = require('opossum');
const { EventEmitter } = require('events');

/**
 * Circuit Breaker Manager Class
 * Creates and manages circuit breakers for endpoints
 */
class CircuitBreakerManager extends EventEmitter {
  constructor(config = {}) {
    super();

    this.config = {
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 60000,
      ...config
    };

    this.circuitBreakers = new Map();
    this.stats = {
      circuitBreakerTrips: 0
    };
  }

  /**
   * Create circuit breaker for a specific endpoint
   * @param {string} endpointKey - The endpoint identifier
   * @param {Function} executeFunction - The function to wrap with circuit breaker
   * @returns {CircuitBreaker} The created circuit breaker
   */
  createCircuitBreaker(endpointKey, executeFunction) {
    const breakerOptions = {
      timeout: this.config.circuitBreakerTimeout,
      errorThresholdPercentage: 50,
      resetTimeout: this.config.circuitBreakerTimeout,
      volumeThreshold: this.config.circuitBreakerThreshold
    };

    const breaker = new CircuitBreaker(executeFunction, breakerOptions);

    // Circuit breaker event handlers
    breaker.on('open', () => {
      this.stats.circuitBreakerTrips++;
      this.emit('circuit:open', { endpoint: endpointKey });
    });

    breaker.on('halfOpen', () => {
      this.emit('circuit:halfOpen', { endpoint: endpointKey });
    });

    breaker.on('close', () => {
      this.emit('circuit:close', { endpoint: endpointKey });
    });

    breaker.on('failure', (error) => {
      this.emit('circuit:failure', { endpoint: endpointKey, error: error.message });
    });

    breaker.on('success', () => {
      this.emit('circuit:success', { endpoint: endpointKey });
    });

    this.circuitBreakers.set(endpointKey, breaker);
    this.emit('circuit:created', { endpoint: endpointKey });

    return breaker;
  }

  /**
   * Get circuit breaker for an endpoint
   * @param {string} endpointKey - The endpoint identifier
   * @returns {CircuitBreaker|null} The circuit breaker or null if not found
   */
  getCircuitBreaker(endpointKey) {
    return this.circuitBreakers.get(endpointKey) || null;
  }

  /**
   * Remove circuit breaker for an endpoint
   * @param {string} endpointKey - The endpoint identifier
   * @returns {boolean} True if removed, false if not found
   */
  removeCircuitBreaker(endpointKey) {
    const removed = this.circuitBreakers.delete(endpointKey);
    if (removed) {
      this.emit('circuit:removed', { endpoint: endpointKey });
    }
    return removed;
  }

  /**
   * Get all circuit breaker states
   * @returns {Array} Array of circuit breaker states
   */
  getAllStates() {
    return Array.from(this.circuitBreakers.keys()).map(key => ({
      endpoint: key,
      state: this.circuitBreakers.get(key).state,
      stats: this.circuitBreakers.get(key).stats
    }));
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    this.circuitBreakers.forEach((breaker, key) => {
      breaker.close();
      this.emit('circuit:reset', { endpoint: key });
    });
  }

  /**
   * Get circuit breaker statistics
   * @returns {Object} Circuit breaker statistics
   */
  getStats() {
    return {
      ...this.stats,
      totalBreakers: this.circuitBreakers.size,
      breakerStates: this.getAllStates()
    };
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown() {
    this.circuitBreakers.clear();
    this.emit('manager:shutdown');
  }
}

module.exports = CircuitBreakerManager;
