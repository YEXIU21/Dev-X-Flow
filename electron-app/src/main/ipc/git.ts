import { app, dialog, ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve as resolvePath } from 'node:path'
import { simpleGit } from 'simple-git'
import Database from 'better-sqlite3'

export type RepoStatusSummary = {
  branch: string
  staged: number
  modified: number
  created: number
  deleted: number
  renamed: number
  conflicted: number
  ahead: number
  behind: number
}

type RebaseStatus = {
  inProgress: boolean
  type: 'rebase-apply' | 'rebase-merge' | null
  headName: string | null
  onto: string | null
  step: number | null
  total: number | null
}

async function getConflicts(repoPath: string): Promise<string[]> {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()
  return status.conflicted
}

async function getConflictVersion(repoPath: string, filePath: string, stage: 1 | 2 | 3): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  if (!filePath) throw new Error('filePath is required')
  return await git.raw(['show', `:${stage}:${filePath}`])
}

export type RepoChange = {
  path: string
  index: string
  working_dir: string
}

export type CommitItem = {
  hash: string
  date: string
  message: string
  author_name: string
  author_email: string
}

async function getStatusSummary(repoPath: string): Promise<RepoStatusSummary> {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()

  return {
    branch: status.current || 'unknown',
    staged: status.staged.length,
    modified: status.modified.length,
    created: status.created.length,
    deleted: status.deleted.length,
    renamed: status.renamed.length,
    conflicted: status.conflicted.length,
    ahead: status.ahead,
    behind: status.behind,
  }
}

async function getChanges(repoPath: string): Promise<RepoChange[]> {
  const git = simpleGit({ baseDir: repoPath })
  const status = await git.status()
  return status.files.map((f) => ({ path: f.path, index: f.index, working_dir: f.working_dir }))
}

async function stageFiles(repoPath: string, paths: string[]) {
  const git = simpleGit({ baseDir: repoPath })
  if (paths.length === 0) return
  await git.add(paths)
}

async function unstageFiles(repoPath: string, paths: string[]) {
  const git = simpleGit({ baseDir: repoPath })
  for (const p of paths) {
    await git.raw(['reset', 'HEAD', '--', p])
  }
}

async function commit(repoPath: string, message: string) {
  const git = simpleGit({ baseDir: repoPath })
  const m = message.trim()
  if (!m) throw new Error('Commit message is required')
  await git.commit(m)
}

async function getDiff(repoPath: string, filePath: string, mode: 'staged' | 'unstaged') {
  const git = simpleGit({ baseDir: repoPath })
  if (!filePath) throw new Error('filePath is required')

  if (mode === 'staged') {
    return await git.diff(['--cached', '--', filePath])
  }

  return await git.diff(['--', filePath])
}

async function getLog(repoPath: string, maxCount: number): Promise<CommitItem[]> {
  const git = simpleGit({ baseDir: repoPath })
  const log = await git.log({ maxCount })
  return log.all.map((c) => ({
    hash: c.hash,
    date: c.date,
    message: c.message,
    author_name: c.author_name,
    author_email: c.author_email,
  }))
}

async function getCommitDetails(repoPath: string, hash: string): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  if (!hash) throw new Error('hash is required')
  return await git.show([hash, '--stat'])
}

async function listRemotes(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  const remotes = await git.getRemotes(true)
  return remotes.map((r) => ({
    name: r.name,
    fetch: r.refs.fetch,
    push: r.refs.push,
  }))
}

async function addRemote(repoPath: string, name: string, url: string) {
  const git = simpleGit({ baseDir: repoPath })
  const n = name.trim()
  const u = url.trim()
  if (!n) throw new Error('Remote name is required')
  if (!u) throw new Error('Remote URL is required')
  await git.addRemote(n, u)
  return true
}

async function fetchRemote(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  const res = await git.fetch()
  return JSON.stringify(res, null, 2)
}

async function pullRemote(repoPath: string, mode: 'merge' | 'rebase') {
  const git = simpleGit({ baseDir: repoPath })
  if (mode === 'rebase') {
    const res = await git.pull(['--rebase'])
    return JSON.stringify(res, null, 2)
  }
  const res = await git.pull()
  return JSON.stringify(res, null, 2)
}

async function pushRemote(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  const res = await git.push()
  return JSON.stringify(res, null, 2)
}

async function listStashes(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  const res = await git.stashList()
  return res.all.map((s) => {
    const anyS = s as unknown as { index?: number; refs?: string; message: string }
    const byIndex = typeof anyS.index === 'number' ? anyS.index : undefined
    const m = typeof anyS.refs === 'string' ? /stash@\{(\d+)\}/.exec(anyS.refs) : null
    const parsed = m ? Number(m[1]) : undefined
    return { index: byIndex ?? parsed ?? 0, message: s.message }
  })
}

