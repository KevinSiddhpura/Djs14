const {
    ApplicationCommandOptionType,
    Colors,
    PermissionFlagsBits,
} = require('discord.js');
const Addon = require('../src/lib/utils/addonBase');
const { AddonCommand, AddonEvent } = require('../src/lib/utils/addonBase');
const { CreateMessage, CreateEmbed } = require('../src/lib/builders');
const Database = require('../src/handlers/database');
const Utils = require('../src/utils/utils');

const modDb = new Database('moderation.db');
modDb.createTable(
    'mod_history',
    [
        'id INTEGER PRIMARY KEY AUTOINCREMENT',
        'guildId TEXT NOT NULL',
        'action TEXT NOT NULL',
        'targetId TEXT NOT NULL',
        'moderatorId TEXT NOT NULL',
        'reason TEXT',
        'durationMs INTEGER',
        'expiresAt INTEGER',
        'resolved INTEGER NOT NULL DEFAULT 0',
        'createdAt INTEGER NOT NULL',
        'resolvedAt INTEGER',
    ].join(', ')
);

function parseDuration(input) {
    if (!input) return null;
    const raw = String(input).trim().toLowerCase();
    const match = raw.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
}

function formatDuration(ms) {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
}

class Moderator extends Addon {
    constructor() {
        super({
            name: 'Moderator',
            developer: 'Kevin',
            description: 'Basic moderation toolkit with history and temp bans.',
            version: '1.0.0',
            enabled: true,
        });

        this.sweepTimer = null;
    }

    buildConfig() {
        return {
            enabled: true,
            config: {
                historyDefaultLimit: 10,
                historyMaxLimit: 25,
                tempBanSweepIntervalMs: 60_000,
            },
            lang: {
                invalidDuration: 'Invalid duration. Use values like 10m, 2h, or 7d.',
            },
        };
    }

    async onEnable(client) {
        await this.sweepExpiredTempBans(client).catch(() => { });

        const sweepIntervalMs = Number(this.cfg('tempBanSweepIntervalMs', 60_000));
        if (sweepIntervalMs > 0) {
            this.sweepTimer = setInterval(() => {
                this.sweepExpiredTempBans(client).catch(() => { });
            }, sweepIntervalMs);
        }
    }

    async onDisable() {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }

    async onUnload() {
        if (this.sweepTimer) {
            clearInterval(this.sweepTimer);
            this.sweepTimer = null;
        }
    }

    canActOnTarget(interaction, targetMember) {
        if (!targetMember) return { ok: false, message: 'Target member not found in this server.' };

        if (targetMember.id === interaction.user.id) {
            return { ok: false, message: 'You cannot moderate yourself.' };
        }

        if (targetMember.id === interaction.client.user.id) {
            return { ok: false, message: 'You cannot moderate the bot.' };
        }

        if (interaction.guild.ownerId !== interaction.user.id && interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
            return { ok: false, message: 'You cannot moderate a member with an equal or higher role.' };
        }

        const botMember = interaction.guild.members.me;
        if (botMember && botMember.roles.highest.position <= targetMember.roles.highest.position) {
            return { ok: false, message: 'Bot role is not high enough to moderate this member.' };
        }

        return { ok: true };
    }

    sanitizeReason(reason) {
        const trimmed = String(reason || '').trim();
        return trimmed || 'No reason provided.';
    }

    addHistoryEntry({ guildId, action, targetId, moderatorId, reason, durationMs = null, expiresAt = null, resolved = 0 }) {
        modDb.insert('mod_history', {
            guildId,
            action,
            targetId,
            moderatorId,
            reason,
            durationMs,
            expiresAt,
            resolved,
            createdAt: Date.now(),
            resolvedAt: null,
        });
    }

