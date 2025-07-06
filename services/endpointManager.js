/**
 * Endpoint Manager Module
 * 
 * Manages endpoint configurations and routing logic.
 * Handles command-to-endpoint mapping with environment-specific overrides.
 * 
 * @module EndpointManager
 */

const { EventEmitter } = require('events');
const configManager = require('../config');
const RoutingTableBuilder = require('./routingTableBuilder');

/**
 * Endpoint Manager Class
 * Handles endpoint configuration and command-to-endpoint routing
 */
class EndpointManager extends EventEmitter {
  constructor() {
    super();
    this.endpointsConfig = {};
    this.environmentsConfig = {};
    this.globalConfig = {};
    this.routingBuilder = new RoutingTableBuilder();

    this.setupEventForwarding();
    this.initializeEndpoints();
    this.buildRoutingTable();
  }

  setupEventForwarding() {
    this.routingBuilder.on('route:registered', (data) => this.emit('route:registered', data));
    this.routingBuilder.on('routing:table:built', (data) => this.emit('routing:table:built', data));
  }

  initializeEndpoints() {
    try {
      // Get the complete configuration and individual endpoints
      const completeConfig = configManager.getCompleteConfig();
      const allEndpoints = configManager.getAllEndpoints();

      if (allEndpoints) {
        this.endpointsConfig = allEndpoints;
      }

      // Try to load the raw endpoints file for environment config
      try {
        const fs = require('fs');
        const path = require('path');
        const endpointsPath = path.join(process.cwd(), 'config', 'endpoints.json');
        const rawConfig = JSON.parse(fs.readFileSync(endpointsPath, 'utf8'));
        this.environmentsConfig = rawConfig.environments || {};
        this.globalConfig = rawConfig.global || {};
      } catch (rawError) {
        console.warn('Could not load raw endpoints config:', rawError.message);
        this.environmentsConfig = {};
        this.globalConfig = {};
      }

      this.emit('endpoints:initialized', {
        count: Object.keys(this.endpointsConfig).length,
        environments: Object.keys(this.environmentsConfig).length
      });
    } catch (error) {
      this.emit('endpoints:error', { error: error.message });
      this.endpointsConfig = {};
      this.environmentsConfig = {};
      this.globalConfig = {};
    }
  }

  buildRoutingTable() {
    this.routingBuilder.buildRoutingTable(this.endpointsConfig, this.environmentsConfig);
  }

  getEndpointConfig(commandType) {
    if (!commandType) {
      this.emit('endpoint:invalid_command', { commandType });
      return null;
    }

    const config = this.routingBuilder.getRoute(commandType);

    if (!config) {
      this.emit('endpoint:not_found', { commandType });
      return null;
    }

    if (!config.enabled) {
      this.emit('endpoint:disabled', { commandType });
      return null;
    }

    this.emit('endpoint:resolved', {
      commandType,
      environment: config.environment,
      url: config.url
    });

    return config;
  }

  routeCommand(commandType, options = {}) {
    const config = this.getEndpointConfig(commandType);
    if (!config) return null;

    const routingInfo = {
      commandType,
      endpoint: {
        url: config.url,
        method: config.method || 'POST',
        timeout: config.timeout || 30000,
        retries: config.retries || 3,
        priority: config.priority || 1,
        headers: {
          'Content-Type': 'application/json',
          'X-Command-Type': commandType,
          'X-Environment': config.environment,
          'X-Request-Id': this.generateRequestId(),
          ...config.headers,
          ...options.headers
        }
      },
      routing: {
        environment: config.environment,
        priority: config.priority || 1,
        lastUpdated: config.lastUpdated,
        routingStrategy: options.routingStrategy || 'default'
      },
      metadata: {
        commandType,
        timestamp: new Date().toISOString(),
        routeId: `${commandType}-${Date.now()}`
      }
    };

    this.emit('command:routed', routingInfo.metadata);
    return routingInfo;
  }

  getAvailableCommands() {
    return this.routingBuilder.getAvailableCommands();
  }

  getEnabledCommands() {
    return this.routingBuilder.getEnabledCommands();
  }

  isCommandSupported(commandType) {
    return this.routingBuilder.isCommandSupported(commandType);
  }

  getCommandsByPriority(priority) {
    return this.routingBuilder.getCommandsByPriority(priority);
  }

  setEndpointConfig(commandType, config) {
    this.endpointsConfig[commandType] = {
      ...this.endpointsConfig[commandType],
      ...config
    };

    this.buildRoutingTable();
    this.emit('endpoint:updated', { commandType });
  }

  removeEndpointConfig(commandType) {
    if (this.endpointsConfig[commandType]) {
      delete this.endpointsConfig[commandType];
      this.buildRoutingTable();
      this.emit('endpoint:removed', { commandType });
      return true;
    }
    return false;
  }

  reloadEndpoints() {
    const oldCount = this.routingBuilder.getAvailableCommands().length;
    this.initializeEndpoints();
    this.buildRoutingTable();
    const newCount = this.routingBuilder.getAvailableCommands().length;

    this.emit('endpoints:reloaded', {
      oldCount,
      newCount,
      changed: oldCount !== newCount
    });
  }

  generateRequestId() {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  getStats() {
    const routingStats = this.routingBuilder.getStats();

    return {
      ...routingStats,
      globalConfig: this.globalConfig,
      routingTable: Object.fromEntries(this.routingBuilder.getAllRoutes())
    };
  }
}

module.exports = EndpointManager;
