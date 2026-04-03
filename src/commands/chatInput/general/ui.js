const { ButtonStyle, Colors } = require("discord.js");
const Command = require("../../../handlers/command");
const componentHandler = require("../../../handlers/interactions/componentHandler");
const { CreateMessage, CreateComponents } = require("../../../lib/builders");

const ensureOwner = async (interaction, ownerId) => {
    if (interaction.user.id === ownerId) return true;

    await new CreateMessage({ ephemeral: true })
        .content("Only the command invoker can use this UI.")
        .send(interaction);
    return false;
};

componentHandler.registerPrefix("ui:action:", async (client, interaction) => {
    const [, , action, ownerId] = interaction.customId.split(":");
    if (!(await ensureOwner(interaction, ownerId))) return;

    if (action === "close") {
        await interaction.update({
            content: "UI session closed.",
            components: [],
            embeds: [],
        });
        return;
    }

    if (action === "refresh") {
        await interaction.update({
            embeds: [
                {
                    title: "UI Playground",
                    color: Colors.Aqua,
                    description: "Use buttons or menus to test component handlers.",
                    footer: { text: `Refreshed by ${interaction.user.tag}` },
                    timestamp: new Date(),
                },
            ],
            components: [
                CreateComponents.row([
                    CreateComponents.button({
                        customId: `ui:action:refresh:${ownerId}`,
                        label: "Refresh",
                        style: ButtonStyle.Primary,
                    }),
                    CreateComponents.button({
                        customId: `ui:action:close:${ownerId}`,
                        label: "Close",
                        style: ButtonStyle.Danger,
                    }),
                ]),
                CreateComponents.row([
                    CreateComponents.stringMenu({
                        customId: `ui:menu:theme:${ownerId}`,
                        placeholder: "Pick a theme",
                        options: [
                            { label: "Aqua", value: "aqua" },
                            { label: "Amber", value: "amber" },
                            { label: "Emerald", value: "emerald" },
                        ],
                        minValues: 1,
                        maxValues: 1,
                    }),
                ]),
            ],
        });
    }
});

componentHandler.registerPrefix("ui:menu:", async (client, interaction) => {
    const [, , menuName, ownerId] = interaction.customId.split(":");
    if (!(await ensureOwner(interaction, ownerId))) return;

    await new CreateMessage({ ephemeral: true })
        .content(`${menuName} selected: ${interaction.values.join(", ")}`)
        .send(interaction);
});

new Command({
    name: "ui",
    category: "General",
    description: "Open an interactive UI playground (buttons + select menus).",
    runSlash: async (client, interaction) => {
        const ownerId = interaction.user.id;

        await new CreateMessage({
            embeds: [
                {
                    title: "UI Playground",
                    color: Colors.Aqua,
                    description: "Use buttons or menus to test component handlers.",
                    footer: { text: `Owner: ${interaction.user.tag}` },
                    timestamp: new Date(),
                },
            ],
            components: [
                CreateComponents.row([
                    CreateComponents.button({
                        customId: `ui:action:refresh:${ownerId}`,
                        label: "Refresh",
                        style: ButtonStyle.Primary,
                    }),
                    CreateComponents.button({
                        customId: `ui:action:close:${ownerId}`,
                        label: "Close",
                        style: ButtonStyle.Danger,
                    }),
                ]),
                CreateComponents.row([
                    CreateComponents.stringMenu({
                        customId: `ui:menu:theme:${ownerId}`,
                        placeholder: "Pick a theme",
                        options: [
                            { label: "Aqua", value: "aqua" },
                            { label: "Amber", value: "amber" },
                            { label: "Emerald", value: "emerald" },
                        ],
                        minValues: 1,
                        maxValues: 1,
                    }),
                ]),
            ],
        }).send(interaction);
    },
});