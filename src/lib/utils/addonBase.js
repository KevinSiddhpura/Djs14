const AddonCommand = require('./addonCommand');
const AddonEvent = require('./addonEvent');

/**
 * Base class for all addons
 * Addons extend this and override methods as needed
 *
 * Example:
 * class MyAddon extends Addon {
 *   constructor() {
 *     super({
 *       name: 'My Addon',
 *       developer: 'YourName',
 *       description: 'Does something cool',
 *       version: '1.0.0'
 *     });
 *   }
 *
 *   getCommands() {
 *     return [
 *       new AddonCommand({
 *         name: 'addon-hello',
 *         description: 'Say hello',
 *         owner: this.metadata.name,
 *         runSlash: async (client, interaction) => {
 *           await interaction.reply('Hello!');
 *         }
 *       })
 *     ];
 *   }
 *
 *   getEvents() {
 *     return [
 *       new AddonEvent({
 *         name: 'messageCreate',
 *         once: false,
 *         owner: this.metadata.name,
 *         execute: async (message) => {
 *           if (message.author.bot) return;
 *           console.log('Message received!');
 *         }
 *       })
 *     ];
 *   }
 * }
 */
class Addon {
  constructor(metadata = {}) {
    this.metadata = {
      name: 'Unknown Addon',
      developer: 'Unknown',
      description: 'No description',
      version: '0.0.1',
      enabled: true,
      ...metadata
    };

    // New config model exposed to addons.
    this.addonConfig = {
      enabled: this.metadata.enabled !== false,
      config: {},
      lang: {}
    };

    // Backward compatibility for older addons that use this.config directly.
    this.config = this.addonConfig.config;
  }

  /**
   * Build default addon config that will be written to data/addons/<addon>.config.js
   * Addons can override this and return any serializable object.
   * @returns {{enabled?: boolean, config?: Object, lang?: Object}}
   */
  buildConfig() {
    return {
      enabled: this.metadata.enabled !== false,
      config: {},
      lang: {}
    };
  }

  /**
   * Called when addon is first loaded
   * @param {Client} client - Discord.js client
   */
  async onLoad(client) { }

  /**
   * Called when addon is unloaded
   * @param {Client} client - Discord.js client
   */
  async onUnload(client) { }

  /**
   * Called when addon is enabled
   * @param {Client} client - Discord.js client
   */
  async onEnable(client) { }

  /**
   * Called when addon is disabled
   * @param {Client} client - Discord.js client
   */
  async onDisable(client) { }

  /**
   * Return array of command objects this addon provides
   * Command format: { name, description, execute(interaction), ... }
   * @returns {Array}
   */
  getCommands() {
    return [];
  }

  /**
   * Return array of event listeners this addon provides
   * Event format: { name, once, execute(args...) }
   * @returns {Array}
   */
  getEvents() {
    return [];
  }

  /**
   * Load addon configuration from file
   * @param {Object} config - Loaded config
   */
  loadConfig(config) {
    const incoming = config || {};

    this.addonConfig = {
      ...this.addonConfig,
      ...incoming,
      config: {
        ...(this.addonConfig?.config || {}),
        ...(incoming?.config || {})
      },
      lang: {
        ...(this.addonConfig?.lang || {}),
        ...(incoming?.lang || {})
      }
    };

    // Keep legacy alias synced.
    this.config = this.addonConfig.config;
    this.lang = this.addonConfig.lang;
  }

  /**
   * Get addon configuration
   * @returns {Object}
   */
  getConfig() {
    return this.addonConfig;
  }

  /**
   * Read a value from addonConfig.config using dot notation.
   * @param {string} keyPath - Example: "feature.flags.logging"
   * @param {any} fallback - Value to return when path is not found
   * @returns {any}
   */
  cfg(keyPath, fallback = undefined) {
    if (!keyPath) return this.addonConfig?.config ?? fallback;

    const value = keyPath
      .split('.')
      .reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), this.addonConfig?.config);

    return value === undefined ? fallback : value;
  }

  /**
   * Check whether a config key exists.
   * @param {string} keyPath
   * @returns {boolean}
   */
  hasCfg(keyPath) {
    return this.cfg(keyPath, undefined) !== undefined;
  }

  /**
   * Read a language string from addonConfig.lang using dot notation.
   * @param {string} keyPath - Example: "errors.missingPermission"
   * @param {string} fallback
   * @returns {string}
   */
  t(keyPath, fallback = '') {
    if (!keyPath) return fallback;

    const value = keyPath
      .split('.')
      .reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), this.addonConfig?.lang);

    if (value === undefined || value === null) return fallback;
    return String(value);
  }

  /**
   * Validate addon structure
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.metadata.name) errors.push('Missing addon name');
    if (!this.metadata.developer) errors.push('Missing developer');
    if (!this.metadata.version) errors.push('Missing version');
    if (typeof this.getCommands !== 'function') errors.push('Missing getCommands method');
    if (typeof this.getEvents !== 'function') errors.push('Missing getEvents method');

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = Addon;
module.exports.AddonCommand = AddonCommand;
module.exports.AddonEvent = AddonEvent;
