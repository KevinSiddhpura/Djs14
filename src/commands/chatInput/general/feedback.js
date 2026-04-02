const { Colors, TextInputStyle } = require("discord.js");
const Command = require("../../../lib/command");
const modalHandler = require("../../../handlers/interactions/modalHandler");
const { CreateMessage, CreateModal } = require("../../../lib/builders");
const Database = require("../../../lib/database");
const logger = require("../../../lib/logger");

const feedbackDb = new Database("feedback.db");
feedbackDb.createTable(
    "feedback_entries",
    [
        "id INTEGER PRIMARY KEY AUTOINCREMENT",
        "guildId TEXT",
        "channelId TEXT",
        "userId TEXT NOT NULL",
        "username TEXT NOT NULL",
        "topic TEXT NOT NULL",
        "details TEXT NOT NULL",
        "createdAt INTEGER NOT NULL",
    ].join(", ")
);

modalHandler.registerPrefix("feedback:submit:", async (client, interaction) => {
    const ownerId = interaction.customId.split(":").at(-1);

    if (interaction.user.id !== ownerId) {
        await new CreateMessage({ ephemeral: true })
            .content("Only the command invoker can submit this feedback form.")
            .send(interaction);
        return;
    }

    const topic = interaction.fields.getTextInputValue("topic");
    const details = interaction.fields.getTextInputValue("details");

    try {
        feedbackDb.insert("feedback_entries", {
            guildId: interaction.guildId ?? null,
            channelId: interaction.channelId ?? null,
            userId: interaction.user.id,
            username: interaction.user.tag,
            topic,
            details,
            createdAt: Date.now(),
        });
    } catch (error) {
        logger.error(`Failed to store feedback entry: ${error}`);

        await new CreateMessage({ ephemeral: true })
            .content("Feedback was received, but saving to database failed.")
            .send(interaction);
        return;
    }

    await new CreateMessage({
        ephemeral: true,
        embeds: [
            {
                title: "Feedback Received",
                color: Colors.Green,
                fields: [
                    { name: "Topic", value: topic },
                    { name: "Details", value: details.slice(0, 1024) },
                ],
                footer: { text: `Saved for ${interaction.user.tag}` },
                timestamp: new Date(),
            },
        ],
    }).send(interaction);
});

new Command({
    name: "feedback",
    category: "General",
    description: "Open a feedback modal and submit structured input.",
    runSlash: async (client, interaction) => {
        const modal = new CreateModal(`feedback:submit:${interaction.user.id}`, "Feedback")
            .textInput({
                customId: "topic",
                label: "Topic",
                style: TextInputStyle.Short,
                placeholder: "Bug report, idea, request...",
                minLength: 3,
                maxLength: 80,
            })
            .textInput({
                customId: "details",
                label: "Details",
                style: TextInputStyle.Paragraph,
                placeholder: "Share enough details so we can act on this.",
                minLength: 10,
                maxLength: 1000,
            });

        await modal.show(interaction);
    },
});