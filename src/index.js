const { config } = require("dotenv");
config();

const { initialize } = require("./lib/database");
const { Client, GatewayIntentBits } = require("discord.js");
const runEvents = require("./handlers/runEvents");
const logger = require("./lib/logger");
const Utils = require("./lib/utils");
const botConfig = require("./config");

initialize();
Utils.requireCommands();

const token = process.env.DISCORD_TOKEN;
if (!token || token === "YOUR_BOT_TOKEN") {
    logger.error("Missing DISCORD_TOKEN. Set a valid token in .env before starting the bot.");
    process.exit(1);
}

const configuredIntents = Array.isArray(botConfig.clientIntents) && botConfig.clientIntents.length
    ? botConfig.clientIntents
    : [GatewayIntentBits.Guilds];

const client = new Client({
    intents: configuredIntents,
});

runEvents(client);

client.login(token).catch((err) => {
    logger.error(err);
    process.exit(1);
});

process.on("unhandledRejection", (err) => {
    logger.error(err);
});

process.on("uncaughtException", (err) => {
    logger.error(err);
});

module.exports = client;