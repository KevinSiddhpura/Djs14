const { Colors } = require("discord.js");
const Command = require("../../../lib/command");
const { CreateMessage } = require("../../../lib/builders");

new Command({
    name: "ping",
    category: "General",
    description: "Check bot and API latency.",
    runSlash: async (client, interaction) => {
        const now = Date.now();
        await interaction.deferReply();

        const roundTrip = Date.now() - now;
        const apiPing = Math.round(client.ws.ping);

        await new CreateMessage({
            embeds: [
                {
                    title: "Pong",
                    color: Colors.Green,
                    fields: [
                        { name: "Round Trip", value: `${roundTrip}ms`, inline: true },
                        { name: "WebSocket", value: `${apiPing}ms`, inline: true },
                    ],
                    timestamp: new Date(),
                },
            ],
        }).send(interaction);
    },
});