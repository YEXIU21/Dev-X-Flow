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
async function callGemini(config, prompt) {
    const model = config.model || 'gemini-pro';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Gemini request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    if (!content)
        throw new Error('Gemini returned empty response');
    return content.split('\n')[0].trim();
}
async function callAnthropic(config, prompt) {
    const model = config.model || 'claude-3-haiku-20240307';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'x-api-key': config.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            max_tokens: 60,
            messages: [{ role: 'user', content: prompt }],
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.content?.[0]?.text || '').trim();
    if (!content)
        throw new Error('Anthropic returned empty response');
    return content.split('\n')[0].trim();
}
async function callKimi(config, prompt) {
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model || 'moonshot-v1-8k',
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
        throw new Error(`Kimi request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!content)
        throw new Error('Kimi returned empty response');
    return content.split('\n')[0].trim();
}
async function callChatGLM(config, prompt) {
    const res = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: config.apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model || 'glm-4',
            messages: [
                { role: 'system', content: 'You generate git commit messages.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: 60,
        }),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`ChatGLM request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!content)
        throw new Error('ChatGLM returned empty response');
    return content.split('\n')[0].trim();
}
async function callDeepSeek(config, prompt) {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: config.model || 'deepseek-chat',
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
        throw new Error(`DeepSeek request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!content)
        throw new Error('DeepSeek returned empty response');
    return content.split('\n')[0].trim();
}
async function callAzureOpenAI(config, prompt) {
    const model = config.model || 'gpt-35-turbo';
    const [endpoint, key] = config.apiKey.split('|');
    if (!endpoint || !key) {
        throw new Error('Azure config requires "endpoint|apiKey" format in apiKey field');
    }
    const res = await fetch(`${endpoint}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`, {
        method: 'POST',
        headers: {
            'api-key': key,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        throw new Error(`Azure OpenAI request failed (${res.status}): ${text}`);
    }
    const json = (await res.json());
    const content = String(json?.choices?.[0]?.message?.content || '').trim();
    if (!content)
        throw new Error('Azure returned empty response');
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
            case 'gemini':
                return await callGemini(config, prompt);
            case 'anthropic':
                return await callAnthropic(config, prompt);
            case 'kimi':
                return await callKimi(config, prompt);
            case 'chatglm':
                return await callChatGLM(config, prompt);
            case 'deepseek':
                return await callDeepSeek(config, prompt);
            case 'azure':
                return await callAzureOpenAI(config, prompt);
            default:
                throw new Error(`Unsupported provider: ${config.provider}`);
        }
    });
}
