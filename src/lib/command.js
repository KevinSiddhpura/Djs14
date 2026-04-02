const {
    Collection,
    ApplicationCommandType,
    ApplicationCommandOptionType,
    ChannelType,
    Client,
    ChatInputCommandInteraction,
    Message,
    MessageContextMenuCommandInteraction,
    UserContextMenuCommandInteraction,
    AutocompleteInteraction,
} = require("discord.js");

const logger = require("./logger");

const commands = new Collection();

const choicesLayout = {
    /** @type {string} */
    name: null,
    /** @type {string} */
    value: null,
};

const optionsLayout = {
    /** @type {ApplicationCommandOptionType} */
    type: null,
    /** @type {string} */
    name: null,
    /** @type {string} */
    description: null,
    /** @type {boolean} */
    required: false,
    /** @type {choicesLayout[]} */
    choices: [],
    /** @type {ChannelType[]} */
    channelTypes: [],
    /** @type {boolean} */
    autocomplete: false,
    /** @type {optionsLayout[]} */
    options: [],
};

const commandLayout = {
    /** @type {boolean} */
    enabled: true,
    /** @type {string} */
    category: null,
    /** @type {string} */
    name: null,
    /** @type {string} */
    description: null,
    /** @type {optionsLayout[]} */
    options: [],
    /** @type {ApplicationCommandType} */
    type: ApplicationCommandType.ChatInput,
    /** @type {string[]} */
    aliases: [],
    /** @type {boolean} */
    devOnly: false,
    /** @type {boolean} */
    adminOnly: false,
    /** @type {string[]} */
    allowedRoles: [],
    /** @type {string[]} */
    allowedChannels: [],

    /** @param {Client} client @param {ChatInputCommandInteraction} interaction */
    runSlash: async (client, interaction) => {},
    /** @param {Client} client @param {AutocompleteInteraction} interaction */
    runAutocomplete: async (client, interaction) => {},
    /** @param {Client} client @param {MessageContextMenuCommandInteraction} interaction */
    runContextMessage: async (client, interaction) => {},
    /** @param {Client} client @param {UserContextMenuCommandInteraction} interaction */
    runContextUser: async (client, interaction) => {},
    /** @param {Client} client @param {Message} message @param {Array} args */
    runLegacy: async (client, message, args) => {},
};

class Command {
    /** @param {commandLayout} commandOptions */
    constructor(commandOptions) {
        const {
            name,
            category,
            enabled = true,
            description = null,
            type = ApplicationCommandType.ChatInput,
            aliases = [],
            devOnly = false,
            adminOnly = false,
            allowedRoles = [],
            allowedChannels = [],
            options = [],
            runSlash,
            runAutocomplete,
            runLegacy,
            runContextMessage,
            runContextUser,
        } = commandOptions;

        if (!name) return logger.error("Missing command name.");
        if (commands.has(name)) return logger.error(`Duplicate command name: ${name}`);

        if (!category) return logger.error(`Missing command category for ${name}`);
        if (type === ApplicationCommandType.ChatInput && !description) {
            return logger.error(`Missing description for chat input command: ${name}`);
        }

        this.name = name;
        this.category = category;
        this.enabled = enabled;
        this.description = description;
        this.type = type;
        this.aliases = aliases;
        this.devOnly = devOnly;
        this.adminOnly = adminOnly;
        this.allowedRoles = allowedRoles;
        this.allowedChannels = allowedChannels;

        this.runSlash = type === ApplicationCommandType.ChatInput ? runSlash : null;
        this.runLegacy = type === ApplicationCommandType.ChatInput ? runLegacy : null;
        this.runAutocomplete = type === ApplicationCommandType.ChatInput ? runAutocomplete : null;
        this.runContextMessage = type === ApplicationCommandType.Message ? runContextMessage : null;
        this.runContextUser = type === ApplicationCommandType.User ? runContextUser : null;

        if (type === ApplicationCommandType.ChatInput && !this.runSlash && !this.runLegacy) {
            return logger.error(`Missing run function for chat input command: ${name}`);
        }

        if (type === ApplicationCommandType.Message && !this.runContextMessage) {
            return logger.error(`Missing run function for message context command: ${name}`);
        }

        if (type === ApplicationCommandType.User && !this.runContextUser) {
            return logger.error(`Missing run function for user context command: ${name}`);
        }

        this.options = options.map((option) => ({
            type: option.type || ApplicationCommandOptionType.String,
            name: option.name,
            description: option.description,
            required: option.required || false,
            choices: option.choices || [],
            channelTypes: option.channelTypes || [],
            autocomplete: option.autocomplete || false,
            options: option.options || [],
        }));

        commands.set(this.name, this);
    }

    static getCommands = () => commands.toJSON();
}

module.exports = Command;
