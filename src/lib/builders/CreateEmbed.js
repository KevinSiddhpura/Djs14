const { EmbedBuilder, Colors } = require("discord.js");

class CreateEmbed {
    constructor(input = {}) {
        this.embed = new EmbedBuilder().setColor(Colors.DarkButNotBlack);

        if (input.title) this.title(input.title);
        if (input.description) this.description(input.description);
        if (input.color) this.color(input.color);
        if (input.thumbnail) this.thumbnail(input.thumbnail);
        if (input.image) this.image(input.image);
        if (input.footer) this.footer(input.footer.text, input.footer.iconURL);
        if (input.author) this.author(input.author.name, input.author.iconURL);
        if (input.fields?.length) this.fields(input.fields);
        if (input.timestamp) this.timestamp();
    }

    title(value) {
        this.embed.setTitle(value);
        return this;
    }

    description(value) {
        this.embed.setDescription(value);
        return this;
    }

    color(value) {
        this.embed.setColor(value);
        return this;
    }

    thumbnail(url) {
        this.embed.setThumbnail(url);
        return this;
    }

    image(url) {
        this.embed.setImage(url);
        return this;
    }

    footer(text, iconURL) {
        this.embed.setFooter({ text, iconURL });
        return this;
    }

    author(name, iconURL) {
        this.embed.setAuthor({ name, iconURL });
        return this;
    }

    field(field) {
        this.embed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline ?? false,
        });
        return this;
    }

    fields(fields) {
        for (const field of fields) this.field(field);
        return this;
    }

    timestamp() {
        this.embed.setTimestamp();
        return this;
    }

    build() {
        return this.embed;
    }
}

module.exports = CreateEmbed;
