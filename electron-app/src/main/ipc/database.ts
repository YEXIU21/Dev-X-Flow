import { ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve as resolvePath } from 'node:path'
import Database from 'better-sqlite3'
import { createConnection as createMySqlConnection, Connection as MySqlConnection } from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import { ConnectionPool as MssqlPool, config as MssqlConfig } from 'mssql'

// Database engine types
type DbEngine = 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'

// Connection configurations
type SqliteConfig = { path: string }
type MySqlConfig = { host: string; port: number; user: string; password: string; database?: string }
type PostgreSqlConfig = { host: string; port: number; user: string; password: string; database?: string }
type SqlServerConfig = { server: string; port: number; user: string; password: string; database?: string }

type DbConfig =
  | { engine: 'sqlite'; config: SqliteConfig }
  | { engine: 'mysql'; config: MySqlConfig }
  | { engine: 'postgresql'; config: PostgreSqlConfig }
  | { engine: 'sqlserver'; config: SqlServerConfig }

// Query result type
export type DbQueryResult = {
  rows: unknown[]
  fields?: Array<{ name: string; type: string }>
}

// Active connections storage
const activeConnections = new Map<string, { engine: DbEngine; connection: unknown }>()

// ============== SQLITE ADAPTER ==============
class SQLiteAdapter {
  private db: Database.Database | null = null
  private path: string

  constructor(path: string) {
    this.path = path.trim() || resolvePath(homedir(), '.devxflow.db')
  }

  async connect(): Promise<boolean> {
    try {
      this.db = new Database(this.path)
      this.db.pragma('journal_mode = WAL')
      return true
    } catch (error) {
      throw new Error(`SQLite connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    return true
  }

  async query(sql: string): Promise<DbQueryResult> {
    if (!this.db) throw new Error('Not connected')
    const stmt = this.db.prepare(sql)
    const rows = stmt.all()
    return { rows }
  }

  async execute(sql: string): Promise<boolean> {
    if (!this.db) throw new Error('Not connected')
    this.db.exec(sql)
    return true
  }

  async listTables(): Promise<string[]> {
    if (!this.db) throw new Error('Not connected')
    const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const rows = stmt.all() as Array<{ name: string }>
    return rows.map((r) => r.name)
  }

  async getTableInfo(tableName: string): Promise<unknown[]> {
    if (!this.db) throw new Error('Not connected')
    const stmt = this.db.prepare(`PRAGMA table_info(${tableName})`)
    return stmt.all()
  }
}

// ============== MYSQL ADAPTER ==============
class MySQLAdapter {
  private connection: MySqlConnection | null = null
  private config: MySqlConfig

  constructor(config: MySqlConfig) {
    this.config = config
  }

  async connect(): Promise<boolean> {
    try {
      this.connection = await createMySqlConnection({
        host: this.config.host,
        port: this.config.port || 3306,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database,
        connectTimeout: 10000,
      })
      return true
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.connection) {
      await this.connection.end()
      this.connection = null
    }
    return true
  }

  async query(sql: string): Promise<DbQueryResult> {
    if (!this.connection) throw new Error('Not connected')
    const [rows, fields] = await this.connection.execute(sql)
    return {
      rows: rows as unknown[],
      fields: Array.isArray(fields) ? fields.map((f) => ({
        name: (f as unknown as { name?: string }).name || 'unknown',
        type: String((f as unknown as { type?: number }).type || 'unknown'),
      })) : undefined,
    }
  }

  async execute(sql: string): Promise<boolean> {
    if (!this.connection) throw new Error('Not connected')
    await this.connection.execute(sql)
    return true
  }

  async listDatabases(): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected')
    const [rows] = await this.connection.execute('SHOW DATABASES')
    return (rows as Array<{ Database: string }>).map((r) => r.Database)
  }

  async listTables(): Promise<string[]> {
    if (!this.connection) throw new Error('Not connected')
    const [rows] = await this.connection.execute('SHOW TABLES')
    const rowArray = rows as Array<Record<string, unknown>>
    if (rowArray.length === 0) return []
    const key = Object.keys(rowArray[0])[0]
    return rowArray.map((r) => String(r[key]))
  }

  async getTableInfo(tableName: string): Promise<unknown[]> {
    if (!this.connection) throw new Error('Not connected')
    const [rows] = await this.connection.execute(`DESCRIBE ${tableName}`)
    return rows as unknown[]
  }
}

// ============== POSTGRESQL ADAPTER ==============
class PostgreSQLAdapter {
  private client: PgClient | null = null
  private config: PostgreSqlConfig

  constructor(config: PostgreSqlConfig) {
    this.config = config
  }

  async connect(): Promise<boolean> {
    try {
      this.client = new PgClient({
        host: this.config.host,
        port: this.config.port || 5432,
        user: this.config.user,
        password: this.config.password,
        database: this.config.database || 'postgres',
        connectionTimeoutMillis: 10000,
      })
      await this.client.connect()
      return true
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.client) {
      await this.client.end()
      this.client = null
    }
    return true
  }

  async query(sql: string): Promise<DbQueryResult> {
    if (!this.client) throw new Error('Not connected')
    const result = await this.client.query(sql)
    return {
      rows: result.rows,
      fields: result.fields?.map((f: { name: string; dataTypeID: number }) => ({ name: f.name, type: f.dataTypeID.toString() })),
    }
  }

  async execute(sql: string): Promise<boolean> {
    if (!this.client) throw new Error('Not connected')
    await this.client.query(sql)
    return true
  }

  async listDatabases(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected')
    const result = await this.client.query("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname")
    return (result.rows as Array<{ datname: string }>).map((r) => r.datname)
  }

  async listTables(): Promise<string[]> {
    if (!this.client) throw new Error('Not connected')
    const result = await this.client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    )
    return (result.rows as Array<{ table_name: string }>).map((r) => r.table_name)
  }

  async getTableInfo(tableName: string): Promise<unknown[]> {
    if (!this.client) throw new Error('Not connected')
    const result = await this.client.query(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_name = $1 AND table_schema = 'public'`,
      [tableName]
    )
    return result.rows
  }
}

// ============== SQL SERVER ADAPTER ==============
class SQLServerAdapter {
  private pool: MssqlPool | null = null
  private config: SqlServerConfig