async function getGitDir(repoPath: string): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  const gd = (await git.raw(['rev-parse', '--git-dir'])).trim()
  if (!gd) throw new Error('Unable to resolve .git dir')
  return isAbsolute(gd) ? gd : resolvePath(repoPath, gd)
}

function safeReadText(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8').trim()
  } catch {
    return null
  }
}

async function getRebaseStatus(repoPath: string): Promise<RebaseStatus> {
  const gitDir = await getGitDir(repoPath)
  const applyDir = resolvePath(gitDir, 'rebase-apply')
  const mergeDir = resolvePath(gitDir, 'rebase-merge')

  const hasApply = existsSync(applyDir)
  const hasMerge = existsSync(mergeDir)

  if (!hasApply && !hasMerge) {
    return { inProgress: false, type: null, headName: null, onto: null, step: null, total: null }
  }

  const type: RebaseStatus['type'] = hasMerge ? 'rebase-merge' : 'rebase-apply'
  const base = hasMerge ? mergeDir : applyDir

  const headName = safeReadText(resolvePath(base, 'head-name'))
  const onto = safeReadText(resolvePath(base, 'onto'))
  const stepRaw = safeReadText(resolvePath(base, 'msgnum'))
  const totalRaw = safeReadText(resolvePath(base, 'end'))

  const step = stepRaw && !Number.isNaN(Number(stepRaw)) ? Number(stepRaw) : null
  const total = totalRaw && !Number.isNaN(Number(totalRaw)) ? Number(totalRaw) : null

  return { inProgress: true, type, headName, onto, step, total }
}

async function rebaseAction(repoPath: string, action: 'continue' | 'abort' | 'skip') {
  const git = simpleGit({ baseDir: repoPath })
  return await git.raw(['rebase', `--${action}`])
}

type DbQueryResult = {
  rows: unknown[]
}

const dbHandles = new Map<string, Database.Database>()

function getDefaultDbPath() {
  return resolvePath(app.getPath('userData'), 'devxflow.db')
}

function getOrOpenDb(dbPath: string) {
  const p = dbPath.trim() || getDefaultDbPath()
  const existing = dbHandles.get(p)
  if (existing) return { path: p, db: existing }

  const db = new Database(p)
  db.pragma('journal_mode = WAL')
  dbHandles.set(p, db)
  return { path: p, db }
}

function closeDb(dbPath: string) {
  const p = dbPath.trim() || getDefaultDbPath()
  const db = dbHandles.get(p)
  if (db) {
    db.close()
    dbHandles.delete(p)
  }
  return true
}

async function saveStash(repoPath: string, message: string) {
  const git = simpleGit({ baseDir: repoPath })
  const msg = message.trim() || 'WIP'
  const out = await git.stash(['push', '-m', msg])
  return String(out)
}

async function popStash(repoPath: string, index?: number) {
  const git = simpleGit({ baseDir: repoPath })
  const args = ['pop']
  if (typeof index === 'number') args.push(`stash@{${index}}`)
  const out = await git.stash(args)
  return String(out)
}

async function applyStash(repoPath: string, index?: number) {
  const git = simpleGit({ baseDir: repoPath })
  const args = ['apply']
  if (typeof index === 'number') args.push(`stash@{${index}}`)
  const out = await git.stash(args)
  return String(out)
}

async function dropStash(repoPath: string, index?: number) {
  const git = simpleGit({ baseDir: repoPath })
  const args = ['drop']
  if (typeof index === 'number') args.push(`stash@{${index}}`)
  const out = await git.stash(args)
  return String(out)
}

async function stageAll(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  await git.add('.')
}

async function switchBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  await git.checkout(branch)
}

async function mergeBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  await git.merge([branch, '--no-ff', '-m', `Merge ${branch}`])
}

async function pushBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  const res = await git.push('origin', branch)
  return JSON.stringify(res, null, 2)
}

async function runTerminal(repoPath: string, command: string) {
  const cmd = command.trim()
  if (!cmd) throw new Error('command is required')

  const isWin = process.platform === 'win32'
  const shell = isWin ? 'cmd.exe' : 'sh'
  const shellArgs = isWin ? ['/d', '/s', '/c', cmd] : ['-lc', cmd]

  return await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve) => {
    const child = spawn(shell, shellArgs, {
      cwd: repoPath,
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''

    const cap = (s: string) => (s.length > 200_000 ? s.slice(0, 200_000) + '\n…(truncated)…\n' : s)

    const timer = setTimeout(() => {
      try {
        child.kill()
      } catch {
        // ignore
      }
      resolve({ code: null, stdout: cap(stdout), stderr: cap(stderr + '\n(TIMEOUT)\n') })
    }, 30_000)

    child.stdout?.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr?.on('data', (d) => {
      stderr += d.toString()
    })

    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, stdout: cap(stdout), stderr: cap(stderr) })
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      resolve({ code: null, stdout: cap(stdout), stderr: cap(stderr + String(err)) })
    })
  })
}

