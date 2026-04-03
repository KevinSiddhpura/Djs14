const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const logger = require('../lib/utils/logger');
const Command = require('./command');

/**
 * AddonHandler - Manages loading, registering, and handling addons
 */
class AddonHandler {
    constructor(client) {
        this.client = client;
        this.addons = new Map(); // Map<addonName, addonInstance>
        this.addonConfig = new Map(); // Map<addonName, config>
        this.commandListeners = new Map(); // Map to track addon commands
        this.eventListeners = new Map(); // Map to track addon events
        this.addonsPath = path.join(process.cwd(), 'addons');
        this.configPath = path.join(process.cwd(), 'data', 'addons');
    }

    /**
     * Initialize addon system - creates directories and loads addons
     */
    async initialize() {
        try {
            // Create directories if they don't exist
            await fs.mkdir(this.addonsPath, { recursive: true });
            await fs.mkdir(this.configPath, { recursive: true });

            logger.info('AddonHandler', 'Addon system initialized');
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to initialize: ${error.message}`);
            return false;
        }
    }

    /**
     * Load all addons from addons folder
     */
    async loadAddons() {
        try {
            const files = await fs.readdir(this.addonsPath);
            const jsFiles = files.filter(f => f.endsWith('.js'));

            for (const file of jsFiles) {
                await this.loadAddon(file.replace('.js', ''));
            }

            logger.info('AddonHandler', `Loaded ${this.addons.size} addon(s)`);
            return this.addons.size;
        } catch (error) {
            logger.error('AddonHandler', `Failed to load addons: ${error.message}`);
            return 0;
        }
    }

    /**
     * Load a single addon by name
     * @param {String} addonName - Name of addon file (without .js)
     */
    async loadAddon(addonName) {
        try {
            // Check if already loaded
            if (this.addons.has(addonName)) {
                logger.warn('AddonHandler', `Addon already loaded: ${addonName}`);
                return false;
            }

            const addonPath = path.join(this.addonsPath, `${addonName}.js`);

            // Load addon file
            delete require.cache[require.resolve(addonPath)];
            const AddonClass = require(addonPath);
            const addon = new AddonClass();

            // Validate addon
            const validation = addon.validate();
            if (!validation.valid) {
                logger.error('AddonHandler', `Addon validation failed (${addonName}): ${validation.errors.join(', ')}`);
                return false;
            }

            // Load or create addon config
            await this.loadAddonConfig(addonName, addon);

            // Store addon
            this.addons.set(addonName, addon);

            // Call lifecycle hook
            await addon.onLoad(this.client);

            logger.info('AddonHandler', `Loaded addon: ${addon.metadata.name} v${addon.metadata.version}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to load addon ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Load or create addon configuration
     * @param {String} addonName
     * @param {Addon} addon
     */
    async loadAddonConfig(addonName, addon) {
        try {
            const configFile = path.join(this.configPath, `${addonName}.config.js`);
            const legacyConfigFile = path.join(this.configPath, `${addonName}.json`);
            const defaults = this.buildDefaultConfig(addon);

            let loadedConfig = null;

            try {
                await fs.access(configFile);
                delete require.cache[require.resolve(configFile)];
                loadedConfig = require(configFile);
            } catch {
                // If legacy JSON exists, migrate it to JS format.
                try {
                    await fs.access(legacyConfigFile);
                    const data = await fs.readFile(legacyConfigFile, 'utf-8');
                    const legacy = JSON.parse(data);
                    loadedConfig = {
                        enabled: typeof legacy.enabled === 'boolean' ? legacy.enabled : defaults.enabled,
                        config: legacy.customConfig || legacy.config || {},
                        lang: legacy.lang || {}
                    };

                    await this.saveAddonConfig(addonName, loadedConfig);
                    logger.info('AddonHandler', `Migrated legacy JSON config for ${addonName} to JS`);
                } catch {
                    loadedConfig = defaults;
                    await this.saveAddonConfig(addonName, loadedConfig);
                    logger.info('AddonHandler', `Created JS config for ${addonName}`);
                }
            }

            const mergedConfig = this.mergeAddonConfig(defaults, loadedConfig || {});
            await this.saveAddonConfig(addonName, mergedConfig);
            addon.loadConfig(mergedConfig);
            this.addonConfig.set(addonName, mergedConfig);
            return mergedConfig;
        } catch (error) {
            logger.error('AddonHandler', `Failed to load config for ${addonName}: ${error.message}`);
            return {};
        }
    }

    /**
     * Unload an addon and clean up
     * @param {String} addonName
     */
    async unloadAddon(addonName) {
        try {
            const addon = this.addons.get(addonName);
            if (!addon) {
                logger.warn('AddonHandler', `Addon not loaded: ${addonName}`);
                return false;
            }

            // Unregister commands and events
            await this.unregisterAddonHandlers(addonName);

            // Call lifecycle hook
            await addon.onUnload(this.client);

            // Remove from maps
            this.addons.delete(addonName);
            this.addonConfig.delete(addonName);

            logger.info('AddonHandler', `Unloaded addon: ${addon.metadata.name}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to unload addon ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Enable addon and register its handlers
     * @param {String} addonName
     */
    async enableAddon(addonName) {
        try {
            const addon = this.addons.get(addonName);
            if (!addon) throw new Error('Addon not loaded');

            const config = this.addonConfig.get(addonName);
            if (!config) throw new Error('Addon config not found');

            config.enabled = true;
            await this.saveAddonConfig(addonName, config);

            // Register commands and events only once.
            if (!this.commandListeners.has(addonName) && !this.eventListeners.has(addonName)) {
                await this.registerAddonHandlers(addonName);
            }

            // Call lifecycle hook
            await addon.onEnable(this.client);

            logger.info('AddonHandler', `Enabled addon: ${addon.metadata.name}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to enable addon ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Disable addon and unregister its handlers
     * @param {String} addonName
     */
    async disableAddon(addonName) {
        try {
            const addon = this.addons.get(addonName);
            if (!addon) throw new Error('Addon not loaded');

            const config = this.addonConfig.get(addonName);
            if (!config) throw new Error('Addon config not found');

            config.enabled = false;
            await this.saveAddonConfig(addonName, config);

            // Unregister commands and events
            await this.unregisterAddonHandlers(addonName);

            // Call lifecycle hook
            await addon.onDisable(this.client);

            logger.info('AddonHandler', `Disabled addon: ${addon.metadata.name}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to disable addon ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Reload an addon
     * @param {String} addonName
     */
    async reloadAddon(addonName) {
        try {
            const wasEnabled = this.addonConfig.get(addonName)?.enabled || false;
            await this.unloadAddon(addonName);
            await this.loadAddon(addonName);

            if (wasEnabled) {
                await this.enableAddon(addonName);
            }

            logger.info('AddonHandler', `Reloaded addon: ${addonName}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to reload addon ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Register addon commands and events
     * Supports both AddonCommand/AddonEvent objects and plain objects
     * @param {String} addonName
     */
    async registerAddonHandlers(addonName) {
        try {
            const addon = this.addons.get(addonName);
            if (!addon) throw new Error('Addon not found');
            const commandRegistry = typeof Command.getCollection === 'function'
                ? Command.getCollection()
                : this.client.commands;

            // Re-register safely if handlers were already attached.
            if (this.commandListeners.has(addonName) || this.eventListeners.has(addonName)) {
                await this.unregisterAddonHandlers(addonName);
            }

            // Register commands
            const commands = addon.getCommands();
            if (!Array.isArray(commands)) throw new Error('getCommands() must return an array');

            for (const command of commands) {
                // Validate command structure
                if (!command.name) throw new Error(`Command missing name in ${addonName}`);
                if (!command.runSlash && !command.execute) throw new Error(`Command ${command.name} missing runSlash or execute in ${addonName}`);

                // Mark command as from addon
                const commandToRegister = {
                    ...command,
                    addon: addonName,
                    isAddonCommand: true
                };

                // Store in your commands collection
                if (commandRegistry?.set) {
                    commandRegistry.set(command.name, commandToRegister);
                }
            }

            if (!this.commandListeners.has(addonName)) {
                this.commandListeners.set(addonName, commands.map(c => c.name));
            }

            // Register events
            const events = addon.getEvents();
            if (!Array.isArray(events)) throw new Error('getEvents() must return an array');

            const eventHandlers = [];
            for (const event of events) {
                // Validate event structure
                if (!event.name) throw new Error(`Event missing name in ${addonName}`);
                if (!event.execute || typeof event.execute !== 'function') throw new Error(`Event ${event.name} missing execute function in ${addonName}`);

                // Create event handler that wraps the execute function
                const handler = (...args) => {
                    try {
                        return event.execute(...args);
                    } catch (error) {
                        logger.error('AddonHandler', `Event error in ${addonName} (${event.name}): ${error.message}`);
                    }
                };

                if (event.once) {
                    this.client.once(event.name, handler);
                } else {
                    this.client.on(event.name, handler);
                }

                eventHandlers.push({ name: event.name, handler, once: event.once });
            }

            if (!this.eventListeners.has(addonName)) {
                this.eventListeners.set(addonName, eventHandlers);
            }

            logger.info('AddonHandler', `Registered handlers for ${addonName}: ${commands.length} commands, ${events.length} events`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to register handlers for ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Unregister addon commands and events
     * @param {String} addonName
     */
    async unregisterAddonHandlers(addonName) {
        try {
            const commandRegistry = typeof Command.getCollection === 'function'
                ? Command.getCollection()
                : this.client.commands;

            // Remove commands
            const commands = this.commandListeners.get(addonName) || [];
            for (const cmdName of commands) {
                if (commandRegistry?.delete) {
                    commandRegistry.delete(cmdName);
                }
            }
            this.commandListeners.delete(addonName);

            // Remove events (Note: Discord.js off() removes listeners)
            const eventHandlers = this.eventListeners.get(addonName) || [];
            for (const { name, handler } of eventHandlers) {
                this.client.off(name, handler);
            }
            this.eventListeners.delete(addonName);

            logger.info('AddonHandler', `Unregistered handlers for ${addonName}`);
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to unregister handlers for ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Save addon configuration to file
     * @param {String} addonName
     * @param {Object} config
     */
    async saveAddonConfig(addonName, config) {
        try {
            const configFile = path.join(this.configPath, `${addonName}.config.js`);
            const jsContent = this.serializeConfigModule(config);

            await fs.writeFile(configFile, jsContent, 'utf-8');
            this.addonConfig.set(addonName, this.mergeAddonConfig({}, config));
            return true;
        } catch (error) {
            logger.error('AddonHandler', `Failed to save config for ${addonName}: ${error.message}`);
            return false;
        }
    }

    /**
     * Build default config from addon implementation.
     * @param {Addon} addon
     * @returns {{enabled: boolean, config: Object, lang: Object}}
     */
    buildDefaultConfig(addon) {
        const built = typeof addon.buildConfig === 'function' ? addon.buildConfig() : {};

        return {
            enabled: typeof built?.enabled === 'boolean' ? built.enabled : (addon.metadata.enabled !== false),
            config: built?.config && typeof built.config === 'object' ? built.config : {},
            lang: built?.lang && typeof built.lang === 'object' ? built.lang : {}
        };
    }

    /**
     * Merge config with defaults while preserving unknown top-level keys.
     * @param {Object} defaults
     * @param {Object} incoming
     * @returns {Object}
     */
    mergeAddonConfig(defaults = {}, incoming = {}) {
        return {
            ...defaults,
            ...incoming,
            enabled: typeof incoming.enabled === 'boolean'
                ? incoming.enabled
                : (typeof defaults.enabled === 'boolean' ? defaults.enabled : true),
            config: {
                ...(defaults.config || {}),
                ...(incoming.config || {})
            },
            lang: {
                ...(defaults.lang || {}),
                ...(incoming.lang || {})
            }
        };
    }

    /**
     * Serialize config object as a JavaScript module.
     * @param {Object} config
     * @returns {string}
     */
    serializeConfigModule(config) {
        const serialized = util.inspect(config, {
            depth: null,
            colors: false,
            compact: false,
            sorted: false,
            breakLength: 100
        });

        return [
            '// Auto-generated addon config. Edit values as needed.',
            'module.exports = ' + serialized + ';',
            ''
        ].join('\n');
    }

    /**
     * Get addon metadata
     * @param {String} addonName
     * @returns {Object}
     */
    getAddonMetadata(addonName) {
        const addon = this.addons.get(addonName);
        const config = this.addonConfig.get(addonName);

        if (!addon) return null;

        return {
            ...addon.metadata,
            enabled: config?.enabled || false,
            commands: (this.commandListeners.get(addonName) || []).length,
            events: (this.eventListeners.get(addonName) || []).length
        };
    }

    /**
     * Get all addons with metadata
     * @returns {Map}
     */
    getAllAddons() {
        const result = new Map();

        for (const [name, addon] of this.addons) {
            result.set(name, this.getAddonMetadata(name));
        }

        return result;
    }
}

module.exports = AddonHandler;
