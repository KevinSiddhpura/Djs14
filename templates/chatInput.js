const { Colors } = require("discord.js");
const Command = require("../src/lib/command");
const { CreateMessage } = require("../src/lib/builders");

new Command({
    name: "example",
    category: "General",
    description: "Example slash command template.",
    runSlash: async (client, interaction) => {
        await new CreateMessage({
            embeds: [
                {
                    title: "Slash Command Template",
                    description: "Copy this file into src/commands/chatInput/<category>/ and customize it.",
                    color: Colors.Aqua,
                    timestamp: new Date(),
                },
            ],
        }).send(interaction);
    },
});
