const { ApplicationCommandType, Colors } = require("discord.js");
const Command = require("../src/lib/command");
const { CreateMessage } = require("../src/lib/builders");

new Command({
    name: "Message Snapshot",
    type: ApplicationCommandType.Message,
    category: "Context-Message",
    runContextMessage: async (client, interaction) => {
        await interaction.deferReply();

        const message = interaction.targetMessage;

        await new CreateMessage({
            embeds: [
                {
                    title: "Context Message Template",
                    color: Colors.Aqua,
                    description: [
                        `Author: <@${message.author.id}>`,
                        `Channel: <#${interaction.channelId}>`,
                        `Preview: ${message.content?.slice(0, 100) || "No content"}`,
                    ].join("\n"),
                    footer: { text: `Message ID: ${message.id}` },
                    timestamp: new Date(),
                },
            ],
        }).send(interaction);
    },
});
