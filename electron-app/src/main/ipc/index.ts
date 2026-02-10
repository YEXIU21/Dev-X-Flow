import { registerGitIpc } from './git.js'
import { registerAiIpc } from './ai.js'

export function registerIpc() {
  registerGitIpc()
  registerAiIpc()
}
