import { registerGitIpc } from './git.js'
import { registerAiIpc } from './ai.js'
import { registerDebugIpc } from './debug.js'
import { registerDatabaseIpc } from './database.js'
import { registerLicenseIPC } from './license.js'

export function registerIpc() {
  registerGitIpc()
  registerAiIpc()
  registerDebugIpc()
  registerDatabaseIpc()
  registerLicenseIPC()
}
