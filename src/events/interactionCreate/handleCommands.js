const { Client, PermissionFlagsBits, ChatInputCommandInteraction, MessageFlags } = require("discord.js");
const { getCommands } = require("../../lib/command");
const { devs } = require("../../config");
const logger = require("../../lib/logger");
const Utils = require("../../lib/utils");
const componentHandler = require("../../handlers/interactions/componentHandler");
const modalHandler = require("../../handlers/interactions/modalHandler");

/**
 * Perform checks on a command to ensure it can be executed.
 * @param {Command} command - The command object.
 * @param {ChatInputCommandInteraction | ContextMenuCommandInteraction} interaction - The interaction object from Discord.
 * @returns {Promise<boolean>} - Whether the command passes all checks.
 */
async function performChecks(command, interaction) {
    // Check if command is enabled
    if (!command.enabled) {
        await interaction.reply({ content: "This command is disabled.", flags: MessageFlags.Ephemeral });
        return false;
    }

    // Check if command is developer-only and whether the user is a dev
    if (command.devOnly && !devs.includes(interaction.user.id)) {
        await interaction.reply({ content: "This command is only for developers.", flags: MessageFlags.Ephemeral });
        return false;
    }

    // Check if command is admin-only and whether the user has admin permissions or is a dev
    if (command.adminOnly && !interaction.member.permissions.has(PermissionFlagsBits.Administrator) && !devs.includes(interaction.user.id)) {
        await interaction.reply({ content: "This command is only for administrators.", flags: MessageFlags.Ephemeral });
        return false;
    }

    // Check if the command is restricted to specific channels
    if (command.allowedChannels.length > 0) {
        const isAllowedChannel = command.allowedChannels.some(channelId => {
            const channel = Utils.findChannel(channelId, interaction.guild);
            return channel && channel.id === interaction.channelId;
        });

        if (!isAllowedChannel) {
            await interaction.reply({
                content: `This command can only be used in the following channels: ${command.allowedChannels.join(", ")}`,
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
    }

    // Check if the command is restricted to specific roles
    if (command.allowedRoles.length > 0) {
        const hasAllowedRole = command.allowedRoles.some(roleId => {
            const role = Utils.findRole(roleId, interaction.guild);
            return role && interaction.member.roles.cache.has(role.id);
        });

        if (!hasAllowedRole) {
            await interaction.reply({
                content: `This command can only be used by the following roles: ${command.allowedRoles.join(", ")}`,
                flags: MessageFlags.Ephemeral
            });
            return false;
        }
    }

    return true;
}

module.exports = {
    /**
     * Handle incoming interactions and execute appropriate commands.
     * @param {Client} client - The Discord client instance.
     * @param {ChatInputCommandInteraction} interaction - The interaction object.
     */
    run: async (client, interaction) => {
        if (interaction.isButton() || interaction.isAnySelectMenu()) {
            await componentHandler.handle(client, interaction);
            return;
        }

        if (interaction.isModalSubmit()) {
            await modalHandler.handle(client, interaction);
            return;
        }

        if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand() && !interaction.isAutocomplete()) return;

        const commandCollection = getCommands();
        const command = commandCollection.find(c => c.name === interaction.commandName);

        // Ensure command exists and has appropriate handler
        if (!command) {
            return interaction.reply({ content: "The command does not exist or was not updated.", flags: MessageFlags.Ephemeral });
        }

        // Determine the interaction type and run the associated command
        const isSlashCommand = interaction.isChatInputCommand() && command.runSlash;
        const isUserContextCommand = interaction.isUserContextMenuCommand() && command.runContextUser;
        const isMessageContextCommand = interaction.isMessageContextMenuCommand() && command.runContextMessage;
        const isAutoCompleteCommand = interaction.isAutocomplete() && command.runAutocomplete;
        
        if (isAutoCompleteCommand) {
            try {
                await command.runAutocomplete(client, interaction);
            } catch (error) {
                logger.error(error);
            }
            return;
        }

        if (isSlashCommand || isUserContextCommand || isMessageContextCommand) {
            try {
                const checksPassed = await performChecks(command, interaction);
                if (!checksPassed) return;

                if (isSlashCommand) {
                    await command.runSlash(client, interaction);
                } else if (isUserContextCommand) {
                    await command.runContextUser(client, interaction);
                } else if (isMessageContextCommand) {
                    await command.runContextMessage(client, interaction);
                }
            } catch (error) {
                logger.error(error);
            }
        } else {
            interaction.reply({ content: "The command does not exist or was not updated.", flags: MessageFlags.Ephemeral });
        }
    }
}