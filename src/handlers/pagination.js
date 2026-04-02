const { Message } = require("discord.js");
const { paginationButtons } = require("../config");
const logger = require("../lib/logger");
const { CreateMessage, CreateComponents } = require("../lib/builders");

function normalizePage(page) {
    if (page instanceof CreateMessage) return page.build();
    if (page && typeof page.build === "function") return page.build();
    return page || {};
}

function getButtonRows(currentPageIndex, pageCount) {
    const components = [];

    if (paginationButtons.toFirst.showButton) {
        components.push(
            CreateComponents.button({
                customId: "paginate-first",
                emoji: paginationButtons.toFirst.emoji,
                style: paginationButtons.toFirst.style,
                disabled: currentPageIndex === 0,
                label: paginationButtons.toFirst?.label || " ",
            })
        );
    }

    if (paginationButtons.toPrevious.showButton) {
        components.push(
            CreateComponents.button({
                customId: "paginate-previous",
                emoji: paginationButtons.toPrevious.emoji,
                style: paginationButtons.toPrevious.style,
                disabled: currentPageIndex === 0,
                label: paginationButtons.toPrevious?.label || " ",
            })
        );
    }

    if (paginationButtons.toNext.showButton) {
        components.push(
            CreateComponents.button({
                customId: "paginate-next",
                emoji: paginationButtons.toNext.emoji,
                style: paginationButtons.toNext.style,
                disabled: currentPageIndex === pageCount - 1,
                label: paginationButtons.toNext?.label || " ",
            })
        );
    }

    if (paginationButtons.toLast.showButton) {
        components.push(
            CreateComponents.button({
                customId: "paginate-last",
                emoji: paginationButtons.toLast.emoji,
                style: paginationButtons.toLast.style,
                disabled: currentPageIndex === pageCount - 1,
                label: paginationButtons.toLast?.label || " ",
            })
        );
    }

    return [CreateComponents.row(components)];
}

class Pagination {
    /**
     * @param {Message} message
     * @param {Array<object | CreateMessage>} pages
     * @param {string | string[]} usersAllowed
     */
    constructor(message, pages, usersAllowed) {
        if (!message) {
            logger.error("Pagination: Message object is not provided");
            return;
        }

        if (!Array.isArray(pages) || !pages.length) {
            logger.error("Pagination: Message options are not provided");
            return;
        }

        if (!usersAllowed) {
            logger.error("Pagination: Users allowed are not provided");
            return;
        }

        this.pages = pages.map((page) => normalizePage(page));
        this.message = message;
        this.usersAllowed = usersAllowed;
        this.currentPageIndex = 0;
    }

    async render() {
        const page = this.pages[this.currentPageIndex];
        const components = getButtonRows(this.currentPageIndex, this.pages.length);

        await this.message.edit({
            content: page.content || null,
            embeds: page.embeds || [],
            components,
            files: page.files,
            allowedMentions: page.allowedMentions,
        });
    }

    async paginate() {
        const filter = (i) =>
            Array.isArray(this.usersAllowed)
                ? this.usersAllowed.includes(i.user.id)
                : i.user.id === this.usersAllowed;

        const collector = this.message.createMessageComponentCollector({ filter, time: 60000 * 10 });

        collector.on("collect", async (interaction) => {
            switch (interaction.customId) {
                case "paginate-first":
                    this.currentPageIndex = 0;
                    break;
                case "paginate-previous":
                    this.currentPageIndex = Math.max(this.currentPageIndex - 1, 0);
                    break;
                case "paginate-next":
                    this.currentPageIndex = Math.min(this.currentPageIndex + 1, this.pages.length - 1);
                    break;
                case "paginate-last":
                    this.currentPageIndex = this.pages.length - 1;
                    break;
                default:
                    break;
            }

            await this.render().catch(() => null);
            await interaction.deferUpdate().catch(() => null);
        });

        collector.on("end", () => {
            this.message.edit({ components: [] }).catch(() => null);
        });

        await this.render().catch(() => null);
    }
}

module.exports = Pagination;