  constructor(config: SqlServerConfig) {
    this.config = config
  }

  async connect(): Promise<boolean> {
    try {
      const config: MssqlConfig = {
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
      }
      this.pool = new MssqlPool(config)
      await this.pool.connect()
      return true
    } catch (error) {
      throw new Error(`SQL Server connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async disconnect(): Promise<boolean> {
    if (this.pool) {
      await this.pool.close()
      this.pool = null
    }
    return true
  }

  async query(sql: string): Promise<DbQueryResult> {
    if (!this.pool) throw new Error('Not connected')
    const result = await this.pool.query(sql)
    return {
      rows: (result.recordset as unknown[]) || [],
      fields: (result.recordset as Array<Record<string, unknown>>)?.[0] 
        ? Object.keys((result.recordset as Array<Record<string, unknown>>)[0]).map((name) => ({ 
            name, 
            type: 'unknown' 
          }))
        : undefined,
    }
  }

  async execute(sql: string): Promise<boolean> {
    if (!this.pool) throw new Error('Not connected')
    await this.pool.query(sql)
    return true
  }

  async listDatabases(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected')
    const result = await this.pool.query('SELECT name FROM sys.databases ORDER BY name')
    return (result.recordset as Array<{ name: string }> || []).map((r) => r.name)
  }

  async listTables(): Promise<string[]> {
    if (!this.pool) throw new Error('Not connected')
    const result = await this.pool.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    )
    return (result.recordset as Array<{ TABLE_NAME: string }> || []).map((r) => r.TABLE_NAME)
  }

  async getTableInfo(tableName: string): Promise<unknown[]> {
    if (!this.pool) throw new Error('Not connected')
    const result = await this.pool.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = '${tableName}'`
    )
    return result.recordset || []
  }
}

// ============== CONNECTION MANAGER ==============
function getConnectionKey(config: DbConfig): string {
  switch (config.engine) {
    case 'sqlite':
      return `sqlite:${config.config.path}`
    case 'mysql':
      return `mysql:${config.config.host}:${config.config.port}:${config.config.database || ''}`
    case 'postgresql':
      return `postgresql:${config.config.host}:${config.config.port}:${config.config.database || ''}`
    case 'sqlserver':
      return `sqlserver:${config.config.server}:${config.config.port}:${config.config.database || ''}`
  }
}

async function connectDatabase(config: DbConfig): Promise<{ ok: boolean; key: string; error?: string }> {
  const key = getConnectionKey(config)

  // Disconnect existing if present
  const existing = activeConnections.get(key)
  if (existing) {
    try {
      await disconnectDatabase(key)
    } catch {
      // ignore
    }
  }

  try {
    let adapter: SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter

    switch (config.engine) {
      case 'sqlite':
        adapter = new SQLiteAdapter(config.config.path)
        break
      case 'mysql':
        adapter = new MySQLAdapter(config.config)
        break
      case 'postgresql':
        adapter = new PostgreSQLAdapter(config.config)
        break
      case 'sqlserver':
        adapter = new SQLServerAdapter(config.config)
        break
    }

    await adapter.connect()
    activeConnections.set(key, { engine: config.engine, connection: adapter })
    return { ok: true, key }
  } catch (error) {
    return { ok: false, key, error: error instanceof Error ? error.message : String(error) }
  }
}

async function disconnectDatabase(key: string): Promise<boolean> {
  const conn = activeConnections.get(key)
  if (!conn) return false

  try {
    const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
    await adapter.disconnect()
  } catch {
    // ignore
  }
  activeConnections.delete(key)
  return true
}

async function queryDatabase(key: string, sql: string): Promise<DbQueryResult> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  return await adapter.query(sql)
}

async function executeDatabase(key: string, sql: string): Promise<boolean> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  return await adapter.execute(sql)
}

