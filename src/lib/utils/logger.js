const kleur = require("kleur");
const util = require("util");

const LEVEL = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

const CONSOLE = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
};

const LABEL = {
    error: "ERROR",
    warn: "WARN ",
    info: "INFO ",
    debug: "DEBUG",
};

const COLOR = {
    error: (text) => kleur.red(text),
    warn: (text) => kleur.yellow(text),
    info: (text) => kleur.green(text),
    debug: (text) => kleur.gray(text),
};

function getThreshold() {
    const envLevel = String(process.env.LOG_LEVEL || "info").toLowerCase();
    return LEVEL[envLevel] ?? LEVEL.info;
}

function showTimestamp() {
    return String(process.env.LOG_TIME || "false").toLowerCase() === "true";
}

function showErrorStack() {
    const flag = String(process.env.LOG_STACK || "auto").toLowerCase();
    if (flag === "true") return true;
    if (flag === "false") return false;
    return getThreshold() >= LEVEL.debug;
}

function shouldLog(level) {
    return LEVEL[level] <= getThreshold();
}

function formatValue(value) {
    if (typeof value === "string") return value;
    if (value instanceof Error) return showErrorStack() ? (value.stack || value.message) : value.message;
    return util.inspect(value, { depth: 3, colors: false, compact: true, breakLength: 100 });
}

function normalizeArgs(args) {
    const values = [...args];
    let scope = null;

    if (
        values.length >= 2 &&
        typeof values[0] === "string" &&
        (typeof values[1] === "string" || values[1] instanceof Error)
    ) {
        scope = values.shift();
    }

    if (values.length === 0) {
        return { scope, message: "", meta: [] };
    }

    const first = values.shift();

    if (first instanceof Error) {
        return {
            scope,
            message: first.message,
            meta: [first, ...values],
        };
    }

    return {
        scope,
        message: formatValue(first),
        meta: values,
    };
}

function write(level, ...args) {
    if (!shouldLog(level)) return;

    const { scope, message, meta } = normalizeArgs(args);
    const badge = COLOR[level](`[${LABEL[level]}]`);
    const timeText = showTimestamp()
        ? kleur.gray(new Date().toISOString().slice(11, 19))
        : "";
    const scopeText = scope ? kleur.gray(`${scope}:`) : "";
    const line = [timeText, badge, scopeText, message].filter(Boolean).join(" ");

    const renderedMeta = meta.map(formatValue);
    CONSOLE[level](line, ...renderedMeta);
}

const logger = {
    error: (...args) => write("error", ...args),
    warn: (...args) => write("warn", ...args),
    info: (...args) => write("info", ...args),
    debug: (...args) => write("debug", ...args),
};

module.exports = logger;
