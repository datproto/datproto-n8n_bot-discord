/**
 * Routing Table Builder Module
 * 
 * Handles building and managing the routing table for command-to-endpoint mapping.
 * 
 * @module RoutingTableBuilder
 */

const { EventEmitter } = require('events');

/**
 * Routing Table Builder Class
 * Manages the construction and maintenance of the routing table
 */
class RoutingTableBuilder extends EventEmitter {
  constructor() {
    super();
    this.routingTable = new Map();
  }

  /**
   * Build routing table with environment-specific overrides
   * @param {Object} endpointsConfig - Base endpoints configuration
   * @param {Object} environmentsConfig - Environment-specific configurations
   */
  buildRoutingTable(endpointsConfig, environmentsConfig) {
    this.routingTable.clear();

    const environment = process.env.NODE_ENV || 'development';
    const envOverrides = environmentsConfig[environment]?.overrides?.endpoints || {};

    // Build routing table with environment-specific overrides
    Object.keys(endpointsConfig).forEach(commandType => {
      const baseConfig = endpointsConfig[commandType];
      const overrideConfig = envOverrides[commandType] || {};

      // Merge base config with environment overrides
      const finalConfig = {
        ...baseConfig,
        ...overrideConfig,
        commandType,
        environment,
        lastUpdated: new Date().toISOString()
      };

      this.routingTable.set(commandType, finalConfig);

      this.emit('route:registered', {
        commandType,
        environment,
        url: finalConfig.url,
        enabled: finalConfig.enabled
      });
    });

    this.emit('routing:table:built', {
      routes: this.routingTable.size,
      environment
    });

    return this.routingTable;
  }

  /**
   * Get route configuration from routing table
   * @param {string} commandType - The command type
   * @returns {Object|null} The route configuration
   */
  getRoute(commandType) {
    return this.routingTable.get(commandType) || null;
  }

  /**
   * Get all routes from routing table
   * @returns {Map} The complete routing table
   */
  getAllRoutes() {
    return new Map(this.routingTable);
  }

  /**
   * Get all available command types
   * @returns {Array<string>} Array of command types
   */
  getAvailableCommands() {
    return Array.from(this.routingTable.keys());
  }

  /**
   * Get enabled command types only
   * @returns {Array<string>} Array of enabled command types
   */
  getEnabledCommands() {
    return Array.from(this.routingTable.entries())
      .filter(([, config]) => config.enabled)
      .map(([commandType]) => commandType);
  }

  /**
   * Get commands by priority level
   * @param {number} priority - Priority level to filter by
   * @returns {Array<string>} Array of command types with specified priority
   */
  getCommandsByPriority(priority) {
    return Array.from(this.routingTable.entries())
      .filter(([, config]) => config.enabled && config.priority === priority)
      .map(([commandType]) => commandType)
      .sort();
  }

  /**
   * Check if command is supported and enabled
   * @param {string} commandType - The command type to check
   * @returns {Object} Support status with details
   */
  isCommandSupported(commandType) {
    const config = this.routingTable.get(commandType);

    if (!config) {
      return { supported: false, reason: 'not_configured' };
    }

    if (!config.enabled) {
      return { supported: false, reason: 'disabled', config };
    }

    return { supported: true, config };
  }

  /**
   * Get routing table statistics
   * @returns {Object} Routing table statistics
   */
  getStats() {
    const commands = this.getAvailableCommands();
    const enabledCommands = this.getEnabledCommands();
    const environments = new Set();
    const priorities = new Set();

    this.routingTable.forEach(config => {
      environments.add(config.environment);
      priorities.add(config.priority);
    });

    return {
      totalRoutes: commands.length,
      enabledRoutes: enabledCommands.length,
      disabledRoutes: commands.length - enabledCommands.length,
      environments: Array.from(environments),
      priorities: Array.from(priorities).sort((a, b) => a - b),
      commands,
      enabledCommands
    };
  }

  /**
   * Clear routing table
   */
  clear() {
    this.routingTable.clear();
    this.emit('routing:table:cleared');
  }
}

module.exports = RoutingTableBuilder;
