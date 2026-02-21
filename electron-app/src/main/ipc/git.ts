import { app, dialog, ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, resolve as resolvePath } from 'node:path'
import { simpleGit } from 'simple-git'
import Database from 'better-sqlite3'

ipcMain.on('open-external-url', (event, url) => {
  shell.openExternal(url)
})

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

type ConflictSections = {
  base: string
  ours: string
  theirs: string
}

/**
 * Parse a conflicted file and extract base/ours/theirs sections
 */
async function parseConflictFile(repoPath: string, filePath: string): Promise<ConflictSections> {
  const fullPath = resolvePath(repoPath, filePath)
  const content = readFileSync(fullPath, 'utf-8')
  
  const baseLines: string[] = []
  const oursLines: string[] = []
  const theirsLines: string[] = []
  
  let inConflict = false
  let currentSection: 'ours' | 'theirs' | null = null
  
  for (const line of content.split('\n')) {
    if (line.startsWith('<<<<<<<')) {
      inConflict = true
      currentSection = 'ours'
    } else if (line.startsWith('=======')) {
      currentSection = 'theirs'
    } else if (line.startsWith('>>>>>>>')) {
      inConflict = false
      currentSection = null
    } else {
      if (!inConflict) {
        // Common line - add to all sections
        baseLines.push(line)
        oursLines.push(line)
        theirsLines.push(line)
      } else if (currentSection === 'ours') {
        oursLines.push(line)
      } else if (currentSection === 'theirs') {
        theirsLines.push(line)
      }
    }
  }
  
  return {
    base: baseLines.join('\n'),
    ours: oursLines.join('\n'),
    theirs: theirsLines.join('\n')
  }
}

/**
 * Resolve a conflict by accepting one side
 */
async function resolveConflict(repoPath: string, filePath: string, side: 'ours' | 'theirs'): Promise<boolean> {
  const fullPath = resolvePath(repoPath, filePath)
  const content = readFileSync(fullPath, 'utf-8')
  
  const resolvedLines: string[] = []
  let inConflict = false
  let keepTheirs = false
  
  for (const line of content.split('\n')) {
    if (line.startsWith('<<<<<<<')) {
      inConflict = true
      keepTheirs = (side === 'theirs')
    } else if (line.startsWith('=======')) {
      keepTheirs = (side === 'ours')
    } else if (line.startsWith('>>>>>>>')) {
      inConflict = false
      keepTheirs = false
    } else {
      if (!inConflict || keepTheirs) {
        resolvedLines.push(line)
      }
    }
  }
  
  writeFileSync(fullPath, resolvedLines.join('\n'), 'utf-8')
  return true
}

/**
 * Mark a file as resolved by staging it
 */
async function markResolved(repoPath: string, filePath: string): Promise<boolean> {
  const git = simpleGit({ baseDir: repoPath })
  await git.add(filePath)
  return true
}

type RebaseTodoItem = {
  action: 'pick' | 'reword' | 'edit' | 'squash' | 'fixup' | 'drop'
  hash: string
  message: string
}

/**
 * Load commits for interactive rebase
 */
async function loadRebaseCommits(repoPath: string, baseCommit?: string): Promise<RebaseTodoItem[]> {
  const git = simpleGit({ baseDir: repoPath })
  
  // Default to HEAD~10 if no base specified
  const base = baseCommit || 'HEAD~10'
  
  const log = await git.log({
    from: base,
    to: 'HEAD',
    format: {
      hash: '%H',
      message: '%s'
    }
  })
  
  // Return in reverse order (oldest first) for rebase todo
  return log.all.slice().reverse().map((commit: { hash: string; message: string }) => ({
    action: 'pick' as const,
    hash: commit.hash,
    message: commit.message
  }))
}

/**
 * Write git-rebase-todo file
 */
