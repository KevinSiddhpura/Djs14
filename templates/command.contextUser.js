const { ApplicationCommandType, Colors } = require("discord.js");
const Command = require("../src/lib/command");
const { CreateMessage } = require("../src/lib/builders");

new Command({
    name: "User Snapshot",
    type: ApplicationCommandType.User,
    category: "Context-User",
    runContextUser: async (client, interaction) => {
        await interaction.deferReply();

        const user = interaction.targetUser;

        await new CreateMessage({
            embeds: [
                {
                    title: "Context User Template",
                    color: Colors.Aqua,
                    description: [
                        `User: <@${user.id}>`,
                        `Username: ${user.tag}`,
                        `Created: <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                    ].join("\n"),
                    footer: { text: `ID: ${user.id}` },
                    timestamp: new Date(),
                },
            ],
        }).send(interaction);
    },
});