export function registerGitIpc() {
  ipcMain.handle('repo:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select a Git repository',
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('repo:status', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getStatusSummary(repoPath)
  })

  ipcMain.handle('repo:changes', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getChanges(repoPath)
  })

  ipcMain.handle('repo:stage', async (_event, repoPath: string, paths: string[]) => {
    if (!repoPath) throw new Error('repoPath is required')
    await stageFiles(repoPath, paths)
    return true
  })

  ipcMain.handle('repo:unstage', async (_event, repoPath: string, paths: string[]) => {
    if (!repoPath) throw new Error('repoPath is required')
    await unstageFiles(repoPath, paths)
    return true
  })

  ipcMain.handle('repo:commit', async (_event, repoPath: string, message: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await commit(repoPath, message)
    return true
  })

  ipcMain.handle('repo:diff', async (_event, repoPath: string, filePath: string, mode: 'staged' | 'unstaged') => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getDiff(repoPath, filePath, mode)
  })

  ipcMain.handle('repo:log', async (_event, repoPath: string, maxCount: number) => {
    if (!repoPath) throw new Error('repoPath is required')
    const count = Number.isFinite(maxCount) ? Math.max(1, Math.min(200, maxCount)) : 50
    return await getLog(repoPath, count)
  })

  ipcMain.handle('repo:commit-details', async (_event, repoPath: string, hash: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getCommitDetails(repoPath, hash)
  })

  ipcMain.handle('repo:remotes', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await listRemotes(repoPath)
  })

  ipcMain.handle('repo:add-remote', async (_event, repoPath: string, name: string, url: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await addRemote(repoPath, name, url)
    return true
  })

  ipcMain.handle('repo:fetch', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await fetchRemote(repoPath)
  })

  ipcMain.handle('repo:pull', async (_event, repoPath: string, mode: 'merge' | 'rebase') => {
    if (!repoPath) throw new Error('repoPath is required')
    return await pullRemote(repoPath, mode)
  })

  ipcMain.handle('repo:push', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await pushRemote(repoPath)
  })

  ipcMain.handle('repo:stash-list', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await listStashes(repoPath)
  })

  ipcMain.handle('repo:stash-save', async (_event, repoPath: string, message: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await saveStash(repoPath, message)
  })

  ipcMain.handle('repo:stash-pop', async (_event, repoPath: string, index?: number) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await popStash(repoPath, index)
  })

  ipcMain.handle('repo:stash-apply', async (_event, repoPath: string, index?: number) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await applyStash(repoPath, index)
  })

  ipcMain.handle('repo:stash-drop', async (_event, repoPath: string, index?: number) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await dropStash(repoPath, index)
  })

  ipcMain.handle('terminal:run', async (_event, repoPath: string, command: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await runTerminal(repoPath, command)
  })

  ipcMain.handle('app:info', async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      versions: process.versions,
    }
  })

  ipcMain.handle('repo:conflicts', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getConflicts(repoPath)
  })

  ipcMain.handle('repo:conflict-version', async (_event, repoPath: string, filePath: string, stage: 1 | 2 | 3) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getConflictVersion(repoPath, filePath, stage)
  })

  ipcMain.handle('repo:rebase-status', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getRebaseStatus(repoPath)
  })

  ipcMain.handle('repo:rebase-continue', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await rebaseAction(repoPath, 'continue')
  })

  ipcMain.handle('repo:rebase-skip', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await rebaseAction(repoPath, 'skip')
  })

  ipcMain.handle('repo:rebase-abort', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await rebaseAction(repoPath, 'abort')
  })

  ipcMain.handle('db:default-path', async () => {
    return getDefaultDbPath()
  })

  ipcMain.handle('db:pick', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'createDirectory'],
      title: 'Select a SQLite database file',
      filters: [{ name: 'SQLite', extensions: ['db', 'sqlite', 'sqlite3'] }],
    })

    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('db:connect', async (_event, dbPath: string) => {
    const { path } = getOrOpenDb(dbPath)
    return { ok: true, path }
  })

  ipcMain.handle('db:query', async (_event, dbPath: string, sql: string) => {
    const { db } = getOrOpenDb(dbPath)
    const q = (sql || '').trim()
    if (!q) throw new Error('sql is required')
    const stmt = db.prepare(q)
    const rows = stmt.all()
    const res: DbQueryResult = { rows }
    return res
  })

  ipcMain.handle('db:exec', async (_event, dbPath: string, sql: string) => {
    const { db } = getOrOpenDb(dbPath)
    const q = (sql || '').trim()
    if (!q) throw new Error('sql is required')
    db.exec(q)
    return { ok: true }
  })

  ipcMain.handle('repo:stage-all', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await stageAll(repoPath)
    return true
  })

  ipcMain.handle('repo:switch-branch', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await switchBranch(repoPath, branch)
    return true
  })

  ipcMain.handle('repo:merge', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await mergeBranch(repoPath, branch)
    return true
  })

  ipcMain.handle('repo:push-branch', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await pushBranch(repoPath, branch)
  })
}
