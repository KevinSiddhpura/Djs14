const { ButtonStyle, GatewayIntentBits } = require("discord.js");

module.exports = {
    dev_guild: "",
    devs: [""],

    // Keep intents minimal by default. Add privileged intents only if needed.
    clientIntents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],

    // Command registration mode: "auto" | "guild" | "global"
    commandRegistration: {
        scope: "auto",
    },

    prefixes: ["!"],

    paginationButtons: {
        toFirst: {
            emoji: "⏮️",
            style: ButtonStyle.Primary,
            disabled: false,
            showButton: true
        },
        toPrevious: {
            emoji: "⬅️",
            style: ButtonStyle.Secondary,
            disabled: false,
            showButton: true
        },
        toNext: {
            emoji: "➡️",
            style: ButtonStyle.Secondary,
            disabled: false,
            showButton: true
        },
        toLast: {
            emoji: "⏭️",
            style: ButtonStyle.Primary,
            disabled: false,
            showButton: true
        }
    },
}