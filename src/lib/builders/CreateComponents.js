const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    UserSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    MentionableSelectMenuBuilder,
    TextInputBuilder,
    TextInputStyle,
} = require("discord.js");

class CreateComponents {
    constructor() {
        this.rows = [];
    }

    static button({ customId, label, emoji, style = ButtonStyle.Secondary, disabled = false }) {
        const button = new ButtonBuilder().setCustomId(customId).setStyle(style).setDisabled(disabled);
        if (label) button.setLabel(label);
        if (emoji) button.setEmoji(emoji);
        return button;
    }

    static linkButton({ url, label, emoji, disabled = false }) {
        const button = new ButtonBuilder().setURL(url).setStyle(ButtonStyle.Link).setDisabled(disabled);
        if (label) button.setLabel(label);
        if (emoji) button.setEmoji(emoji);
        return button;
    }

    static stringMenu({ customId, placeholder, minValues, maxValues, options = [], disabled = false }) {
        const menu = new StringSelectMenuBuilder().setCustomId(customId).setDisabled(disabled);
        if (placeholder) menu.setPlaceholder(placeholder);
        if (typeof minValues === "number") menu.setMinValues(minValues);
        if (typeof maxValues === "number") menu.setMaxValues(maxValues);
        if (options.length) menu.addOptions(options);
        return menu;
    }

    static userMenu({ customId, placeholder, minValues, maxValues, disabled = false }) {
        const menu = new UserSelectMenuBuilder().setCustomId(customId).setDisabled(disabled);
        if (placeholder) menu.setPlaceholder(placeholder);
        if (typeof minValues === "number") menu.setMinValues(minValues);
        if (typeof maxValues === "number") menu.setMaxValues(maxValues);
        return menu;
    }

    static roleMenu({ customId, placeholder, minValues, maxValues, disabled = false }) {
        const menu = new RoleSelectMenuBuilder().setCustomId(customId).setDisabled(disabled);
        if (placeholder) menu.setPlaceholder(placeholder);
        if (typeof minValues === "number") menu.setMinValues(minValues);
        if (typeof maxValues === "number") menu.setMaxValues(maxValues);
        return menu;
    }

    static channelMenu({ customId, placeholder, channelTypes, minValues, maxValues, disabled = false }) {
        const menu = new ChannelSelectMenuBuilder().setCustomId(customId).setDisabled(disabled);
        if (placeholder) menu.setPlaceholder(placeholder);
        if (Array.isArray(channelTypes) && channelTypes.length) menu.setChannelTypes(channelTypes);
        if (typeof minValues === "number") menu.setMinValues(minValues);
        if (typeof maxValues === "number") menu.setMaxValues(maxValues);
        return menu;
    }

    static mentionableMenu({ customId, placeholder, minValues, maxValues, disabled = false }) {
        const menu = new MentionableSelectMenuBuilder().setCustomId(customId).setDisabled(disabled);
        if (placeholder) menu.setPlaceholder(placeholder);
        if (typeof minValues === "number") menu.setMinValues(minValues);
        if (typeof maxValues === "number") menu.setMaxValues(maxValues);
        return menu;
    }

    static textInput({ customId, label, style = TextInputStyle.Short, placeholder, required = true, minLength, maxLength, value, omitLabel = false }) {
        const input = new TextInputBuilder().setCustomId(customId).setStyle(style).setRequired(required);
        if (!omitLabel) input.setLabel(label || "Input");
        if (placeholder) input.setPlaceholder(placeholder);
        if (typeof minLength === "number") input.setMinLength(minLength);
        if (typeof maxLength === "number") input.setMaxLength(maxLength);
        if (value) input.setValue(value);
        return input;
    }

    static row(components = []) {
        const row = new ActionRowBuilder();
        if (components.length) row.addComponents(...components);
        return row;
    }

    addRow(components = []) {
        this.rows.push(CreateComponents.row(components));
        return this;
    }

    build() {
        return this.rows;
    }
}

module.exports = CreateComponents;
