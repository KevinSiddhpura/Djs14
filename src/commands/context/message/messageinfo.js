const { ApplicationCommandType, Colors } = require("discord.js");
const { CreateMessage } = require("../../../lib/builders");
const Command = require("../../../handlers/command");

new Command({
    name: "Message Snapshot",
    type: ApplicationCommandType.Message,
    category: "Context-Message",
    runContextMessage: async (client, interaction) => {
        await interaction.deferReply();

        const message = interaction.targetMessage;
        const preview = message.content?.length
            ? message.content.slice(0, 1000)
            : "No text content";

        return new CreateMessage({
            embeds: [
                {
                    title: "Message Snapshot",
                    color: Colors.Aqua,
                    description: [
                        `- **Sent By:** <@${message.author.id}> (${message.author.id})`,
                        `- **Sent In:** <#${interaction.channel.id}> (${interaction.channel.id})`,
                        `- **Embeds:** ${message.embeds.length || "None"}`,
                        `- **Attachments:** ${message.attachments.size || "None"}`,
                        `- **Reactions:** ${message.reactions.cache.size || "None"}`,
                        "",
                        "**Content Preview**",
                        "```",
                        preview,
                        "```",
                    ].join("\n"),
                    footer: {
                        text: `Message ID: ${message.id}`,
                        iconURL: message.author.displayAvatarURL(),
                    },
                    timestamp: new Date(),
                },
            ],
        }).send(interaction);
    }
})