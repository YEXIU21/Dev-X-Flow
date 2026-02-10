import { ipcMain } from 'electron';
import { simpleGit } from 'simple-git';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
async function loadAiConfig() {
    const filePath = join(homedir(), '.devxflow_ai_config.json');
    const raw = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    const provider = (parsed.provider || 'openai');
    const apiKey = String(parsed.apiKey || '').trim();
    const model = parsed.model;
    if (!apiKey) {
        throw new Error('AI API key not configured. Create ~/.devxflow_ai_config.json with { "provider": "openai", "apiKey": "...", "model": "gpt-3.5-turbo" }');
    }
    return { provider, apiKey, model };
}
function buildPrompt(diffText) {
    return [
        'Generate ONE concise Conventional Commit message (single line).',
        'Do not wrap in quotes.',
        'Use format: type(scope): subject',
        '',
        'Git diff:',
        diffText,
    ].join('\n');
}
async function getRepoDiff(repoPath) {
    const git = simpleGit({ baseDir: repoPath });
    // Combine staged + unstaged. Keep it bounded to avoid huge payloads.
    const unstaged = await git.diff([]);
    const staged = await git.diff(['--cached']);
    const combined = ['--- STAGED ---', staged, '', '--- UNSTAGED ---', unstaged].join('\n');
    const maxChars = 12000;
    if (combined.length > maxChars)
        return combined.slice(0, maxChars) + '\n\n... (diff truncated)';
    return combined;
}
async function callOpenAi(config, prompt) {
    const model = config.model || 'gpt-3.5-turbo';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: 'You generate git commit messages.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 60,
            temperature: 0.3,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!content)
        throw new Error('AI returned empty response');
    return content.split('\n')[0].trim();
}
export function registerAiIpc() {
    ipcMain.handle('ai:commit-message', async (_event, repoPath) => {
        if (!repoPath)
            throw new Error('repoPath is required');
        const config = await loadAiConfig();
        const diffText = await getRepoDiff(repoPath);
        const prompt = buildPrompt(diffText);
        switch (config.provider) {
            case 'openai':
                return await callOpenAi(config, prompt);
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    });
}
