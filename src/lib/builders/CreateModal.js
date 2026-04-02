const { ModalBuilder, LabelBuilder } = require("discord.js");
const CreateComponents = require("./CreateComponents");

class CreateModal {
    constructor(customId, title) {
        if (!customId) throw new Error("CreateModal: customId is required");
        if (!title) throw new Error("CreateModal: title is required");

        this.customId = customId;
        this.title = title;
        this.labels = [];
    }

    textInput(options) {
        const { label: labelText, ...inputOptions } = options;
        const input = CreateComponents.textInput({ ...inputOptions, omitLabel: true });
        const label = new LabelBuilder()
            .setLabel(labelText || "Input")
            .setTextInputComponent(input);

        this.labels.push(label);
        return this;
    }

    label(builder) {
        this.labels.push(builder);
        return this;
    }

    build() {
        const modal = new ModalBuilder().setCustomId(this.customId).setTitle(this.title);

        if (this.labels.length > 0) {
            modal.addLabelComponents(...this.labels);
        }

        return modal;
    }

    async show(interaction) {
        return interaction.showModal(this.build());
    }
}

module.exports = CreateModal;
