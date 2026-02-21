"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDatabaseIpc = registerDatabaseIpc;
const electron_1 = require("electron");
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const promise_1 = require("mysql2/promise");
const pg_1 = require("pg");
const mssql_1 = __importDefault(require("mssql"));
function runCapture(command, args) {
    return new Promise((resolve) => {
        const proc = (0, node_child_process_1.spawn)(command, args, { windowsHide: true });
        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d) => (stdout += String(d)));
        proc.stderr?.on('data', (d) => (stderr += String(d)));
        proc.on('close', (code) => resolve({ code, stdout, stderr }));
        proc.on('error', () => resolve({ code: 1, stdout: '', stderr: 'spawn error' }));
    });
}
async function detectMysqlExe() {
    const candidates = [];
    const addExeIfExists = (p) => {
        if (p && (0, node_fs_1.existsSync)(p))
            candidates.push(p);
    };
    const addMysqlBinsFromDir = (baseDir) => {
        try {
            if (!(0, node_fs_1.existsSync)(baseDir))
                return;
            const children = (0, node_fs_1.readdirSync)(baseDir);
            for (const name of children) {
                const full = `${baseDir}\\${name}`;
                try {
                    const st = (0, node_fs_1.statSync)(full);
                    if (!st.isDirectory())
                        continue;
                }
                catch {
                    continue;
                }
                addExeIfExists(`${full}\\bin\\mysql.exe`);
            }
        }
        catch {
            // ignore
        }
    };
    if (process.platform === 'win32') {
        const where = await runCapture('where', ['mysql']);
        if (where.code === 0 && where.stdout.trim()) {
            candidates.push(...where.stdout
                .split(/\r?\n/)
                .map((s) => s.trim())
                .filter(Boolean));
        }
        // Common MySQL install locations
        addExeIfExists('C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe');
        addExeIfExists('C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysql.exe');
        addExeIfExists('C:\\Program Files\\MariaDB\\bin\\mysql.exe');
        addExeIfExists('C:\\Program Files (x86)\\MariaDB\\bin\\mysql.exe');
        // Wider scan across common install roots
        addMysqlBinsFromDir('C:\\Program Files\\MySQL');
        addMysqlBinsFromDir('C:\\Program Files (x86)\\MySQL');
        addMysqlBinsFromDir('C:\\Program Files\\MariaDB');
        addMysqlBinsFromDir('C:\\Program Files (x86)\\MariaDB');
    }
    else {
        const which = await runCapture('which', ['mysql']);
        if (which.code === 0 && which.stdout.trim())
            candidates.push(which.stdout.trim());
    }
    for (const c of candidates) {
        if (c && (0, node_fs_1.existsSync)(c))
            return c;
    }
    return null;
}
// Active connections storage
const activeConnections = new Map();
// ============== SQLITE ADAPTER ==============
class SQLiteAdapter {
    db = null;
    path;
    constructor(path) {
        this.path = path.trim() || (0, node_path_1.resolve)((0, node_os_1.homedir)(), '.devxflow.db');
    }
    async connect() {
        try {
            this.db = new better_sqlite3_1.default(this.path);
            this.db.pragma('journal_mode = WAL');
            return true;
        }
        catch (error) {
            throw new Error(`SQLite connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async disconnect() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        return true;
    }
    async query(sql) {
        if (!this.db)
            throw new Error('Not connected');
        const stmt = this.db.prepare(sql);
        const rows = stmt.all();
        return { rows };
    }
    async execute(sql) {
        if (!this.db)
            throw new Error('Not connected');
        this.db.exec(sql);
        return true;
    }
    async listTables() {
        if (!this.db)
            throw new Error('Not connected');
        const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const rows = stmt.all();
        return rows.map((r) => r.name);
    }
    async getTableInfo(tableName) {
        if (!this.db)
            throw new Error('Not connected');
        const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`);
        return stmt.all();
    }
    async exportToTxt(exportDir) {
        if (!this.db)
            throw new Error('Not connected');
        const tables = await this.listTables();
        const files = [];
        for (const table of tables) {
            const outFile = `${exportDir}/${table}.txt`;
            let content = `=== SCHEMA: ${table} ===\n\n`;
            // Get CREATE TABLE statement
            const schemaStmt = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?");
            const schemaRow = schemaStmt.get(table);
            if (schemaRow?.sql) {
                content += schemaRow.sql + '\n\n';
            }
            // Get sample data (first 50 rows)
            content += `=== SAMPLE DATA (First 50 rows) ===\n\n`;
            const dataStmt = this.db.prepare(`SELECT * FROM ${table} LIMIT 50`);
            const rows = dataStmt.all();
            if (rows.length > 0) {
                // Header
                const columns = Object.keys(rows[0]);
                content += columns.join('\t') + '\n';
                content += columns.map(() => '---').join('\t') + '\n';
                // Data rows
                for (const row of rows) {
                    content += columns.map(c => String(row[c] ?? 'NULL')).join('\t') + '\n';
                }
            }
            else {
                content += '(no data)\n';
            }
            (0, node_fs_1.writeFileSync)(outFile, content, 'utf-8');
            files.push(outFile);
        }
        return { exported: files.length, files };
    }
}
function filterSqlForTablesBySemicolon(sqlContent, tableNames) {
    const wanted = new Set(tableNames.map((t) => t.trim()).filter(Boolean));
    const statements = sqlContent.split(';').map((s) => s.trim()).filter(Boolean);
    if (wanted.size === 0)
        return [];
    const matchesTable = (stmt) => {
        const s = stmt.toLowerCase();
        for (const t of wanted) {
            const tl = t.toLowerCase();
            if (s.includes(`create table \`${tl}\``) ||
                s.includes(`create table ${tl}`) ||
                s.includes(`insert into \`${tl}\``) ||
                s.includes(`insert into ${tl}`) ||
                s.includes(`alter table \`${tl}\``) ||
                s.includes(`alter table ${tl}`) ||
                s.includes(`drop table \`${tl}\``) ||
                s.includes(`drop table ${tl}`)) {
                return true;
            }
        }
        return false;
    };
    return statements.filter(matchesTable);
}
function filterSqlForTablesByGo(sqlContent, tableNames) {
    const wanted = new Set(tableNames.map((t) => t.trim()).filter(Boolean));
    const batches = sqlContent
        .split(/\r?\n\s*GO\s*\r?\n/i)
        .map((b) => b.trim())
        .filter(Boolean);
    if (wanted.size === 0)
        return [];
    const matchesTable = (batch) => {
        const s = batch.toLowerCase();
        for (const t of wanted) {
            const tl = t.toLowerCase();
            if (s.includes(`create table [${tl}]`) ||
                s.includes(`insert into [${tl}]`) ||
                s.includes(`alter table [${tl}]`) ||
                s.includes(`drop table [${tl}]`) ||
                s.includes(`create table ${tl}`) ||
                s.includes(`insert into ${tl}`)) {
                return true;
            }
        }
        return false;
    };
    return batches.filter(matchesTable);
}
// ============== MYSQL ADAPTER ==============
class MySQLAdapter {
    connection = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        try {
            this.connection = await (0, promise_1.createConnection)({
                host: this.config.host,
                port: this.config.port || 3306,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                connectTimeout: 10000,
            });
            return true;
        }
        catch (error) {
            throw new Error(`MySQL connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async disconnect() {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
        return true;
    }
    async query(sql) {
        if (!this.connection)
            throw new Error('Not connected');
        const [rows, fields] = await this.connection.execute(sql);
        return {
            rows: rows,
            fields: Array.isArray(fields) ? fields.map((f) => ({
                name: f.name || 'unknown',
                type: String(f.type || 'unknown'),
            })) : undefined,
        };
    }
    async execute(sql) {
        if (!this.connection)
            throw new Error('Not connected');
        await this.connection.execute(sql);
        return true;
    }
    async listDatabases() {
        if (!this.connection)
            throw new Error('Not connected');
        const [rows] = await this.connection.execute('SHOW DATABASES');
        return rows.map((r) => r.Database);
    }
    async listTables() {
        if (!this.connection)
            throw new Error('Not connected');
        const [rows] = await this.connection.execute('SHOW TABLES');
        const rowArray = rows;
        if (rowArray.length === 0)
            return [];
        const key = Object.keys(rowArray[0])[0];
        return rowArray.map((r) => String(r[key]));
    }
    async getTableInfo(tableName) {
        if (!this.connection)
            throw new Error('Not connected');
        const [rows] = await this.connection.execute(`DESCRIBE ${tableName}`);
        return rows;
    }
    async exportToTxt(exportDir) {
        if (!this.connection)
            throw new Error('Not connected');
        const tables = await this.listTables();
        const files = [];
        for (const table of tables) {
            const outFile = `${exportDir}/${table}.txt`;
            let content = `=== SCHEMA: ${table} ===\n\n`;
            // Schema via SHOW CREATE TABLE
            const [schemaRows] = await this.connection.execute(`SHOW CREATE TABLE \`${table.replace(/`/g, '``')}\``);
            const sr = schemaRows;
            const createKey = sr[0] ? (Object.keys(sr[0]).find((k) => k.toLowerCase().includes('create table')) ?? '') : '';
            if (sr[0] && createKey && typeof sr[0][createKey] === 'string') {
                content += String(sr[0][createKey]) + '\n\n';
            }
            // Sample data
            content += `=== SAMPLE DATA (First 50 rows) ===\n\n`;
            const [dataRows] = await this.connection.execute(`SELECT * FROM \`${table.replace(/`/g, '``')}\` LIMIT 50`);
            const dr = dataRows;
            if (dr.length > 0) {
                const columns = Object.keys(dr[0]);
                content += columns.join('\t') + '\n';
                content += columns.map(() => '---').join('\t') + '\n';
                for (const row of dr) {
                    content += columns.map((c) => String(row[c] ?? 'NULL')).join('\t') + '\n';
                }
            }
            else {
                content += '(no data)\n';
            }
            (0, node_fs_1.writeFileSync)(outFile, content, 'utf-8');
            files.push(outFile);
        }
        return { exported: files.length, files };
    }
}
// ============== POSTGRESQL ADAPTER ==============
class PostgreSQLAdapter {
    client = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        try {
            this.client = new pg_1.Client({
                host: this.config.host,
                port: this.config.port || 5432,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database || 'postgres',
                connectionTimeoutMillis: 10000,
            });
            await this.client.connect();
            return true;
        }
        catch (error) {
            throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async disconnect() {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
        return true;
    }
    async query(sql) {
        if (!this.client)
            throw new Error('Not connected');
        const result = await this.client.query(sql);
        return {
            rows: result.rows,
            fields: result.fields?.map((f) => ({ name: f.name, type: f.dataTypeID.toString() })),
        };
    }
    async execute(sql) {
        if (!this.client)
            throw new Error('Not connected');
        await this.client.query(sql);
        return true;
    }
    async listDatabases() {
        if (!this.client)
            throw new Error('Not connected');
        const result = await this.client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname");
        return result.rows.map((r) => r.datname);
    }
    async listTables() {
        if (!this.client)
            throw new Error('Not connected');
        const result = await this.client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
        return result.rows.map((r) => r.table_name);
    }
    async getTableInfo(tableName) {
        if (!this.client)
            throw new Error('Not connected');
        const result = await this.client.query(`SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public'`, [tableName]);
        return result.rows;
    }
    async exportToTxt(exportDir) {
        if (!this.client)
            throw new Error('Not connected');
        const tables = await this.listTables();
        const files = [];
        for (const table of tables) {
            const safeName = table.replace(/[\/]/g, '_');
            const outFile = `${exportDir}/${safeName}.txt`;
            let content = `=== SCHEMA: ${table} ===\n\n`;
            // Schema (best-effort) from information_schema
            const schema = await this.client.query(`SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`, [table]);
            content += 'Columns:\n';
            for (const r of schema.rows) {
                content += `- ${String(r.column_name)} ${String(r.data_type)} NULLABLE=${String(r.is_nullable)} DEFAULT=${String(r.column_default ?? '')}\n`;
            }
            content += '\n';
            // Sample data
            content += `=== SAMPLE DATA (First 50 rows) ===\n\n`;
            const data = await this.client.query(`SELECT * FROM "public"."${table.replace(/"/g, '""')}" LIMIT 50`);
            const dr = data.rows;
            if (dr.length > 0) {
                const columns = Object.keys(dr[0]);
                content += columns.join('\t') + '\n';
                content += columns.map(() => '---').join('\t') + '\n';
                for (const row of dr) {
                    content += columns.map((c) => String(row[c] ?? 'NULL')).join('\t') + '\n';
                }
            }
            else {
                content += '(no data)\n';
            }
            (0, node_fs_1.writeFileSync)(outFile, content, 'utf-8');
            files.push(outFile);
        }
        return { exported: files.length, files };
    }
}
// ============== SQL SERVER ADAPTER ==============
class SQLServerAdapter {
    pool = null;
    config;
    constructor(config) {
        this.config = config;
    }
    async connect() {
        try {
            const config = {
                server: this.config.server,
                port: this.config.port || 1433,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database || 'master',
                options: {
                    encrypt: false,
                    trustServerCertificate: true,
                },
                connectionTimeout: 10000,
            };
            const pool = new mssql_1.default.ConnectionPool(config);
            await pool.connect();
            this.pool = pool;
            return true;
        }
        catch (error) {
            throw new Error(`SQL Server connection failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    async disconnect() {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
        }
        return true;
    }
    async query(sql) {
        if (!this.pool)
            throw new Error('Not connected');
        const result = await this.pool.query(sql);
        return {
            rows: result.recordset || [],
            fields: result.recordset?.[0]
                ? Object.keys(result.recordset[0]).map((name) => ({
                    name,
                    type: 'unknown'
                }))
                : undefined,
        };
    }
    async execute(sql) {
        if (!this.pool)
            throw new Error('Not connected');
        await this.pool.query(sql);
        return true;
    }
    async listDatabases() {
        if (!this.pool)
            throw new Error('Not connected');
        const result = await this.pool.query('SELECT name FROM sys.databases ORDER BY name');
        return (result.recordset || []).map((r) => r.name);
    }
    async listTables() {
        if (!this.pool)
            throw new Error('Not connected');
        const result = await this.pool.query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
        return (result.recordset || []).map((r) => r.TABLE_NAME);
    }
    async getTableInfo(tableName) {
        if (!this.pool)
            throw new Error('Not connected');
        const result = await this.pool.query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = '${tableName}'`);
        return result.recordset || [];
    }
    async exportToTxt(exportDir) {
        if (!this.pool)
            throw new Error('Not connected');
        const tables = await this.listTables();
        const files = [];
        for (const table of tables) {
            const safeName = table.replace(/[\/]/g, '_');
            const outFile = `${exportDir}/${safeName}.txt`;
            let content = `=== SCHEMA: ${table} ===\n\n`;
            const schema = await this.pool.query(`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = '${table.replace(/'/g, "''")}';`);
            content += 'Columns:\n';
            for (const r of schema.recordset) {
                content += `- ${String(r.COLUMN_NAME)} ${String(r.DATA_TYPE)} NULLABLE=${String(r.IS_NULLABLE)} DEFAULT=${String(r.COLUMN_DEFAULT ?? '')}\n`;
            }
            content += '\n';
            content += `=== SAMPLE DATA (First 50 rows) ===\n\n`;
            const data = await this.pool.query(`SELECT TOP 50 * FROM [${table.replace(/]/g, ']]')}]`);
            const dr = data.recordset || [];
            if (dr.length > 0) {
                const columns = Object.keys(dr[0]);
                content += columns.join('\t') + '\n';
                content += columns.map(() => '---').join('\t') + '\n';
                for (const row of dr) {
                    content += columns.map((c) => String(row[c] ?? 'NULL')).join('\t') + '\n';
                }
            }
            else {
                content += '(no data)\n';
            }
            (0, node_fs_1.writeFileSync)(outFile, content, 'utf-8');
            files.push(outFile);
        }
        return { exported: files.length, files };
    }
}
// ============== CONNECTION MANAGER ==============
function getConnectionKey(config) {
    switch (config.engine) {
        case 'sqlite':
            return `sqlite:${config.config.path}`;
        case 'mysql':
            return `mysql:${config.config.host}:${config.config.port}:${config.config.database || ''}`;
        case 'postgresql':
            return `postgresql:${config.config.host}:${config.config.port}:${config.config.database || ''}`;
        case 'sqlserver':
            return `sqlserver:${config.config.server}:${config.config.port}:${config.config.database || ''}`;
    }
}
// Scan SQL file for table names
function scanSqlFileForTables(sqlFilePath) {
    try {
        const content = (0, node_fs_1.readFileSync)(sqlFilePath, 'utf-8');
        // Find CREATE TABLE statements - matches patterns like CREATE TABLE `tablename` or CREATE TABLE tablename
        const tableRegex = /CREATE TABLE\s+[`"']?(\w+)[`"']?/gi;
        const tables = [];
        let match;
        while ((match = tableRegex.exec(content)) !== null) {
            if (!tables.includes(match[1])) {
                tables.push(match[1]);
            }
        }
        return tables;
    }
    catch {
        return [];
    }
}
// Import SQL file
async function importSqlFile(key, sqlFilePath) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const tables = scanSqlFileForTables(sqlFilePath);
    if (tables.length === 0) {
        return { success: false, tables: [], message: 'No tables found in SQL file' };
    }
    const content = (0, node_fs_1.readFileSync)(sqlFilePath, 'utf-8');
    // Execute full import (best-effort parsing; does not handle all SQL dialect edge cases)
    if (conn.engine === 'sqlite') {
        const adapter = conn.connection;
        const statements = content.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables, message: `Imported ${tables.length} tables` };
    }
    if (conn.engine === 'mysql') {
        const adapter = conn.connection;
        const statements = content.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables, message: `Imported ${tables.length} tables` };
    }
    if (conn.engine === 'postgresql') {
        const adapter = conn.connection;
        const statements = content.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables, message: `Imported ${tables.length} tables` };
    }
    if (conn.engine === 'sqlserver') {
        const adapter = conn.connection;
        const batches = content
            .split(/\r?\n\s*GO\s*\r?\n/i)
            .map((b) => b.trim())
            .filter(Boolean);
        for (const batch of batches) {
            if (batch.trim())
                await adapter.execute(batch);
        }
        return { success: true, tables, message: `Imported ${tables.length} tables` };
    }
    return { success: false, tables, message: 'Import not supported for this database engine' };
}
async function importSqlFileSelective(key, sqlFilePath, tableNames) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const allTables = scanSqlFileForTables(sqlFilePath);
    const selected = (tableNames || []).map((t) => t.trim()).filter(Boolean);
    const selectedValid = selected.filter((t) => allTables.includes(t));
    if (selectedValid.length === 0) {
        return { success: false, tables: [], message: 'No selected tables found in SQL file' };
    }
    const content = (0, node_fs_1.readFileSync)(sqlFilePath, 'utf-8');
    if (conn.engine === 'sqlserver') {
        const adapter = conn.connection;
        const batches = filterSqlForTablesByGo(content, selectedValid);
        for (const batch of batches) {
            if (batch.trim())
                await adapter.execute(batch);
        }
        return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` };
    }
    // sqlite/mysql/postgresql
    const statements = filterSqlForTablesBySemicolon(content, selectedValid);
    if (conn.engine === 'sqlite') {
        const adapter = conn.connection;
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` };
    }
    if (conn.engine === 'mysql') {
        const adapter = conn.connection;
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` };
    }
    if (conn.engine === 'postgresql') {
        const adapter = conn.connection;
        for (const stmt of statements) {
            if (stmt.trim())
                await adapter.execute(stmt);
        }
        return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` };
    }
    return { success: false, tables: selectedValid, message: 'Selective restore not supported for this database engine' };
}
async function connectDatabase(config) {
    const key = getConnectionKey(config);
    // Disconnect existing if present
    const existing = activeConnections.get(key);
    if (existing) {
        try {
            await disconnectDatabase(key);
        }
        catch {
            // ignore
        }
    }
    try {
        let adapter;
        switch (config.engine) {
            case 'sqlite':
                adapter = new SQLiteAdapter(config.config.path);
                break;
            case 'mysql':
                adapter = new MySQLAdapter(config.config);
                break;
            case 'postgresql':
                adapter = new PostgreSQLAdapter(config.config);
                break;
            case 'sqlserver':
                adapter = new SQLServerAdapter(config.config);
                break;
        }
        await adapter.connect();
        activeConnections.set(key, { engine: config.engine, connection: adapter });
        return { ok: true, key };
    }
    catch (error) {
        return { ok: false, key, error: error instanceof Error ? error.message : String(error) };
    }
}
async function disconnectDatabase(key) {
    const conn = activeConnections.get(key);
    if (!conn)
        return false;
    try {
        const adapter = conn.connection;
        await adapter.disconnect();
    }
    catch {
        // ignore
    }
    activeConnections.delete(key);
    return true;
}
async function queryDatabase(key, sql) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    return await adapter.query(sql);
}
async function executeDatabase(key, sql) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    return await adapter.execute(sql);
}
async function listTables(key) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    return await adapter.listTables();
}
async function listDatabases(key) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    if ('listDatabases' in adapter) {
        return await adapter.listDatabases();
    }
    return []; // SQLite doesn't have databases
}
async function getTableInfo(key, tableName) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    return await adapter.getTableInfo(tableName);
}
async function exportDatabaseToTxt(key, exportDir) {
    const conn = activeConnections.get(key);
    if (!conn)
        throw new Error('Not connected');
    const adapter = conn.connection;
    if ('exportToTxt' in adapter)
        return await adapter.exportToTxt(exportDir);
    throw new Error('Export not supported for this database engine');
}
// ============== IPC REGISTRATION ==============
function registerDatabaseIpc() {
    electron_1.ipcMain.handle('db:connect', async (_event, config) => {
        return await connectDatabase(config);
    });
    electron_1.ipcMain.handle('db:disconnect', async (_event, key) => {
        return await disconnectDatabase(key);
    });
    electron_1.ipcMain.handle('db:query', async (_event, key, sql) => {
        return await queryDatabase(key, sql);
    });
    electron_1.ipcMain.handle('db:execute', async (_event, key, sql) => {
        return await executeDatabase(key, sql);
    });
    electron_1.ipcMain.handle('db:list-tables', async (_event, key) => {
        return await listTables(key);
    });
    electron_1.ipcMain.handle('db:list-databases', async (_event, key) => {
        return await listDatabases(key);
    });
    electron_1.ipcMain.handle('db:table-info', async (_event, key, tableName) => {
        return await getTableInfo(key, tableName);
    });
    electron_1.ipcMain.handle('db:pick-export-dir', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory', 'createDirectory'],
            title: 'Select export directory',
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle('db:export-to-txt', async (_event, key, exportDir) => {
        return await exportDatabaseToTxt(key, exportDir);
    });
    electron_1.ipcMain.handle('db:pick-sql-file', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Select SQL file to import',
            filters: [{ name: 'SQL Files', extensions: ['sql'] }, { name: 'All Files', extensions: ['*'] }],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle('db:scan-sql-tables', async (_event, sqlFilePath) => {
        return scanSqlFileForTables(sqlFilePath);
    });
    electron_1.ipcMain.handle('db:import-sql', async (_event, key, sqlFilePath) => {
        return await importSqlFile(key, sqlFilePath);
    });
    electron_1.ipcMain.handle('db:import-sql-selective', async (_event, key, sqlFilePath, tableNames) => {
        return await importSqlFileSelective(key, sqlFilePath, tableNames);
    });
    electron_1.ipcMain.handle('db:pick-sqlite', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Select a SQLite database file',
            filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle('db:pick-mysql-exe', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Select mysql.exe',
            filters: [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    electron_1.ipcMain.handle('db:detect-mysql-exe', async () => {
        return await detectMysqlExe();
    });
    electron_1.ipcMain.handle('db:test-connection', async (_event, config) => {
        try {
            const result = await connectDatabase(config);
            if (result.ok) {
                await disconnectDatabase(result.key);
                return { ok: true };
            }
            return { ok: false, error: result.error };
        }
        catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
    });
}
