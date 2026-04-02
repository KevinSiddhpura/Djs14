const { ApplicationCommandType, Colors } = require("discord.js");
const { CreateMessage } = require("../../../lib/builders");
const Command = require("../../../lib/command");

new Command({
    name: "User Snapshot",
    type: ApplicationCommandType.User,
    category: "Context-User",
    runContextUser: async (client, interaction) => {
        await interaction.deferReply();

        const user = interaction.targetUser;
        const member = interaction.targetMember ?? interaction.guild?.members.cache.get(user.id);

        return new CreateMessage({
            embeds: [
                {
                    title: "User Snapshot",
                    color: Colors.Aqua,
                    description: [
                        `> **User: ** <@${user.id}> (\`${user.username}\`)`,
                        `> **Joined Server**: ${member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown"}`,
                        `> **Joined Discord**: <t:${(user.createdTimestamp / 1000).toFixed(0)}:R>`,
                    ].join("\n"),
                    thumbnail: {
                        url: user.displayAvatarURL({ dynamic: true }),
                    },
                    footer: {
                        text: `ID: ${user.id}`,
                        iconURL: user.displayAvatarURL({ dynamic: true }),
                    },
                    timestamp: new Date(),
                }
            ],
        }).send(interaction);
    }
})