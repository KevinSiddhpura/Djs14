const logger = require("../../lib/logger");

class ComponentHandler {
    constructor() {
        this.handlers = new Map();
        this.prefixHandlers = new Map();
    }

    register(customId, handler) {
        this.handlers.set(customId, handler);
        return this;
    }

    unregister(customId) {
        this.handlers.delete(customId);
        return this;
    }

    registerPrefix(prefix, handler) {
        this.prefixHandlers.set(prefix, handler);
        return this;
    }

    unregisterPrefix(prefix) {
        this.prefixHandlers.delete(prefix);
        return this;
    }

    has(customId) {
        return this.handlers.has(customId) || [...this.prefixHandlers.keys()].some((prefix) => customId.startsWith(prefix));
    }

    async handle(client, interaction) {
        const handler = this.handlers.get(interaction.customId);
        const prefixHandler = handler
            ? null
            : [...this.prefixHandlers.entries()].find(([prefix]) => interaction.customId.startsWith(prefix))?.[1];

        const resolvedHandler = handler || prefixHandler;
        if (!resolvedHandler) return false;

        try {
            await resolvedHandler(client, interaction);
            return true;
        } catch (error) {
            logger.error(error);
            return true;
        }
    }
}

module.exports = new ComponentHandler();