    getHistory(guildId, targetId, limit) {
        const db = modDb.getDatabase();

        if (targetId) {
            return db
                .prepare(
                    `SELECT * FROM mod_history
           WHERE guildId = ? AND targetId = ?
           ORDER BY createdAt DESC
           LIMIT ?`
                )
                .all(guildId, targetId, limit);
        }

        return db
            .prepare(
                `SELECT * FROM mod_history
         WHERE guildId = ?
         ORDER BY createdAt DESC
         LIMIT ?`
            )
            .all(guildId, limit);
    }

    async sweepExpiredTempBans(client) {
        const now = Date.now();
        const db = modDb.getDatabase();
        const rows = db
            .prepare(
                `SELECT * FROM mod_history
         WHERE action = 'TEMPBAN' AND resolved = 0 AND expiresAt IS NOT NULL AND expiresAt <= ?`
            )
            .all(now);

        for (const row of rows) {
            const guild = client.guilds.cache.get(row.guildId);
            if (!guild) {
                db.prepare('UPDATE mod_history SET resolved = 1, resolvedAt = ? WHERE id = ?').run(Date.now(), row.id);
                continue;
            }

            try {
                await guild.bans.remove(row.targetId, 'Temporary ban expired');
            } catch {
                // Ignore errors (e.g. user already unbanned)
            }

            db.prepare('UPDATE mod_history SET resolved = 1, resolvedAt = ? WHERE id = ?').run(Date.now(), row.id);
        }
    }

