"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpc = registerIpc;
const git_js_1 = require("./git.js");
const ai_js_1 = require("./ai.js");
const debug_js_1 = require("./debug.js");
const database_js_1 = require("./database.js");
function registerIpc() {
    (0, git_js_1.registerGitIpc)();
    (0, ai_js_1.registerAiIpc)();
    (0, debug_js_1.registerDebugIpc)();
    (0, database_js_1.registerDatabaseIpc)();
}
