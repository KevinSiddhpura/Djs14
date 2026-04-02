const { ApplicationCommandOptionType, Colors } = require("discord.js");
const Command = require("../../../lib/command");
const logger = require("../../../lib/logger");
const util = require("util");
const { CreateEmbed } = require("../../../lib/builders");

new Command({
    name: "eval",
    description: "Evaluate JS code.",
    devOnly: true,
    category: "Dev",
    options: [{
        type: ApplicationCommandOptionType.String,
        name: "code",
        description: "The code to evaluate.",
        required: true
    }],
    aliases: ["e"],
    runSlash: async (client, interaction) => {
        await interaction.deferReply();
        const inputCode = interaction.options.getString("code");

        const baseEmbed = new CreateEmbed()
            .title("Evaluated Code")
            .field({
                name: "Input",
                value: `\`\`\`js\n${inputCode}\n\`\`\``,
            })
            .color(Colors.Aqua)
            .footer(`Requested by ${interaction.user.username}`, interaction.user.displayAvatarURL())
            .timestamp();

        await interaction.editReply({
            embeds: [baseEmbed.description("```Processing given code....```").build()]
        });

        try {
            let evaled = await eval(inputCode);

            if (typeof evaled !== "string") evaled = util.inspect(evaled, { depth: 1 });
            if (evaled.length > 4000) evaled = evaled.substring(0, 4000) + "...";
            await interaction.editReply({
                embeds: [baseEmbed.description(`\`\`\`js\n${evaled}\n\`\`\``).color(Colors.Aqua).build()]
            });
        } catch (error) {
            logger.error(error);
            await interaction.editReply({
                embeds: [baseEmbed.description(`\`\`\`js\n${error}\n\`\`\``).color(Colors.Red).build()]
            })
        }
    }
})