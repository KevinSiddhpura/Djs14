// Addon template
// Intended destination: /addons/<your-addon-name>.js
// These import paths are written for files inside /addons.

const Addon = require('../src/lib/utils/addonBase');
const { AddonCommand, AddonEvent } = require('../src/lib/utils/addonBase');

class MyAddon extends Addon {
  constructor() {
    super({
      name: 'My Addon',
      developer: 'Your Name',
      description: 'Describe what this addon does.',
      version: '1.0.0',
      enabled: true,
    });

    this.runtimeCounter = 0;
  }

  // This object is written to data/addons/<addon>.config.js
  buildConfig() {
    return {
      enabled: true,
      config: {
        greeting: 'Hello from My Addon',
        trackMessages: true,
      },
      lang: {
        statusTitle: 'Status',
        counterLabel: 'Counter',
      },
    };
  }

  async onLoad() {
    // Example access: this.cfg('greeting'), this.t('statusTitle')
  }

  async onEnable() {
    this.runtimeCounter = 0;
  }

  async onDisable() {}

  async onUnload() {}

  getCommands() {
    return [
      new AddonCommand({
        name: 'my-addon-hello',
        description: 'Reply with addon greeting from config',
        owner: this.metadata.name,
        runSlash: async (client, interaction) => {
          const text = this.cfg('greeting', 'Hello');
          await interaction.reply(text);
        },
      }),

      new AddonCommand({
        name: 'my-addon-status',
        description: 'Show addon runtime status',
        owner: this.metadata.name,
        runSlash: async (client, interaction) => {
          const title = this.t('statusTitle', 'Status');
          const label = this.t('counterLabel', 'Counter');

          await interaction.reply(
            `**${title}**\n${label}: ${this.runtimeCounter}\nEnabled: ${this.getConfig().enabled}`
          );
        },
      }),
    ];
  }

  getEvents() {
    return [
      new AddonEvent({
        name: 'messageCreate',
        once: false,
        owner: this.metadata.name,
        description: 'Track message count when enabled in config',
        execute: (message) => {
          if (message.author.bot) return;
          if (!this.cfg('trackMessages', true)) return;

          this.runtimeCounter += 1;
        },
      }),
    ];
  }
}

module.exports = MyAddon;
