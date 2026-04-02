const { MessageFlags } = require("discord.js");

function normalizeInteractionPayload(payload = {}) {
    const normalized = { ...payload };

    const shouldFetchReply = Boolean(normalized.fetchReply);
    delete normalized.fetchReply;

    if (normalized.ephemeral) {
        normalized.flags = typeof normalized.flags === "number"
            ? (normalized.flags | MessageFlags.Ephemeral)
            : MessageFlags.Ephemeral;
        delete normalized.ephemeral;
    }

    return { normalized, shouldFetchReply };
}

function normalizeMessagePayload(payload = {}) {
    const normalized = { ...payload };
    delete normalized.fetchReply;
    delete normalized.ephemeral;

    if (typeof normalized.flags === "number" && (normalized.flags & MessageFlags.Ephemeral)) {
        delete normalized.flags;
    }

    return normalized;
}

async function safeReply(target, payload) {
    if (!target) throw new Error("safeReply: target is required");

    if (typeof target.isRepliable === "function" && target.isRepliable()) {
        const { normalized, shouldFetchReply } = normalizeInteractionPayload(payload);

        if (target.deferred || target.replied) {
            const result = await target.followUp(normalized);
            if (shouldFetchReply && typeof target.fetchReply === "function") {
                return target.fetchReply();
            }
            return result;
        }

        const result = await target.reply(normalized);
        if (shouldFetchReply && typeof target.fetchReply === "function") {
            return target.fetchReply();
        }
        return result;
    }

    const normalized = normalizeMessagePayload(payload);

    if (typeof target.reply === "function") return target.reply(normalized);
    if (typeof target.send === "function") return target.send(normalized);

    throw new Error("safeReply: unsupported target type");
}

module.exports = safeReply;