async function writeRebaseTodoFile(repoPath: string, items: RebaseTodoItem[]): Promise<boolean> {
  const gitDir = await simpleGit({ baseDir: repoPath }).revparse(['--git-dir'])
  const todoPath = resolvePath(gitDir.trim(), 'rebase-merge', 'git-rebase-todo')
  
  const todoContent = items
    .filter(item => item.action !== 'drop')
    .map(item => `${item.action} ${item.hash} ${item.message}`)
    .join('\n')
  
  // Ensure directory exists
  const todoDir = resolvePath(gitDir.trim(), 'rebase-merge')
  if (!existsSync(todoDir)) {
    throw new Error('Not in an interactive rebase. Start rebase first.')
  }
  
  writeFileSync(todoPath, todoContent + '\n', 'utf-8')
  return true
}

/**
 * Start interactive rebase
 */
async function startInteractiveRebase(repoPath: string, items: RebaseTodoItem[]): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  
  if (items.length === 0) {
    return 'No commits to rebase'
  }
  
  const firstCommit = items[0].hash
  
  try {
    await git.raw(['rebase', '-i', `${firstCommit}^`])
    return 'Rebase started successfully'
  } catch (error) {
    return `Rebase failed: ${error instanceof Error ? error.message : String(error)}`
  }
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

async function getLogGraph(repoPath: string, maxCount: number): Promise<string> {
  const git = simpleGit({ baseDir: repoPath })
  const count = Number.isFinite(maxCount) ? Math.max(1, Math.min(200, maxCount)) : 50
  // Get graph output: oneline with graph, all branches, decorated
  const output = await git.raw(['log', '--oneline', '--graph', '--all', '--decorate', '-n', String(count)])
  return output
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
  const res = await git.fetch(['--all'])
  return JSON.stringify(res, null, 2)
}

async function getGitAuthor() {
  const git = simpleGit()
  const name = (await git.raw(['config', 'user.name'])).trim()
  const email = (await git.raw(['config', 'user.email'])).trim()
  return { name, email }
}

async function setGitAuthor(name: string, email: string) {
  const git = simpleGit()
  const n = (name || '').trim()
  const e = (email || '').trim()
  if (!n) throw new Error('name is required')
  if (!e) throw new Error('email is required')
  await git.raw(['config', '--global', 'user.name', n])
  await git.raw(['config', '--global', 'user.email', e])
  return true
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

async function initRepo(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })
  await git.init()
}

async function createBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  const name = (branch || '').trim()
  if (!name) throw new Error('branch is required')
  await git.checkoutLocalBranch(name)
}

async function switchBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  await git.checkout(branch)
}

async function deleteBranch(repoPath: string, branch: string) {
  const git = simpleGit({ baseDir: repoPath })
  const name = (branch || '').trim()
  if (!name) throw new Error('branch is required')
  await git.deleteLocalBranch(name, true)
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

type ProjectType = 'Laravel' | 'Node.js' | 'Python' | 'General'

function getTerminalHistoryPath() {
  return resolvePath(homedir(), '.git_helper_terminal_history.json')
}

function readTerminalHistory(): string[] {
  const p = getTerminalHistoryPath()
  try {
    if (!existsSync(p)) return []
    const raw = readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, 200)
  } catch {
    return []
  }
}

function writeTerminalHistory(items: string[]) {
  const p = getTerminalHistoryPath()
  const normalized = items
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .slice(0, 200)
  writeFileSync(p, JSON.stringify(normalized, null, 2), 'utf8')
  return true
}

function addTerminalHistoryItem(command: string) {
  const c = (command || '').trim()
  if (!c) return true
  const current = readTerminalHistory()
  const next = [c, ...current.filter((x) => x !== c)]
  return writeTerminalHistory(next)
}

function detectProjectType(repoPath: string): ProjectType {
  const has = (...parts: string[]) => existsSync(resolvePath(repoPath, ...parts))
  if (has('artisan') || has('composer.json')) return 'Laravel'
  if (has('package.json')) return 'Node.js'
  if (has('pyproject.toml') || has('requirements.txt')) return 'Python'
  return 'General'
}