    async runTimeout(interaction) {
        const targetUser = interaction.options.getUser('user', true);
        const durationInput = interaction.options.getString('duration', true);
        const reason = this.sanitizeReason(interaction.options.getString('reason'));

        const durationMs = parseDuration(durationInput);
        if (!durationMs || durationMs < 5_000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
            await new CreateMessage({ ephemeral: true })
                .content(this.t('invalidDuration', 'Invalid duration. Use values like 10m, 2h, or 7d.'))
                .send(interaction);
            return;
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        const gate = this.canActOnTarget(interaction, targetMember);
        if (!gate.ok) {
            await new CreateMessage({ ephemeral: true }).content(gate.message).send(interaction);
            return;
        }

        if (!targetMember.moderatable) {
            await new CreateMessage({ ephemeral: true })
                .content('This member cannot be timed out by the bot (role or permission mismatch).')
                .send(interaction);
            return;
        }

        await targetMember.timeout(durationMs, reason);

        this.addHistoryEntry({
            guildId: interaction.guildId,
            action: 'TIMEOUT',
            targetId: targetUser.id,
            moderatorId: interaction.user.id,
            reason,
            durationMs,
        });

        await new CreateMessage({
            ephemeral: true,
            embeds: [
                new CreateEmbed()
                    .title('Timeout Applied')
                    .color(Colors.Orange)
                    .description(`${targetUser} was timed out for **${formatDuration(durationMs)}**.`)
                    .fields([
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                    ])
                    .timestamp(),
            ],
        }).send(interaction);
    }

    async runKick(interaction) {
        const targetUser = interaction.options.getUser('user', true);
        const reason = this.sanitizeReason(interaction.options.getString('reason'));
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        const gate = this.canActOnTarget(interaction, targetMember);
        if (!gate.ok) {
            await new CreateMessage({ ephemeral: true }).content(gate.message).send(interaction);
            return;
        }

        if (!targetMember.kickable) {
            await new CreateMessage({ ephemeral: true })
                .content('This member cannot be kicked by the bot (role or permission mismatch).')
                .send(interaction);
            return;
        }

        await targetMember.kick(reason);

        this.addHistoryEntry({
            guildId: interaction.guildId,
            action: 'KICK',
            targetId: targetUser.id,
            moderatorId: interaction.user.id,
            reason,
        });

        await new CreateMessage({
            ephemeral: true,
            embeds: [
                new CreateEmbed()
                    .title('Member Kicked')
                    .color(Colors.Red)
                    .description(`${targetUser.tag} was kicked.`)
                    .fields([
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                    ])
                    .timestamp(),
            ],
        }).send(interaction);
    }

    async runBan(interaction) {
        const targetUser = interaction.options.getUser('user', true);
        const reason = this.sanitizeReason(interaction.options.getString('reason'));
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (targetMember) {
            const gate = this.canActOnTarget(interaction, targetMember);
            if (!gate.ok) {
                await new CreateMessage({ ephemeral: true }).content(gate.message).send(interaction);
                return;
            }
        } else if (targetUser.id === interaction.user.id) {
            await new CreateMessage({ ephemeral: true }).content('You cannot ban yourself.').send(interaction);
            return;
        }

        await interaction.guild.members.ban(targetUser.id, { reason });

        this.addHistoryEntry({
            guildId: interaction.guildId,
            action: 'BAN',
            targetId: targetUser.id,
            moderatorId: interaction.user.id,
            reason,
        });

        await new CreateMessage({
            ephemeral: true,
            embeds: [
                new CreateEmbed()
                    .title('Member Banned')
                    .color(Colors.DarkRed)
                    .description(`${targetUser.tag} was banned.`)
                    .fields([
                        { name: 'Reason', value: reason },
                        { name: 'Moderator', value: interaction.user.toString(), inline: true },
                    ])
                    .timestamp(),
            ],
        }).send(interaction);
    }

    async runTempBan(interaction) {
        const targetUser = interaction.options.getUser('user', true);
        const durationInput = interaction.options.getString('duration', true);
        const reason = this.sanitizeReason(interaction.options.getString('reason'));

        const durationMs = parseDuration(durationInput);
        if (!durationMs || durationMs < 60_000) {
            await new CreateMessage({ ephemeral: true })
                .content(this.t('invalidDuration', 'Invalid duration. Use values like 10m, 2h, or 7d.'))
                .send(interaction);
            return;
        }

        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
        if (targetMember) {
            const gate = this.canActOnTarget(interaction, targetMember);
            if (!gate.ok) {
                await new CreateMessage({ ephemeral: true }).content(gate.message).send(interaction);
                return;
            }
        } else if (targetUser.id === interaction.user.id) {
            await new CreateMessage({ ephemeral: true }).content('You cannot ban yourself.').send(interaction);
            return;
        }

        const expiresAt = Date.now() + durationMs;
        await interaction.guild.members.ban(targetUser.id, {
            reason: `${reason} | Temp ban for ${formatDuration(durationMs)}`,
        });

        this.addHistoryEntry({
            guildId: interaction.guildId,
            action: 'TEMPBAN',
            targetId: targetUser.id,
            moderatorId: interaction.user.id,
            reason,
            durationMs,
            expiresAt,
            resolved: 0,
        });

        await new CreateMessage({
            ephemeral: true,
            embeds: [
                new CreateEmbed()
                    .title('Temporary Ban Applied')
                    .color(Colors.DarkGold)
                    .description(`${targetUser.tag} was banned for **${formatDuration(durationMs)}**.`)
                    .fields([
                        { name: 'Reason', value: reason },
                        { name: 'Expires', value: `<t:${Math.floor(expiresAt / 1000)}:F>` },
                    ])
                    .timestamp(),
            ],
        }).send(interaction);
    }

    async runHistory(interaction) {
        const user = interaction.options.getUser('user');
        const maxLimit = Number(this.cfg('historyMaxLimit', 25));
        const defaultLimit = Number(this.cfg('historyDefaultLimit', 10));
        const limit = Math.min(
            maxLimit,
            Math.max(1, interaction.options.getInteger('limit') || defaultLimit)
        );

        const rows = this.getHistory(interaction.guildId, user?.id || null, limit);

        if (!rows.length) {
            await new CreateMessage({ ephemeral: true })
                .content('No moderation history found for this query.')
                .send(interaction);
            return;
        }

        const lines = rows.map((row) => {
            const created = `<t:${Math.floor(row.createdAt / 1000)}:R>`;
            const duration = row.durationMs ? ` | duration: ${formatDuration(row.durationMs)}` : '';
            const expires = row.expiresAt ? ` | expires: <t:${Math.floor(row.expiresAt / 1000)}:R>` : '';
            const status = row.action === 'TEMPBAN' ? ` | resolved: ${row.resolved ? 'yes' : 'no'}` : '';
            return `#${row.id} **${row.action}** - <@${row.targetId}> by <@${row.moderatorId}> ${created}${duration}${expires}${status}\nReason: ${row.reason || 'No reason provided.'}`;
        });

        const chunks = Utils.splitArray(lines, 5);
        const embed = new CreateEmbed()
            .title('Moderation History')
            .color(Colors.Blurple)
            .description(user ? `Showing latest ${rows.length} action(s) for ${user}.` : `Showing latest ${rows.length} action(s) in this server.`)
            .timestamp();

        chunks.slice(0, 3).forEach((chunk, index) => {
            embed.field({
                name: `Entries ${index * 5 + 1}-${index * 5 + chunk.length}`,
                value: chunk.join('\n\n').slice(0, 1024),
                inline: false,
            });
        });

        await new CreateMessage({ ephemeral: true, embeds: [embed] }).send(interaction);
    }

    getCommands() {
        return [
            new AddonCommand({
                name: 'moderation',
                description: 'Basic moderation actions and history',
                owner: this.metadata.name,
                adminOnly: true,
                options: [
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: 'timeout',
                        description: 'Timeout a member for a duration (ex: 10m, 2h)',
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: 'user',
                                description: 'Member to timeout',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'duration',
                                description: 'Duration (10m, 2h, 1d)',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'reason',
                                description: 'Reason for timeout',
                                required: false,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: 'kick',
                        description: 'Kick a member',
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: 'user',
                                description: 'Member to kick',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'reason',
                                description: 'Reason for kick',
                                required: false,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: 'ban',
                        description: 'Ban a user',
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: 'user',
                                description: 'User to ban',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'reason',
                                description: 'Reason for ban',
                                required: false,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: 'tempban',
                        description: 'Ban a user temporarily',
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: 'user',
                                description: 'User to ban temporarily',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'duration',
                                description: 'Duration (10m, 2h, 1d)',
                                required: true,
                            },
                            {
                                type: ApplicationCommandOptionType.String,
                                name: 'reason',
                                description: 'Reason for temporary ban',
                                required: false,
                            },
                        ],
                    },
                    {
                        type: ApplicationCommandOptionType.Subcommand,
                        name: 'history',
                        description: 'View moderation history',
                        options: [
                            {
                                type: ApplicationCommandOptionType.User,
                                name: 'user',
                                description: 'Filter history by user',
                                required: false,
                            },
                            {
                                type: ApplicationCommandOptionType.Integer,
                                name: 'limit',
                                description: 'How many entries to show',
                                required: false,
                                min_value: 1,
                                max_value: 25,
                            },
                        ],
                    },
                ],
                defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
                runSlash: async (client, interaction) => {
                    await interaction.deferReply({ ephemeral: false });

                    const subcommand = interaction.options.getSubcommand();

                    if (subcommand === 'timeout') {
                        await this.runTimeout(interaction);
                        return;
                    }

                    if (subcommand === 'kick') {
                        await this.runKick(interaction);
                        return;
                    }

                    if (subcommand === 'ban') {
                        await this.runBan(interaction);
                        return;
                    }

                    if (subcommand === 'tempban') {
                        await this.runTempBan(interaction);
                        return;
                    }

                    if (subcommand === 'history') {
                        await this.runHistory(interaction);
                        return;
                    }

                    await new CreateMessage({ ephemeral: true })
                        .content('Unknown moderation subcommand.')
                        .send(interaction);
                }
            }),
        ];
    }

    getEvents() {
        return [
            new AddonEvent({
                name: 'ready',
                once: false,
                owner: this.metadata.name,
                description: 'Sweep expired temporary bans when the client is ready.',  
                execute: async (client) => {
                    await this.sweepExpiredTempBans(client).catch(() => { });
                },
            }),
        ];
    }
}

module.exports = Moderator;
