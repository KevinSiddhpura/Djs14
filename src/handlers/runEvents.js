const Utils = require("../lib/utils");
const path = require("path");

module.exports = async (client) => {
    const eventFolders = Utils.getFiles(path.join(__dirname, "../events"), true);
    for (const folder of eventFolders) {
        const folderEventName = folder.split(path.sep).pop().split(".")[0];
        const eventName = folderEventName === "ready" ? "clientReady" : folderEventName;

        const files = Utils.getFiles(folder);
        files.sort((a, b) => a.localeCompare(b));

        for (const file of files) {
            if (!file.endsWith(".js")) continue;
            const event = require(file);
            if (event.once) {
                client.once(eventName, (...args) => event.run(client, ...args));
            } else {
                client.on(eventName, (...args) => event.run(client, ...args));
            }
        }
    }
};
