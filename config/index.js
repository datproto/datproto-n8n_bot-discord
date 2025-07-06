/**
 * Configuration Initializer
 * Handles initialization of configuration system with hot-reload support
 */

const { EnvironmentManager } = require('./environment');
const { HotReloadManager } = require('./hot-reload');

/**
 * Initialize configuration system with hot-reload
 * @returns {Object} Configuration system components
 */
function initializeConfigSystem() {
  const environmentManager = new EnvironmentManager();
  let hotReloadManager = null;

  // Initialize hot-reload in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    try {
      hotReloadManager = new HotReloadManager(environmentManager);

      // Set up event listeners
      hotReloadManager.on('configReloaded', (data) => {
        console.log('Configuration hot-reloaded:', data.filePath);
      });

      hotReloadManager.on('reloadError', (data) => {
        console.error('Hot-reload error:', data.error);
      });

      // Start monitoring
      hotReloadManager.start();

    } catch (error) {
      console.warn('Hot-reload initialization failed:', error.message);
    }
  }

  return {
    environmentManager,
    hotReloadManager,
    // Convenience methods
    getEndpointConfig: (cmd) => environmentManager.getEndpointConfig(cmd),
    getAllEndpoints: () => environmentManager.getAllEndpoints(),
    getGlobalConfig: () => environmentManager.getGlobalConfig(),
    getEnvironmentConfig: () => environmentManager.getEnvironmentConfig(),
    getCurrentEnvironment: () => environmentManager.getCurrentEnvironment(),
    getCompleteConfig: () => environmentManager.getCompleteConfig(),
    isEndpointEnabled: (cmd) => environmentManager.isEndpointEnabled(cmd),
    getAvailableCommands: () => environmentManager.getAvailableCommands(),
    getEnabledCommands: () => environmentManager.getEnabledCommands(),
    reloadConfiguration: () => environmentManager.reloadConfiguration(),
    validateEndpointUrl: (cmd) => environmentManager.validateEndpointUrl(cmd),
    getEnvironmentVariables: () => environmentManager.getEnvironmentVariables(),
    getDiscordToken: () => environmentManager.getDiscordToken(),
    getLogLevel: () => environmentManager.getLogLevel(),
    stopHotReload: () => hotReloadManager?.stop()
  };
}

// Initialize and export singleton
const configSystem = initializeConfigSystem();

module.exports = {
  initializeConfigSystem,
  ...configSystem
};