function getTerminalSuggestions(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'Laravel':
      return ['php artisan --version', 'php artisan migrate', 'php artisan route:list', 'php artisan config:cache', 'php artisan optimize', 'composer install']
    case 'Node.js':
      return ['node -v', 'npm -v', 'npm install', 'npm run build', 'npm test', 'npm run dev']
    case 'Python':
      return ['python --version', 'pip --version', 'pip install -r requirements.txt', 'python -m venv .venv', 'pytest']
    default:
      return ['git status', 'git branch', 'git log --oneline -n 20', 'git fetch --all', 'git pull', 'git push']
  }
}

export function registerGitIpc() {
  ipcMain.handle('app:open-external', async (_event, url: string) => {
    const u = (url || '').trim()
    if (!u) return false
    await shell.openExternal(u)
    return true
  })

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

  ipcMain.handle('repo:log-graph', async (_event, repoPath: string, maxCount: number) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await getLogGraph(repoPath, maxCount)
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

  ipcMain.handle('git:author-get', async () => {
    return await getGitAuthor()
  })

  ipcMain.handle('git:author-set', async (_event, name: string, email: string) => {
    return await setGitAuthor(name, email)
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
    addTerminalHistoryItem(command)
    return await runTerminal(repoPath, command)
  })

  ipcMain.handle('terminal:history-get', async () => {
    return readTerminalHistory()
  })

  ipcMain.handle('terminal:history-add', async (_event, command: string) => {
    return addTerminalHistoryItem(command)
  })

  ipcMain.handle('terminal:detect-project', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return detectProjectType(repoPath)
  })

  ipcMain.handle('terminal:suggestions', async (_event, projectType: ProjectType) => {
    return getTerminalSuggestions(projectType)
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

  ipcMain.handle('repo:stage-all', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await stageAll(repoPath)
    return true
  })

  ipcMain.handle('repo:init', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await initRepo(repoPath)
    return true
  })

  ipcMain.handle('repo:create-branch', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await createBranch(repoPath, branch)
    return true
  })

  ipcMain.handle('repo:switch-branch', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await switchBranch(repoPath, branch)
    return true
  })

  ipcMain.handle('repo:delete-branch', async (_event, repoPath: string, branch: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    await deleteBranch(repoPath, branch)
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

  // Merge conflict resolution IPC handlers
  ipcMain.handle('repo:parse-conflict', async (_event, repoPath: string, filePath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await parseConflictFile(repoPath, filePath)
  })

  ipcMain.handle('repo:resolve-conflict', async (_event, repoPath: string, filePath: string, side: 'ours' | 'theirs') => {
    if (!repoPath) throw new Error('repoPath is required')
    return await resolveConflict(repoPath, filePath, side)
  })

  ipcMain.handle('repo:mark-resolved', async (_event, repoPath: string, filePath: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await markResolved(repoPath, filePath)
  })

  ipcMain.handle('repo:open-external', async (_event, filePath: string) => {
    if (!filePath) throw new Error('filePath is required')
    try {
      await shell.openPath(filePath)
      return true
    } catch {
      return false
    }
  })

  // Interactive rebase IPC handlers
  ipcMain.handle('rebase:load-commits', async (_event, repoPath: string, baseCommit?: string) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await loadRebaseCommits(repoPath, baseCommit)
  })

  ipcMain.handle('rebase:start', async (_event, repoPath: string, todoItems: RebaseTodoItem[]) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await startInteractiveRebase(repoPath, todoItems)
  })

  ipcMain.handle('rebase:write-todo', async (_event, repoPath: string, todoItems: RebaseTodoItem[]) => {
    if (!repoPath) throw new Error('repoPath is required')
    return await writeRebaseTodoFile(repoPath, todoItems)
  })
}