async function listTables(key: string): Promise<string[]> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  return await adapter.listTables()
}

async function listDatabases(key: string): Promise<string[]> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  if ('listDatabases' in adapter) {
    return await adapter.listDatabases()
  }
  return [] // SQLite doesn't have databases
}

async function getTableInfo(key: string, tableName: string): Promise<unknown[]> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  return await adapter.getTableInfo(tableName)
}

// ============== IPC REGISTRATION ==============
export function registerDatabaseIpc() {
  ipcMain.handle('db:connect', async (_event, config: DbConfig) => {
    return await connectDatabase(config)
  })

  ipcMain.handle('db:disconnect', async (_event, key: string) => {
    return await disconnectDatabase(key)
  })

  ipcMain.handle('db:query', async (_event, key: string, sql: string) => {
    return await queryDatabase(key, sql)
  })

  ipcMain.handle('db:execute', async (_event, key: string, sql: string) => {
    return await executeDatabase(key, sql)
  })

  ipcMain.handle('db:list-tables', async (_event, key: string) => {
    return await listTables(key)
  })

  ipcMain.handle('db:list-databases', async (_event, key: string) => {
    return await listDatabases(key)
  })

  ipcMain.handle('db:table-info', async (_event, key: string, tableName: string) => {
    return await getTableInfo(key, tableName)
  })

  ipcMain.handle('db:pick-sqlite', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select a SQLite database file',
      filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:test-connection', async (_event, config: DbConfig) => {
    try {
      const result = await connectDatabase(config)
      if (result.ok) {
        await disconnectDatabase(result.key)
        return { ok: true }
      }
      return { ok: false, error: result.error }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}

export type { DbEngine, DbConfig }
