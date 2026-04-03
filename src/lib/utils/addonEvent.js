/**
 * AddonEvent - Event class for addon developers
 * Makes it easy to define event listeners with proper structure
 *
 * Usage:
 * new AddonEvent({
 *   name: 'messageCreate',
 *   once: false,
 *   execute: async (message) => {
 *     console.log('Message received!');
 *   }
 * });
 */
class AddonEvent {
  /**
   * @param {Object} options - Event options
   * @param {string} options.name - Discord.js event name (e.g., 'messageCreate', 'ready')
   * @param {boolean} options.once - Listen only once or continuously
   * @param {Function} options.execute - Async function that handles the event
   * @param {string} options.description - Optional description of what this event does
   */
  constructor(options = {}) {
    const { name, once = false, execute, description = '', owner = 'Unknown Addon' } = options;

    // Validate required fields
    if (!name) throw new Error('AddonEvent: Missing required field "name"');
    if (!execute) throw new Error('AddonEvent: Missing required field "execute"');
    if (typeof execute !== 'function') throw new Error('AddonEvent: "execute" must be a function');

    this.name = name;
    this.once = once;
    this.execute = execute;
    this.description = description;
    this.addon = owner;
  }

  /**
   * Validate event structure
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validate() {
    const errors = [];

    if (!this.name) errors.push('Missing event name');
    if (!this.execute || typeof this.execute !== 'function') errors.push('Missing or invalid execute function');
    if (typeof this.once !== 'boolean') errors.push('Invalid "once" value - must be boolean');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get event metadata
   * @returns {Object}
   */
  getMetadata() {
    return {
      name: this.name,
      once: this.once,
      description: this.description,
      addon: this.addon
    };
  }
}

module.exports = AddonEvent;
