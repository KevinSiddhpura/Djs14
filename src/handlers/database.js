const db = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const logger = require("../lib/utils/logger");

class Database {
    constructor(name, options = {}) {
        if (!name) throw new Error("[DB] Missing name parameter.");

        this.name = name;
        this.fileName = this.name.includes(".db") || this.name.includes(".sqlite") ? this.name : `${this.name}.db`;
        this.database = new db(path.join("data", this.fileName), {
            verbose: options.verbose ? console.log : undefined,
        });
    }

    static createTableQuery(name, values) {
        return `CREATE TABLE IF NOT EXISTS ${name} (${values})`;
    }

    getDatabase() {
        return this.database;
    }

    createTable(name, values) {
        if (!name) throw new Error("[DB] Missing name parameter.");
        if (!values) throw new Error("[DB] Missing values parameter.");

        this.database.prepare(Database.createTableQuery(name, values)).run();
        return this;
    }

    createTables(tables) {
        if (!Array.isArray(tables) || !tables.length) throw new Error("[DB] Missing or invalid tables parameter.");

        for (const table of tables) {
            if (!table.name || !table.values) throw new Error("[DB] Invalid table format.");
            this.createTable(table.name, table.values);
        }
        return this;
    }

    deleteTable(name) {
        if (!name) throw new Error("[DB] Missing name parameter.");

        this.database.prepare(`DROP TABLE IF EXISTS ${name}`).run();
        return this;
    }

    deleteAllTables() {
        const tableNames = this.database
            .prepare("SELECT name FROM sqlite_master WHERE type='table'")
            .all()
            .map((table) => table.name);

        for (const name of tableNames) this.deleteTable(name);
        return this;
    }

    insert(tableName, data) {
        if (!tableName || !data || typeof data !== "object") throw new Error("[DB] Invalid tableName or data.");

        const columns = Object.keys(data).join(", ");
        const placeholders = Object.keys(data)
            .map(() => "?")
            .join(", ");
        const values = Object.values(data);

        const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
        return this.database.prepare(query).run(values);
    }

    select(tableName, condition = "1=1") {
        if (!tableName) throw new Error("[DB] Missing tableName parameter.");

        const query = `SELECT * FROM ${tableName} WHERE ${condition}`;
        return this.database.prepare(query).all();
    }

    update(tableName, data, condition) {
        if (!tableName || !data || !condition) throw new Error("[DB] Missing tableName, data, or condition.");

        const updates = Object.keys(data)
            .map((key) => `${key} = ?`)
            .join(", ");
        const values = Object.values(data);

        const query = `UPDATE ${tableName} SET ${updates} WHERE ${condition}`;
        return this.database.prepare(query).run(values);
    }

    deleteEntry(tableName, condition) {
        if (!tableName || !condition) throw new Error("[DB] Missing tableName or condition.");

        const query = `DELETE FROM ${tableName} WHERE ${condition}`;
        return this.database.prepare(query).run();
    }

    transaction(fn) {
        const transaction = this.database.transaction(fn);
        transaction();
    }

    close() {
        this.database.close();
    }

    static initialize() {
        const dataFolder = path.join("data");
        if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);

        new Database("default.db").getDatabase();
        logger.info("Database is ready & loaded default.db");
        return true;
    }
}

module.exports = Database;
