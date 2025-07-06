const { EventEmitter } = require('events');
class ConcurrentRequestManager extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      maxConcurrentRequests: config.maxConcurrentRequests || 10,
      queueSize: config.queueSize || 50,
      queueTimeout: config.queueTimeout || 30000,
      enableQueuing: config.enableQueuing !== false,
      ...config
    };
    this.activeRequests = new Map();
    this.requestQueue = [];
    this.stats = {
      totalRequests: 0,
      activeCount: 0,
      queuedCount: 0,
      rejectedCount: 0,
      timeoutCount: 0,
      avgProcessingTime: 0
    };
  }
  async executeRequest(requestId, requestFunction, options = {}) {
    this.stats.totalRequests++;
    if (this.canExecuteImmediately()) {
      return this.executeImmediately(requestId, requestFunction, options);
    }

    // Queue request if queuing is enabled
    if (this.config.enableQueuing && this.canQueue()) {
      return this.queueRequest(requestId, requestFunction, options);
    }

    // Reject if no capacity
    this.stats.rejectedCount++;
    this.emit('request:rejected', { requestId, reason: 'capacity_exceeded' });
    throw new Error('Maximum concurrent requests exceeded and queue is full');
  }

  canExecuteImmediately() {
    return this.activeRequests.size < this.config.maxConcurrentRequests;
  }
  canQueue() {
    return this.requestQueue.length < this.config.queueSize;
  }
  async executeImmediately(requestId, requestFunction, options) {
    const startTime = Date.now();
    this.activeRequests.set(requestId, {
      startTime,
      options
    });

    this.stats.activeCount = this.activeRequests.size;
    this.emit('request:started', { requestId, queueTime: 0 });

    try {
      const result = await requestFunction();

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);

      this.emit('request:completed', { requestId, processingTime });
      return result;

    } catch (error) {
      this.emit('request:failed', { requestId, error: error.message });
      throw error;

    } finally {
      this.activeRequests.delete(requestId);
      this.stats.activeCount = this.activeRequests.size;

      // Process queue if there are waiting requests
      this.processQueue();
    }
  }

  /**
   * Queue a request for later execution
   * @param {string} requestId - Request identifier
   * @param {Function} requestFunction - Function to execute
   * @param {Object} options - Request options
   * @returns {Promise<*>} Request result
   */
  async queueRequest(requestId, requestFunction, options) {
    return new Promise((resolve, reject) => {
      const queueStartTime = Date.now();

      // Create queue entry
      const queueEntry = {
        requestId,
        requestFunction,
        options,
        queueStartTime,
        resolve,
        reject,
        timeout: null
      };

      // Set timeout for queued request
      if (this.config.queueTimeout > 0) {
        queueEntry.timeout = setTimeout(() => {
          this.removeFromQueue(requestId);
          this.stats.timeoutCount++;
          this.emit('request:timeout', { requestId, queueTime: Date.now() - queueStartTime });
          reject(new Error('Request timeout while queued'));
        }, this.config.queueTimeout);
      }

      // Add to queue
      this.requestQueue.push(queueEntry);
      this.stats.queuedCount = this.requestQueue.length;

      this.emit('request:queued', { requestId, queuePosition: this.requestQueue.length });
    });
  }

  /**
   * Process the next request in queue
   */
  async processQueue() {
    if (this.requestQueue.length === 0 || !this.canExecuteImmediately()) {
      return;
    }

    const queueEntry = this.requestQueue.shift();
    this.stats.queuedCount = this.requestQueue.length;

    // Clear timeout
    if (queueEntry.timeout) {
      clearTimeout(queueEntry.timeout);
    }

    try {
      const queueTime = Date.now() - queueEntry.queueStartTime;
      this.emit('request:dequeued', { requestId: queueEntry.requestId, queueTime });

      const result = await this.executeImmediately(
        queueEntry.requestId,
        queueEntry.requestFunction,
        queueEntry.options
      );

      queueEntry.resolve(result);
    } catch (error) {
      queueEntry.reject(error);
    }
  }

  /**
   * Remove request from queue
   * @param {string} requestId - Request identifier to remove
   */
  removeFromQueue(requestId) {
    const index = this.requestQueue.findIndex(entry => entry.requestId === requestId);
    if (index !== -1) {
      const entry = this.requestQueue.splice(index, 1)[0];
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
      this.stats.queuedCount = this.requestQueue.length;
    }
  }

  /**
   * Update average processing time statistics
   * @param {number} processingTime - Processing time in milliseconds
   */
  updateProcessingTime(processingTime) {
    if (this.stats.avgProcessingTime === 0) {
      this.stats.avgProcessingTime = processingTime;
    } else {
      // Simple moving average approximation
      this.stats.avgProcessingTime = Math.round(
        (this.stats.avgProcessingTime * 0.7) + (processingTime * 0.3)
      );
    }
  }

  /**
   * Get current statistics
   * @returns {Object} Current request statistics
   */
  getStats() {
    return {
      ...this.stats,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      maxQueueSize: this.config.queueSize,
      utilizationPercent: Math.round((this.stats.activeCount / this.config.maxConcurrentRequests) * 100),
      queueUtilizationPercent: Math.round((this.stats.queuedCount / this.config.queueSize) * 100)
    };
  }

  /**
   * Get detailed status information
   * @returns {Object} Detailed status information
   */
  getDetailedStatus() {
    return {
      stats: this.getStats(),
      activeRequests: Array.from(this.activeRequests.keys()),
      queuedRequests: this.requestQueue.map(entry => ({
        requestId: entry.requestId,
        queueTime: Date.now() - entry.queueStartTime
      })),
      config: this.config
    };
  }

  /**
   * Shutdown manager and clear all requests
   */
  shutdown() {
    // Clear queue timeouts
    this.requestQueue.forEach(entry => {
      if (entry.timeout) {
        clearTimeout(entry.timeout);
      }
      entry.reject(new Error('Service shutting down'));
    });

    this.requestQueue = [];
    this.activeRequests.clear();
    this.stats.activeCount = 0;
    this.stats.queuedCount = 0;

    this.emit('manager:shutdown');
  }
}

module.exports = ConcurrentRequestManager;
