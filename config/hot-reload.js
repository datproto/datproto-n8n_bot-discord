/**
 * Hot-Reload Manager
 * Monitors configuration files and triggers reloads when changes are detected
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class HotReloadManager extends EventEmitter {
  constructor(environmentManager) {
    super();
    this.environmentManager = environmentManager;
    this.watchers = new Map();
    this.isEnabled = process.env.NODE_ENV !== 'production';
    this.debounceTime = 500; // ms
    this.debounceTimers = new Map();
  }

  /**
   * Start monitoring configuration files
   */
  start() {
    if (!this.isEnabled) {
      console.log('Hot-reload disabled in production environment');
      return;
    }

    const configFiles = this.getConfigFiles();
    configFiles.forEach(file => this.watchFile(file));

    console.log(`Hot-reload monitoring started for ${configFiles.length} files`);
  }

  /**
   * Stop monitoring and cleanup watchers
   */
  stop() {
    this.watchers.forEach((watcher, file) => {
      watcher.close();
      console.log(`Stopped watching: ${file}`);
    });

    this.watchers.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    console.log('Hot-reload monitoring stopped');
  }

  /**
   * Get list of configuration files to monitor
   * @returns {string[]} Array of file paths
   */
  getConfigFiles() {
    const configDir = path.join(__dirname);
    return [
      path.join(configDir, 'endpoints.json'),
      path.join(process.cwd(), '.env'),
      path.join(process.cwd(), '.env.local'),
      path.join(process.cwd(), '.env.development'),
      path.join(process.cwd(), '.env.staging'),
      path.join(process.cwd(), '.env.production')
    ].filter(file => fs.existsSync(file));
  }

  /**
   * Watch a specific file for changes
   * @param {string} filePath - Path to file to watch
   */
  watchFile(filePath) {
    if (this.watchers.has(filePath)) {
      return; // Already watching
    }

    try {
      const watcher = fs.watch(filePath, (eventType, filename) => {
        if (eventType === 'change') {
          this.handleFileChange(filePath);
        }
      });

      this.watchers.set(filePath, watcher);
      console.log(`Started watching: ${filePath}`);

    } catch (error) {
      console.error(`Failed to watch file ${filePath}:`, error.message);
    }
  }

  /**
   * Handle file change with debouncing
   * @param {string} filePath - Path of changed file
   */
  handleFileChange(filePath) {
    // Clear existing timer for this file
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath));
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.reloadConfiguration(filePath);
      this.debounceTimers.delete(filePath);
    }, this.debounceTime);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Reload configuration when file changes
   * @param {string} filePath - Path of changed file
   */
  async reloadConfiguration(filePath) {
    try {
      console.log(`Configuration file changed: ${filePath}`);

      // Validate file exists and is readable
      if (!fs.existsSync(filePath)) {
        console.warn(`File no longer exists: ${filePath}`);
        return;
      }

      // Reload environment manager configuration
      this.environmentManager.reloadConfiguration();

      // Emit reload event for other components to react
      this.emit('configReloaded', {
        filePath,
        timestamp: new Date().toISOString(),
        config: this.environmentManager.getCompleteConfig()
      });

      console.log('Configuration reloaded successfully');

    } catch (error) {
      console.error('Failed to reload configuration:', error.message);

      // Emit error event
      this.emit('reloadError', {
        filePath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add a new file to watch
   * @param {string} filePath - Path to file to watch
   */
  addWatch(filePath) {
    if (this.isEnabled && fs.existsSync(filePath)) {
      this.watchFile(filePath);
    }
  }

  /**
   * Remove file from watching
   * @param {string} filePath - Path to file to stop watching
   */
  removeWatch(filePath) {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      console.log(`Stopped watching: ${filePath}`);
    }
  }

  /**
   * Get current watch status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      watchedFiles: Array.from(this.watchers.keys()),
      fileCount: this.watchers.size
    };
  }

  /**
   * Enable hot-reload (useful for testing)
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable hot-reload
   */
  disable() {
    this.isEnabled = false;
    this.stop();
  }
}

module.exports = {
  HotReloadManager
};
