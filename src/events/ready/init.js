const { Client } = require("discord.js");
const logger = require("../../lib/utils/logger");
const Utils = require("../../lib/utils");
const AddonHandler = require("../../handlers/addon");

module.exports = {
    once: true,

    /**
     * @param {Client} client 
     */

    run: async (client) => {
        logger.info(`Logged in as ${client.user.username}!`);

        // Initialize addon system once the client is ready.
        if (!client.addonHandler) {
            client.addonHandler = new AddonHandler(client);
            const initialized = await client.addonHandler.initialize();

            if (initialized) {
                await client.addonHandler.loadAddons();

                // Enable addons that are marked enabled in persisted config.
                const addons = client.addonHandler.getAllAddons();
                for (const [name, metadata] of addons) {
                    if (metadata.enabled) {
                        await client.addonHandler.enableAddon(name);
                    }
                }
            } else {
                logger.error("Addon system failed to initialize.");
            }
        }

        const didRegister = await Utils.registerCommands(client);
        if (!didRegister) {
            logger.error("Command registration failed. Review logs above for details.");
        }
    }
}