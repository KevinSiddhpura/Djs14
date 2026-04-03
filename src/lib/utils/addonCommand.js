const { ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const Command = require('../../handlers/command');

/**
 * AddonCommand - Simplified command class for addon developers
 * Extends the base Command class with sensible addon defaults
 *
 * Usage:
 * new AddonCommand({
 *   name: 'addon-hello',
 *   description: 'Say hello',
 *   runSlash: async (client, interaction) => {
 *     await interaction.reply('Hello!');
 *   }
 * });
 */
class AddonCommand extends Command {
  /**
   * @param {Object} options - Command options
   * @param {string} options.name - Command name
   * @param {string} options.description - Command description
   * @param {ApplicationCommandOptionType[]} options.options - Command options/arguments
   * @param {Function} options.runSlash - Handler for slash command
   * @param {Function} options.runAutocomplete - Handler for autocomplete
   * @param {string} options.owner - Addon name that owns this command
   */
  constructor(params = {}) {
    const {
      name,
      description,
      options = [],
      runSlash,
      runAutocomplete,
      owner = 'Unknown Addon',
      ...rest
    } = params;

    // Validate required fields
    if (!name) throw new Error('AddonCommand: Missing required field "name"');
    if (!description) throw new Error('AddonCommand: Missing required field "description"');
    if (!runSlash) throw new Error('AddonCommand: Missing required field "runSlash"');

    // Call parent constructor with sensible defaults for addon commands
    super({
      name,
      description,
      category: 'Addon',
      type: ApplicationCommandType.ChatInput,
      options,
      runSlash,
      runAutocomplete: runAutocomplete || null,
      enabled: true,
      devOnly: false,
      adminOnly: false,
      ...rest
    });

    // Mark this command as from an addon
    this.addon = owner;
    this.isAddonCommand = true;
  }
}

module.exports = AddonCommand;
