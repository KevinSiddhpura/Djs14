const { ApplicationCommandOptionType, ApplicationCommandType } = require("discord.js");
const Command = require("../../../lib/command");
const { getCommands } = require("../../../lib/command");
const Pagination = require("../../../handlers/pagination");
const { splitArray } = require("../../../lib/utils");
const { CreateMessage } = require("../../../lib/builders");

const commandLabel = (command) => {
    if (command.type === ApplicationCommandType.ChatInput) return `/${command.name}`;
    return command.name;
};

new Command({
    name: "help",
    category: "General",
    description: "Browse all available commands.",
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "category",
            description: "Filter commands by category",
            required: false,
            autocomplete: true,
        },
    ],
    runAutocomplete: async (client, interaction) => {
        const focused = interaction.options.getFocused(true).value.toLowerCase();
        const categories = [...new Set(getCommands().map((cmd) => cmd.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b));

        const filtered = categories
            .filter((category) => category.toLowerCase().includes(focused))
            .slice(0, 25)
            .map((category) => ({ name: category, value: category }));

        await interaction.respond(filtered);
    },
    runSlash: async (client, interaction) => {
        const selectedCategory = interaction.options.getString("category");
        const allCommands = getCommands();

        const visible = allCommands
            .filter((command) => !selectedCategory || command.category === selectedCategory)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (!visible.length) {
            await new CreateMessage({ ephemeral: true })
                .content("No commands found for that category.")
                .send(interaction);
            return;
        }

        const initialMessage = await new CreateMessage({
            content: "Loading help pages...",
            fetchReply: true,
        }).send(interaction);

        const chunks = splitArray(visible, 6);
        const pages = chunks.map((chunk, index) => ({
            content: `Page ${index + 1}/${chunks.length}`,
            embeds: [
                {
                    title: selectedCategory ? `Help: ${selectedCategory}` : "Help: All Commands",
                    description: chunk
                        .map((command) => `- **${commandLabel(command)}** [${command.category}]\n  ${command.description || "No description"}`)
                        .join("\n"),
                },
            ],
        }));

        new Pagination(initialMessage, pages, interaction.user.id).paginate();
    },
});