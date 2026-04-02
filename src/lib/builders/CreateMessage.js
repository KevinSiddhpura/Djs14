const safeReply = require("../utils/safeReply");
const CreateEmbed = require("./CreateEmbed");
const CreateComponents = require("./CreateComponents");
const { MessageFlags } = require("discord.js");

/**
 * @typedef {Object} CreateMessageEmbedInput
 * @property {string} [title]
 * @property {string} [description]
 * @property {number} [color]
 * @property {string} [url]
 * @property {{ name: string, url?: string, icon_url?: string, iconURL?: string }} [author]
 * @property {{ text: string, icon_url?: string, iconURL?: string }} [footer]
 * @property {Array<{ name: string, value: string, inline?: boolean }>} [fields]
 * @property {{ url: string }} [image]
 * @property {{ url: string }} [thumbnail]
 * @property {string|number|Date} [timestamp]
 */

/**
 * @typedef {Object} CreateMessagePayload
 * @property {string} [content]
 * @property {Array<CreateMessageEmbedInput | any>} [embeds]
 * @property {Array<any>} [components]
 * @property {Array<any>} [files]
 * @property {Array<any>} [attachments]
 * @property {import("discord.js").AllowedMentions} [allowedMentions]
 * @property {number} [flags]
 * @property {boolean} [fetchReply]
 * @property {boolean} [ephemeral]
 */

class CreateMessage {
    /**
     * @param {CreateMessagePayload} [options]
     */
    constructor(options = {}) {
        const {
            content,
            embeds,
            components,
            files,
            attachments,
            allowedMentions,
            flags,
            fetchReply,
            ephemeral,
        } = options;

        this.payload = {
            content: undefined,
            embeds: [],
            components: [],
            files: [],
            attachments: undefined,
            allowedMentions,
            flags,
            fetchReply,
        };

        this._ephemeral = Boolean(ephemeral);

        if (typeof content !== "undefined") this.content(content);
        if (Array.isArray(embeds)) this.embeds(embeds);
        if (Array.isArray(components)) this.components(components);
        if (Array.isArray(files)) this.files(files);
        if (Array.isArray(attachments)) this.payload.attachments = attachments;

        return this._createPayloadProxy();
    }

    _createPayloadProxy() {
        const self = this;

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target) {
                    const value = Reflect.get(target, prop, receiver);
                    return typeof value === "function" ? value.bind(target) : value;
                }

                const built = self.build();
                return built[prop];
            },
            has(target, prop) {
                if (prop in target) return true;
                return prop in self.build();
            },
            ownKeys(target) {
                const targetKeys = Reflect.ownKeys(target);
                const payloadKeys = Reflect.ownKeys(self.build());
                return [...new Set([...payloadKeys, ...targetKeys])];
            },
            getOwnPropertyDescriptor(target, prop) {
                const built = self.build();

                if (prop in built) {
                    return {
                        configurable: true,
                        enumerable: true,
                        writable: true,
                        value: built[prop],
                    };
                }

                return Object.getOwnPropertyDescriptor(target, prop);
            },
        });
    }

    content(value) {
        this.payload.content = value;
        return this;
    }

    embed(value) {
        if (value instanceof CreateEmbed) {
            this.payload.embeds.push(value.build());
            return this;
        }

        if (value && typeof value.build === "function" && typeof value.setTitle === "undefined") {
            this.payload.embeds.push(value.build());
            return this;
        }

        if (value && typeof value === "object" && !Array.isArray(value)) {
            this.payload.embeds.push({ ...value });
            return this;
        }

        this.payload.embeds.push(value);
        return this;
    }

    embeds(values) {
        for (const value of values) this.embed(value);
        return this;
    }

    component(value) {
        // Allows shorthand rows: components: [[buttonA, buttonB], [menuA]]
        if (Array.isArray(value)) {
            this.payload.components.push(CreateComponents.row(value));
            return this;
        }

        if (value instanceof CreateComponents) {
            this.payload.components.push(...value.build());
            return this;
        }

        if (value && typeof value.build === "function" && Array.isArray(value.build())) {
            this.payload.components.push(...value.build());
            return this;
        }

        this.payload.components.push(value);
        return this;
    }

    components(values) {
        for (const value of values) this.component(value);
        return this;
    }

    file(value) {
        this.payload.files.push(value);
        return this;
    }

    files(values) {
        this.payload.files.push(...values);
        return this;
    }

    allowedMentions(value) {
        this.payload.allowedMentions = value;
        return this;
    }

    ephemeral(value = true) {
        this._ephemeral = value;
        return this;
    }

    fetchReply(value = true) {
        this.payload.fetchReply = value;
        return this;
    }

    clearEmbeds() {
        this.payload.embeds = [];
        return this;
    }

    clearComponents() {
        this.payload.components = [];
        return this;
    }

    clearFiles() {
        this.payload.files = [];
        return this;
    }

    validate() {
        if (this.payload.content && this.payload.content.length > 2000) {
            throw new Error("CreateMessage: content exceeds 2000 characters");
        }

        if (this.payload.embeds.length > 10) {
            throw new Error("CreateMessage: embeds exceed Discord limit (10)");
        }

        return this;
    }

    build() {
        this.validate();

        let resolvedFlags = this.payload.flags;
        if (this._ephemeral) {
            resolvedFlags = typeof resolvedFlags === "number"
                ? (resolvedFlags | MessageFlags.Ephemeral)
                : MessageFlags.Ephemeral;
        }

        const finalPayload = {
            ...this.payload,
            flags: resolvedFlags,
            embeds: this.payload.embeds.length ? this.payload.embeds : undefined,
            components: this.payload.components.length ? this.payload.components : undefined,
            files: this.payload.files.length ? this.payload.files : undefined,
            attachments:
                Array.isArray(this.payload.attachments) && this.payload.attachments.length
                    ? this.payload.attachments
                    : this.payload.attachments,
        };

        return finalPayload;
    }

    toJSON() {
        return this.build();
    }

    valueOf() {
        return this.build();
    }

    async send(target) {
        return safeReply(target, this.build());
    }
}

module.exports = CreateMessage;
