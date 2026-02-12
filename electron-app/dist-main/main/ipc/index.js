import { registerGitIpc } from './git.js';
import { registerAiIpc } from './ai.js';
import { registerDebugIpc } from './debug.js';
import { registerDatabaseIpc } from './database.js';
export function registerIpc() {
    registerGitIpc();
    registerAiIpc();
    registerDebugIpc();
    registerDatabaseIpc();
}
