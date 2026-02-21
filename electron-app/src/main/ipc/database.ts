import { ipcMain, dialog } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve as resolvePath } from 'node:path'
import Database from 'better-sqlite3'
import { createConnection as createMySqlConnection, Connection as MySqlConnection } from 'mysql2/promise'
import { Client as PgClient } from 'pg'
import mssql from 'mssql'

function runCapture(command: string, args: string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (d) => (stdout += String(d)))
    proc.stderr?.on('data', (d) => (stderr += String(d)))
    proc.on('close', (code) => resolve({ code, stdout, stderr }))
    proc.on('error', () => resolve({ code: 1, stdout: '', stderr: 'spawn error' }))
  })
}

async function detectMysqlExe(): Promise<string | null> {
  const candidates: string[] = []

  const addExeIfExists = (p: string) => {
    if (p && existsSync(p)) candidates.push(p)
  }

  const addMysqlBinsFromDir = (baseDir: string) => {
    try {
      if (!existsSync(baseDir)) return
      const children = readdirSync(baseDir)
      for (const name of children) {
        const full = `${baseDir}\\${name}`
        try {
          const st = statSync(full)
          if (!st.isDirectory()) continue
        } catch {
          continue
        }
        addExeIfExists(`${full}\\bin\\mysql.exe`)
      }
    } catch {
      // ignore
    }
  }

  if (process.platform === 'win32') {
    const where = await runCapture('where', ['mysql'])
    if (where.code === 0 && where.stdout.trim()) {
      candidates.push(
        ...where.stdout
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean)
      )
    }

    // Common MySQL install locations
    addExeIfExists('C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe')
    addExeIfExists('C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysql.exe')
    addExeIfExists('C:\\Program Files\\MariaDB\\bin\\mysql.exe')
    addExeIfExists('C:\\Program Files (x86)\\MariaDB\\bin\\mysql.exe')

    // Wider scan across common install roots
    addMysqlBinsFromDir('C:\\Program Files\\MySQL')
    addMysqlBinsFromDir('C:\\Program Files (x86)\\MySQL')
    addMysqlBinsFromDir('C:\\Program Files\\MariaDB')
    addMysqlBinsFromDir('C:\\Program Files (x86)\\MariaDB')
  } else {
    const which = await runCapture('which', ['mysql'])
    if (which.code === 0 && which.stdout.trim()) candidates.push(which.stdout.trim())
  }

  for (const c of candidates) {
    if (c && existsSync(c)) return c
  }
  return null
}

// Database engine types
type DbEngine = 'sqlite' | 'mysql' | 'postgresql' | 'sqlserver'

// Connection configurations
type SqliteConfig = { path: string }
type MySqlConfig = { host: string; port: number; user: string; password: string; database?: string }
type PostgreSqlConfig = { host: string; port: number; user: string; password: string; database?: string }
type SqlServerConfig = { server: string; port: number; user: string; password: string; database?: string }

type MssqlPool = mssql.ConnectionPool
type MssqlConfig = mssql.config

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

  async exportToTxt(exportDir: string): Promise<{ exported: number; files: string[] }> {
    if (!this.db) throw new Error('Not connected')
    const tables = await this.listTables()
    const files: string[] = []
    
    for (const table of tables) {
      const outFile = `${exportDir}/${table}.txt`
      let content = `=== SCHEMA: ${table} ===\n\n`
      
      // Get CREATE TABLE statement
      const schemaStmt = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
      const schemaRow = schemaStmt.get(table) as { sql: string } | undefined
      if (schemaRow?.sql) {
        content += schemaRow.sql + '\n\n'
      }
      
      // Get sample data (first 50 rows)
      content += `=== SAMPLE DATA (First 50 rows) ===\n\n`
      const dataStmt = this.db.prepare(`SELECT * FROM ${table} LIMIT 50`)
      const rows = dataStmt.all() as Record<string, unknown>[]
      
      if (rows.length > 0) {
        // Header
        const columns = Object.keys(rows[0])
        content += columns.join('\t') + '\n'
        content += columns.map(() => '---').join('\t') + '\n'
        
        // Data rows
        for (const row of rows) {
          content += columns.map(c => String(row[c] ?? 'NULL')).join('\t') + '\n'
        }
      } else {
        content += '(no data)\n'
      }
      
      writeFileSync(outFile, content, 'utf-8')
      files.push(outFile)
    }
    
    return { exported: files.length, files }
  }
}

