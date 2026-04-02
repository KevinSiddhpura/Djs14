const { Client, Message, PermissionFlagsBits } = require("discord.js");
const { getCommands } = require("../../lib/command");
const { prefixes, devs } = require("../../config");
const logger = require("../../lib/logger");
const Utils = require("../../lib/utils");

/**
 * Perform checks on a command to ensure it can be executed by the user.
 * @param {Command} command - The command object.
 * @param {Message} message - The message object containing the command and author.
 * @returns {Promise<boolean>} - Whether the command passes all checks.
 */
async function performChecks(command, message) {
    const { author, member, channelId, guild } = message;

    // Check if the command is enabled
    if (!command.enabled) {
        await message.reply({ content: "This command is disabled." });
        return false;
    }

    // Check if the command is restricted to developers
    if (command.devOnly && !devs.includes(author.id)) {
        await message.reply({ content: "This command is only for developers." });
        return false;
    }

    // Check if the command is restricted to admins
    if (command.adminOnly && !member.permissions.has(PermissionFlagsBits.Administrator) && !devs.includes(author.id)) {
        await message.reply({ content: "This command is only for administrators." });
        return false;
    }

    // Check if the command is allowed in specific channels
    if (command.allowedChannels.length > 0) {
        const isAllowedChannel = command.allowedChannels.some(channel => {
            const _channel = Utils.findChannel(channel, guild);
            return _channel && _channel.id === channelId;
        });

        if (!isAllowedChannel) {
            await message.reply({ content: "You are not allowed to use this command in this channel." });
            return false;
        }
    }

    // Check if the command is allowed for specific roles
    if (command.allowedRoles.length > 0) {
        const hasAllowedRole = command.allowedRoles.some(role => {
            const _role = Utils.findRole(role, guild);
            return _role && member.roles.cache.has(_role.id);
        });

        if (!hasAllowedRole) {
            await message.reply({ content: "You are not allowed to use this command." });
            return false;
        }
    }

    return true;
}

module.exports = {
    /**
     * Handles the message and executes the appropriate command if all conditions are met.
     * @param {Client} client - The Discord client instance.
     * @param {Message} message - The message object.
     */
    run: async (client, message) => {
        // Ignore messages from bots or outside guilds
        if (message.author.bot || !message.guild) return;

        // Get the list of commands
        const commandCollection = getCommands();

        // Find the correct prefix
        const prefix = prefixes.find(p => message.content.startsWith(p));
        if (!prefix) return;

        // Extract the command name and find the command object
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandUsed = args.shift().toLowerCase();
        const command = commandCollection.find(c => c.name === commandUsed) ||
            commandCollection.find(c => c.aliases.includes(commandUsed));

        // If the command doesn't exist or doesn't support legacy, return
        if (!command || !command.runLegacy) return;

        // Run checks and execute the command if all checks pass
        try {
            const checksPassed = await performChecks(command, message);
            if (!checksPassed) return;

            // Run the command with the parsed arguments
            command.runLegacy(client, message, args);
        } catch (error) {
            logger.error(error);
        }
    }
}