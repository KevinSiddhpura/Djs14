const path = require("path");
const fs = require("fs");
const axios = require("axios");
const { REST, Routes } = require("discord.js");
const logger = require("./utils/logger");
const { getCommands } = require("../handlers/command");
const { dev_guild, commandRegistration } = require("../config");

class Utils {
    static wait(time) {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    static async paste(data, site = "https://paste.kwin.in") {
        if (!data) throw new Error("No data provided");

        const res = await axios.post(`${site}/documents`, { content: data });
        if (!res.data || !res.data.key) throw new Error("Invalid response from paste site");
        return `${site}/${res.data.key}`;
    }

    static getFiles(dir, foldersOnly = false) {
        return fs
            .readdirSync(dir, { withFileTypes: true })
            .filter((file) => (foldersOnly ? file.isDirectory() : file.isFile()))
            .map((file) => path.join(dir, file.name));
    }

    static requireCommands() {
        const chatInputFolders = Utils.getFiles(path.join(__dirname, "../commands/chatInput"), true);
        const contextFolders = Utils.getFiles(path.join(__dirname, "../commands/context"), true);

        [...chatInputFolders, ...contextFolders].forEach((folder) => {
            Utils.getFiles(folder).forEach((file) => {
                if (file.endsWith(".js")) require(file);
            });
        });

        return true;
    }

    static async registerCommands(client) {
        const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
        const commands = getCommands();
        const isDevMode = process.argv.includes("--dev");

        try {
            logger.debug("Attempting to refresh commands");

            // In dev mode, always target the dev guild and force a full clear + register cycle.
            if (isDevMode) {
                if (!dev_guild) {
                    throw new Error("dev_guild is required when running with --dev.");
                }

                const devRoute = Routes.applicationGuildCommands(client.user.id, dev_guild);

                await rest.put(devRoute, { body: [] });
                logger.debug(`Cleared dev guild commands for guild ${dev_guild}`);

                const devData = await rest.put(devRoute, { body: commands });
                logger.info(`Successfully reloaded ${devData.length} dev guild commands`);
                return true;
            }

            const scopeSetting = commandRegistration?.scope || "auto";
            const useGuildScope = scopeSetting === "guild";

            if (useGuildScope && !dev_guild) {
                throw new Error("dev_guild is required when command registration scope is guild.");
            }

            const route = useGuildScope
                ? Routes.applicationGuildCommands(client.user.id, dev_guild)
                : Routes.applicationCommands(client.user.id);

            const body = process.argv.includes("--reset-cmds") ? [] : commands;
            const data = await rest.put(route, { body });
            logger.info(`Successfully reloaded ${data.length} commands`);
            return true;
        } catch (error) {
            logger.error(`Failed to register commands: ${error}`);
            return false;
        }
    }

    static findChannel(input, guild) {
        return guild.channels.cache.find((channel) => channel.name === input || channel.id === input);
    }

    static findRole(input, guild) {
        return guild.roles.cache.find((role) => role.name === input || role.id === input);
    }

    static capitalize(string, allWords = false) {
        return allWords
            ? string
                  .split(" ")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")
            : string.charAt(0).toUpperCase() + string.slice(1);
    }

    static splitArray(array, perArray) {
        const arrays = [];
        for (let i = 0; i < Math.ceil(array.length / perArray); i++) {
            arrays.push(array.slice(i * perArray, (i + 1) * perArray));
        }
        return arrays;
    }
}

module.exports = Utils;