function filterSqlForTablesBySemicolon(sqlContent: string, tableNames: string[]): string[] {
  const wanted = new Set(tableNames.map((t) => t.trim()).filter(Boolean))
  const statements = sqlContent.split(';').map((s) => s.trim()).filter(Boolean)
  if (wanted.size === 0) return []

  const matchesTable = (stmt: string) => {
    const s = stmt.toLowerCase()
    for (const t of wanted) {
      const tl = t.toLowerCase()
      if (
        s.includes(`create table \`${tl}\``) ||
        s.includes(`create table ${tl}`) ||
        s.includes(`insert into \`${tl}\``) ||
        s.includes(`insert into ${tl}`) ||
        s.includes(`alter table \`${tl}\``) ||
        s.includes(`alter table ${tl}`) ||
        s.includes(`drop table \`${tl}\``) ||
        s.includes(`drop table ${tl}`)
      ) {
        return true
      }
    }
    return false
  }

  return statements.filter(matchesTable)
}

function filterSqlForTablesByGo(sqlContent: string, tableNames: string[]): string[] {
  const wanted = new Set(tableNames.map((t) => t.trim()).filter(Boolean))
  const batches = sqlContent
    .split(/\r?\n\s*GO\s*\r?\n/i)
    .map((b) => b.trim())
    .filter(Boolean)
  if (wanted.size === 0) return []

  const matchesTable = (batch: string) => {
    const s = batch.toLowerCase()
    for (const t of wanted) {
      const tl = t.toLowerCase()
      if (
        s.includes(`create table [${tl}]`) ||
        s.includes(`insert into [${tl}]`) ||
        s.includes(`alter table [${tl}]`) ||
        s.includes(`drop table [${tl}]`) ||
        s.includes(`create table ${tl}`) ||
        s.includes(`insert into ${tl}`)
      ) {
        return true
      }
    }
    return false
  }

  return batches.filter(matchesTable)
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

  async exportToTxt(exportDir: string): Promise<{ exported: number; files: string[] }> {
    if (!this.connection) throw new Error('Not connected')

    const tables = await this.listTables()
    const files: string[] = []

    for (const table of tables) {
      const outFile = `${exportDir}/${table}.txt`
      let content = `=== SCHEMA: ${table} ===\n\n`

      // Schema via SHOW CREATE TABLE
      const [schemaRows] = await this.connection.execute(`SHOW CREATE TABLE \`${table.replace(/`/g, '``')}\``)
      const sr = schemaRows as Array<Record<string, unknown>>
      const createKey = sr[0] ? (Object.keys(sr[0]).find((k) => k.toLowerCase().includes('create table')) ?? '') : ''
      if (sr[0] && createKey && typeof sr[0][createKey] === 'string') {
        content += String(sr[0][createKey]) + '\n\n'
      }

      // Sample data
      content += `=== SAMPLE DATA (First 50 rows) ===\n\n`
      const [dataRows] = await this.connection.execute(`SELECT * FROM \`${table.replace(/`/g, '``')}\` LIMIT 50`)
      const dr = dataRows as Array<Record<string, unknown>>
      if (dr.length > 0) {
        const columns = Object.keys(dr[0])
        content += columns.join('\t') + '\n'
        content += columns.map(() => '---').join('\t') + '\n'
        for (const row of dr) {
          content += columns.map((c) => String((row as Record<string, unknown>)[c] ?? 'NULL')).join('\t') + '\n'
        }
      } else {
        content += '(no data)\n'
      }

      writeFileSync(outFile, content, 'utf-8')
      files.push(outFile)
    }

    return { exported: files.length, files }
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

  async exportToTxt(exportDir: string): Promise<{ exported: number; files: string[] }> {
    if (!this.client) throw new Error('Not connected')

    const tables = await this.listTables()
    const files: string[] = []

    for (const table of tables) {
      const safeName = table.replace(/[\/]/g, '_')
      const outFile = `${exportDir}/${safeName}.txt`
      let content = `=== SCHEMA: ${table} ===\n\n`

      // Schema (best-effort) from information_schema
      const schema = await this.client.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      )
      content += 'Columns:\n'
      for (const r of schema.rows as Array<Record<string, unknown>>) {
        content += `- ${String(r.column_name)} ${String(r.data_type)} NULLABLE=${String(r.is_nullable)} DEFAULT=${String(r.column_default ?? '')}\n`
      }
      content += '\n'

      // Sample data
      content += `=== SAMPLE DATA (First 50 rows) ===\n\n`
      const data = await this.client.query(`SELECT * FROM "public"."${table.replace(/"/g, '""')}" LIMIT 50`)
      const dr = data.rows as Array<Record<string, unknown>>
      if (dr.length > 0) {
        const columns = Object.keys(dr[0])
        content += columns.join('\t') + '\n'
        content += columns.map(() => '---').join('\t') + '\n'
        for (const row of dr) {
          content += columns.map((c) => String(row[c] ?? 'NULL')).join('\t') + '\n'
        }
      } else {
        content += '(no data)\n'
      }

      writeFileSync(outFile, content, 'utf-8')
      files.push(outFile)
    }

    return { exported: files.length, files }
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
      const pool = new mssql.ConnectionPool(config)
      await pool.connect()
      this.pool = pool
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

  async exportToTxt(exportDir: string): Promise<{ exported: number; files: string[] }> {
    if (!this.pool) throw new Error('Not connected')

    const tables = await this.listTables()
    const files: string[] = []

    for (const table of tables) {
      const safeName = table.replace(/[\/]/g, '_')
      const outFile = `${exportDir}/${safeName}.txt`
      let content = `=== SCHEMA: ${table} ===\n\n`

      const schema = await this.pool.query(
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_NAME = '${table.replace(/'/g, "''")}';`
      )
      content += 'Columns:\n'
      for (const r of (schema.recordset as Array<Record<string, unknown>>)) {
        content += `- ${String(r.COLUMN_NAME)} ${String(r.DATA_TYPE)} NULLABLE=${String(r.IS_NULLABLE)} DEFAULT=${String(r.COLUMN_DEFAULT ?? '')}\n`
      }
      content += '\n'

      content += `=== SAMPLE DATA (First 50 rows) ===\n\n`
      const data = await this.pool.query(`SELECT TOP 50 * FROM [${table.replace(/]/g, ']]')}]`)
      const dr = (data.recordset as Array<Record<string, unknown>>) || []
      if (dr.length > 0) {
        const columns = Object.keys(dr[0])
        content += columns.join('\t') + '\n'
        content += columns.map(() => '---').join('\t') + '\n'
        for (const row of dr) {
          content += columns.map((c) => String(row[c] ?? 'NULL')).join('\t') + '\n'
        }
      } else {
        content += '(no data)\n'
      }

      writeFileSync(outFile, content, 'utf-8')
      files.push(outFile)
    }

    return { exported: files.length, files }
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

