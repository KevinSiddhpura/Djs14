const { Client } = require("discord.js");
const logger = require("../../lib/logger");
const Utils = require("../../lib/utils");

module.exports = {
    once: true,

    /**
     * @param {Client} client 
     */

    run: async (client) => {
        logger.info(`Logged in as ${client.user.username}!`);
        const didRegister = await Utils.registerCommands(client);
        if (!didRegister) {
            logger.error("Command registration failed. Review logs above for details.");
        }
    }
}