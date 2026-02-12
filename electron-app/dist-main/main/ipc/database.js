import { ipcMain, dialog } from 'electron';
import { homedir } from 'node:os';
import { resolve as resolvePath } from 'node:path';
import Database from 'better-sqlite3';
import { createConnection as createMySqlConnection } from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { ConnectionPool as MssqlPool } from 'mssql';
// Active connections storage
const activeConnections = new Map();
// ============== SQLITE ADAPTER ==============
class SQLiteAdapter {
    db = null;
    path;
    constructor(path) {
        this.path = path.trim() || resolvePath(homedir(), '.devxflow.db');
    }
    async connect() {
        try {
            this.db = new Database(this.path);
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
            this.connection = await createMySqlConnection({
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
            this.client = new PgClient({
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
            this.pool = new MssqlPool(config);
            await this.pool.connect();
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
// ============== IPC REGISTRATION ==============
export function registerDatabaseIpc() {
    ipcMain.handle('db:connect', async (_event, config) => {
        return await connectDatabase(config);
    });
    ipcMain.handle('db:disconnect', async (_event, key) => {
        return await disconnectDatabase(key);
    });
    ipcMain.handle('db:query', async (_event, key, sql) => {
        return await queryDatabase(key, sql);
    });
    ipcMain.handle('db:execute', async (_event, key, sql) => {
        return await executeDatabase(key, sql);
    });
    ipcMain.handle('db:list-tables', async (_event, key) => {
        return await listTables(key);
    });
    ipcMain.handle('db:list-databases', async (_event, key) => {
        return await listDatabases(key);
    });
    ipcMain.handle('db:table-info', async (_event, key, tableName) => {
        return await getTableInfo(key, tableName);
    });
    ipcMain.handle('db:pick-sqlite', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            title: 'Select a SQLite database file',
            filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
        });
        if (result.canceled || result.filePaths.length === 0)
            return null;
        return result.filePaths[0];
    });
    ipcMain.handle('db:test-connection', async (_event, config) => {
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