// Scan SQL file for table names
function scanSqlFileForTables(sqlFilePath: string): string[] {
  try {
    const content = readFileSync(sqlFilePath, 'utf-8')
    // Find CREATE TABLE statements - matches patterns like CREATE TABLE `tablename` or CREATE TABLE tablename
    const tableRegex = /CREATE TABLE\s+[`"']?(\w+)[`"']?/gi
    const tables: string[] = []
    let match
    while ((match = tableRegex.exec(content)) !== null) {
      if (!tables.includes(match[1])) {
        tables.push(match[1])
      }
    }
    return tables
  } catch {
    return []
  }
}

// Import SQL file
async function importSqlFile(key: string, sqlFilePath: string): Promise<{ success: boolean; tables: string[]; message: string }> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const tables = scanSqlFileForTables(sqlFilePath)
  if (tables.length === 0) {
    return { success: false, tables: [], message: 'No tables found in SQL file' }
  }

  const content = readFileSync(sqlFilePath, 'utf-8')

  // Execute full import (best-effort parsing; does not handle all SQL dialect edge cases)
  if (conn.engine === 'sqlite') {
    const adapter = conn.connection as SQLiteAdapter
    const statements = content.split(';').filter((s) => s.trim())
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables, message: `Imported ${tables.length} tables` }
  }

  if (conn.engine === 'mysql') {
    const adapter = conn.connection as MySQLAdapter
    const statements = content.split(';').filter((s) => s.trim())
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables, message: `Imported ${tables.length} tables` }
  }

  if (conn.engine === 'postgresql') {
    const adapter = conn.connection as PostgreSQLAdapter
    const statements = content.split(';').filter((s) => s.trim())
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables, message: `Imported ${tables.length} tables` }
  }

  if (conn.engine === 'sqlserver') {
    const adapter = conn.connection as SQLServerAdapter
    const batches = content
      .split(/\r?\n\s*GO\s*\r?\n/i)
      .map((b) => b.trim())
      .filter(Boolean)
    for (const batch of batches) {
      if (batch.trim()) await adapter.execute(batch)
    }
    return { success: true, tables, message: `Imported ${tables.length} tables` }
  }

  return { success: false, tables, message: 'Import not supported for this database engine' }
}

