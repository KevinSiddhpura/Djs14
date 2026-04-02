const { Colors } = require("discord.js");
const Command = require("../../../lib/command");
const { CreateMessage } = require("../../../lib/builders");

new Command({
    name: "server",
    category: "General",
    description: "Display quick server statistics.",
    runSlash: async (client, interaction) => {
        await interaction.deferReply();
        
        const guild = interaction.guild;

        if (!guild) {
            await new CreateMessage({ ephemeral: true })
                .content("This command can only be used in a server.")
                .send(interaction);
            return;
        }

        await new CreateMessage({
            embeds: [
                {
                    title: `${guild.name} Overview`,
                    color: Colors.Blurple,
                    thumbnail: { url: guild.iconURL({ size: 256 }) || undefined },
                    fields: [
                        { name: "Members", value: `${guild.memberCount}`, inline: true },
                        { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
                        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true },
                        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                    ],
                    footer: { text: `Guild ID: ${guild.id}` },
                },
            ],
        }).send(interaction);
    },
});