async function importSqlFileSelective(
  key: string,
  sqlFilePath: string,
  tableNames: string[]
): Promise<{ success: boolean; tables: string[]; message: string }> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const allTables = scanSqlFileForTables(sqlFilePath)
  const selected = (tableNames || []).map((t) => t.trim()).filter(Boolean)
  const selectedValid = selected.filter((t) => allTables.includes(t))
  if (selectedValid.length === 0) {
    return { success: false, tables: [], message: 'No selected tables found in SQL file' }
  }

  const content = readFileSync(sqlFilePath, 'utf-8')

  if (conn.engine === 'sqlserver') {
    const adapter = conn.connection as SQLServerAdapter
    const batches = filterSqlForTablesByGo(content, selectedValid)
    for (const batch of batches) {
      if (batch.trim()) await adapter.execute(batch)
    }
    return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` }
  }

  // sqlite/mysql/postgresql
  const statements = filterSqlForTablesBySemicolon(content, selectedValid)
  if (conn.engine === 'sqlite') {
    const adapter = conn.connection as SQLiteAdapter
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` }
  }
  if (conn.engine === 'mysql') {
    const adapter = conn.connection as MySQLAdapter
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` }
  }
  if (conn.engine === 'postgresql') {
    const adapter = conn.connection as PostgreSQLAdapter
    for (const stmt of statements) {
      if (stmt.trim()) await adapter.execute(stmt)
    }
    return { success: true, tables: selectedValid, message: `Selective restore imported ${selectedValid.length} tables` }
  }

  return { success: false, tables: selectedValid, message: 'Selective restore not supported for this database engine' }
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

async function exportDatabaseToTxt(key: string, exportDir: string): Promise<{ exported: number; files: string[] }> {
  const conn = activeConnections.get(key)
  if (!conn) throw new Error('Not connected')

  const adapter = conn.connection as SQLiteAdapter | MySQLAdapter | PostgreSQLAdapter | SQLServerAdapter
  if ('exportToTxt' in adapter) return await adapter.exportToTxt(exportDir)
  throw new Error('Export not supported for this database engine')
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

  ipcMain.handle('db:pick-export-dir', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select export directory',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:export-to-txt', async (_event, key: string, exportDir: string) => {
    return await exportDatabaseToTxt(key, exportDir)
  })

  ipcMain.handle('db:pick-sql-file', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select SQL file to import',
      filters: [{ name: 'SQL Files', extensions: ['sql'] }, { name: 'All Files', extensions: ['*'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:scan-sql-tables', async (_event, sqlFilePath: string) => {
    return scanSqlFileForTables(sqlFilePath)
  })

  ipcMain.handle('db:import-sql', async (_event, key: string, sqlFilePath: string) => {
    return await importSqlFile(key, sqlFilePath)
  })

  ipcMain.handle('db:import-sql-selective', async (_event, key: string, sqlFilePath: string, tableNames: string[]) => {
    return await importSqlFileSelective(key, sqlFilePath, tableNames)
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

  ipcMain.handle('db:pick-mysql-exe', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      title: 'Select mysql.exe',
      filters: [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:detect-mysql-exe', async () => {
    return await detectMysqlExe()
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
