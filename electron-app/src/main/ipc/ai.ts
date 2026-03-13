import { ipcMain } from 'electron'
import { simpleGit } from 'simple-git'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

type AiProvider = 
  | 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'xai' | 'perplexity'
  | 'deepseek' | 'kimi' | 'qwen' | 'chatglm' | 'baichuan' | 'yi'
  | 'openrouter' | 'together' | 'groq' | 'fireworks'
  | 'ollama' | 'azure' | 'custom'

// Single provider config (used by call functions)
type AiConfig = {
  provider: AiProvider
  apiKey: string
  model?: string
  baseUrl?: string
}

// Multi-key config for auto-fallback
type MultiKeyConfig = {
  openaiKey?: string
  anthropicKey?: string
  googleKey?: string
  mistralKey?: string
  cohereKey?: string
  xaiKey?: string
  perplexityKey?: string
  deepseekKey?: string
  kimiKey?: string
  qwenKey?: string
  chatglmKey?: string
  baichuanKey?: string
  yiKey?: string
  openrouterKey?: string
  togetherKey?: string
  groqKey?: string
  fireworksKey?: string
  ollamaUrl?: string
  azureKey?: string
  customKey?: string
  customUrl?: string
  fallbackOrder?: string[]
}

// Backend API URL - can be configured via environment
const BACKEND_URL = process.env.DEVXFLOW_BACKEND_URL || 'http://localhost:5000'
const DESKTOP_API_KEY = process.env.DEVXFLOW_DESKTOP_API_KEY || 'devxflow-desktop-key'

// Default fallback order
const DEFAULT_FALLBACK = ['google', 'openai', 'anthropic', 'deepseek', 'mistral', 'cohere', 'xai', 'perplexity', 'kimi', 'qwen', 'chatglm', 'openrouter', 'together', 'groq', 'fireworks', 'ollama', 'azure', 'custom']

async function loadMultiKeyConfig(): Promise<MultiKeyConfig> {
  // Try backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/admin/ai-config/public`, {
      headers: { 'X-API-Key': DESKTOP_API_KEY }
    })
    
    if (res.ok) {
      const data = await res.json() as { success: boolean; config?: MultiKeyConfig }
      if (data.success && data.config) {
        console.log('[AI] Using multi-key config from backend')
        return data.config
      }
    }
  } catch (err) {
    console.warn('[AI] Backend config fetch failed:', err)
  }

  // Fallback to local file
  const filePath = join(homedir(), '.devxflow_ai_config.json')
  try {
    const raw = await readFile(filePath, 'utf-8')
    const parsed = JSON.parse(raw)
    console.log('[AI] Using local config file')
    return parsed
  } catch (err) {
    console.warn('[AI] No config found')
    return {}
  }
}

// Get API key for a provider
function getKeyForProvider(config: MultiKeyConfig, provider: string): string | null {
  const keyMap: Record<string, keyof MultiKeyConfig> = {
    'openai': 'openaiKey',
    'anthropic': 'anthropicKey',
    'google': 'googleKey',
    'mistral': 'mistralKey',
    'cohere': 'cohereKey',
    'xai': 'xaiKey',
    'perplexity': 'perplexityKey',
    'deepseek': 'deepseekKey',
    'kimi': 'kimiKey',
    'qwen': 'qwenKey',
    'chatglm': 'chatglmKey',
    'baichuan': 'baichuanKey',
    'yi': 'yiKey',
    'openrouter': 'openrouterKey',
    'together': 'togetherKey',
    'groq': 'groqKey',
    'fireworks': 'fireworksKey',
    'azure': 'azureKey',
    'custom': 'customKey'
  }
  const key = keyMap[provider]
  return key ? (config[key] as string) || null : null
}

function buildPrompt(diffText: string) {
  return [
    'Generate ONE concise Conventional Commit message (single line).',
    'Do not wrap in quotes.',
    'Use format: type(scope): subject',
    '',
    'Git diff:',
    diffText,
  ].join('\n')
}

async function getRepoDiff(repoPath: string) {
  const git = simpleGit({ baseDir: repoPath })

  // Combine staged + unstaged. Keep it bounded to avoid huge payloads.
  const unstaged = await git.diff([])
  const staged = await git.diff(['--cached'])

  const combined = ['--- STAGED ---', staged, '', '--- UNSTAGED ---', unstaged].join('\n')

  const maxChars = 12000
  if (combined.length > maxChars) return combined.slice(0, maxChars) + '\n\n... (diff truncated)'
  return combined
}

async function callOpenAi(config: AiConfig, prompt: string) {
  const model = config.model || 'gpt-3.5-turbo'

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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('AI returned empty response')
  return content.split('\n')[0].trim()
}

async function callGemini(config: AiConfig, prompt: string) {
  const model = config.model || 'gemini-pro'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  const content = String(json?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim()
  if (!content) throw new Error('Gemini returned empty response')
  return content.split('\n')[0].trim()
}

async function callAnthropic(config: AiConfig, prompt: string) {
  const model = config.model || 'claude-3-haiku-20240307'

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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { content?: Array<{ text?: string }> }
  const content = String(json?.content?.[0]?.text || '').trim()
  if (!content) throw new Error('Anthropic returned empty response')
  return content.split('\n')[0].trim()
}

async function callKimi(config: AiConfig, prompt: string) {
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kimi request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Kimi returned empty response')
  return content.split('\n')[0].trim()
}

async function callChatGLM(config: AiConfig, prompt: string) {
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ChatGLM request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('ChatGLM returned empty response')
  return content.split('\n')[0].trim()
}

async function callDeepSeek(config: AiConfig, prompt: string) {
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`DeepSeek request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('DeepSeek returned empty response')
  return content.split('\n')[0].trim()
}

async function callAzureOpenAI(config: AiConfig, prompt: string) {
  const model = config.model || 'gpt-35-turbo'
  const [endpoint, key] = config.apiKey.split('|')
  if (!endpoint || !key) {
    throw new Error('Azure config requires "endpoint|apiKey" format in apiKey field')
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Azure OpenAI request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Azure returned empty response')
  return content.split('\n')[0].trim()
}

async function callOpenRouter(config: AiConfig, prompt: string) {
  const model = config.model || 'openai/gpt-3.5-turbo'
  const baseUrl = config.baseUrl || 'https://openrouter.ai/api/v1'

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://devxflow.app',
      'X-Title': 'Dev-X-Flow',
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
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenRouter request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('OpenRouter returned empty response')
  return content.split('\n')[0].trim()
}

async function callOllama(config: AiConfig, prompt: string) {
  const model = config.model || 'llama2'
  const baseUrl = config.baseUrl || 'http://localhost:11434'

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You generate git commit messages.' },
        { role: 'user', content: prompt },
      ],
      stream: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ollama request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { message?: { content?: string } }
  const content = String(json?.message?.content || '').trim()
  if (!content) throw new Error('Ollama returned empty response')
  return content.split('\n')[0].trim()
}

async function callCustom(config: AiConfig, prompt: string) {
  if (!config.baseUrl) {
    throw new Error('Custom provider requires baseUrl')
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'default',
      messages: [
        { role: 'system', content: 'You generate git commit messages.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 60,
      temperature: 0.3,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Custom API request failed (${res.status}): ${text}`)
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Custom API returned empty response')
  return content.split('\n')[0].trim()
}

// Mistral AI
async function callMistral(config: AiConfig, prompt: string) {
  const model = config.model || 'mistral-small-latest'
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Mistral request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Mistral returned empty response')
  return content.split('\n')[0].trim()
}

// Cohere
async function callCohere(config: AiConfig, prompt: string) {
  const model = config.model || 'command-r'
  const res = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      message: prompt,
      preamble: 'You generate git commit messages.',
      max_tokens: 60,
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(`Cohere request failed (${res.status})`)
  const json = (await res.json()) as { text?: string }
  const content = String(json?.text || '').trim()
  if (!content) throw new Error('Cohere returned empty response')
  return content.split('\n')[0].trim()
}

// xAI (Grok)
async function callXai(config: AiConfig, prompt: string) {
  const model = config.model || 'grok-beta'
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`xAI request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('xAI returned empty response')
  return content.split('\n')[0].trim()
}

// Perplexity
async function callPerplexity(config: AiConfig, prompt: string) {
  const model = config.model || 'sonar-small-online'
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Perplexity request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Perplexity returned empty response')
  return content.split('\n')[0].trim()
}

// Qwen (Alibaba)
async function callQwen(config: AiConfig, prompt: string) {
  const model = config.model || 'qwen-turbo'
  const res = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: { messages: [
        { role: 'system', content: 'You generate git commit messages.' },
        { role: 'user', content: prompt },
      ]},
      parameters: { max_tokens: 60, temperature: 0.3 },
    }),
  })
  if (!res.ok) throw new Error(`Qwen request failed (${res.status})`)
  const json = (await res.json()) as { output?: { text?: string } }
  const content = String(json?.output?.text || '').trim()
  if (!content) throw new Error('Qwen returned empty response')
  return content.split('\n')[0].trim()
}

// Baichuan
async function callBaichuan(config: AiConfig, prompt: string) {
  const model = config.model || 'Baichuan2-Turbo'
  const res = await fetch('https://api.baichuan-ai.com/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Baichuan request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Baichuan returned empty response')
  return content.split('\n')[0].trim()
}

// Yi (01.AI)
async function callYi(config: AiConfig, prompt: string) {
  const model = config.model || 'yi-large'
  const res = await fetch('https://api.lingyiwanwu.com/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Yi request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Yi returned empty response')
  return content.split('\n')[0].trim()
}

// Together AI
async function callTogether(config: AiConfig, prompt: string) {
  const model = config.model || 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
  const baseUrl = config.baseUrl || 'https://api.together.xyz/v1'
  const res = await fetch(`${baseUrl}/chat/completions`, {
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
  })
  if (!res.ok) throw new Error(`Together request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Together returned empty response')
  return content.split('\n')[0].trim()
}

// Groq
async function callGroq(config: AiConfig, prompt: string) {
  const model = config.model || 'llama-3.3-70b-versatile'
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Groq request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Groq returned empty response')
  return content.split('\n')[0].trim()
}

// Fireworks AI
async function callFireworks(config: AiConfig, prompt: string) {
  const model = config.model || 'llama-v3p3-70b-instruct'
  const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
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
  })
  if (!res.ok) throw new Error(`Fireworks request failed (${res.status})`)
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = String(json?.choices?.[0]?.message?.content || '').trim()
  if (!content) throw new Error('Fireworks returned empty response')
  return content.split('\n')[0].trim()
}

export function registerAiIpc() {
  ipcMain.handle('ai:commit-message', async (_event, repoPath: string) => {
    if (!repoPath) throw new Error('repoPath is required')

    const multiConfig = await loadMultiKeyConfig()
    const diffText = await getRepoDiff(repoPath)
    const prompt = buildPrompt(diffText)
    
    // Get fallback order
    const fallbackOrder = multiConfig.fallbackOrder || DEFAULT_FALLBACK
    
    // Try each provider in order
    const errors: string[] = []
    for (const provider of fallbackOrder) {
      const apiKey = getKeyForProvider(multiConfig, provider)
      if (!apiKey) continue // Skip providers without keys
      
      try {
        console.log(`[AI] Trying provider: ${provider}`)
        const config: AiConfig = { 
          provider: provider as AiProvider, 
          apiKey,
          baseUrl: provider === 'ollama' ? multiConfig.ollamaUrl : 
                   provider === 'custom' ? multiConfig.customUrl : undefined
        }
        
        switch (provider) {
          case 'openai':
            return await callOpenAi(config, prompt)
          case 'google':
            return await callGemini(config, prompt)
          case 'anthropic':
            return await callAnthropic(config, prompt)
          case 'mistral':
            return await callMistral(config, prompt)
          case 'cohere':
            return await callCohere(config, prompt)
          case 'xai':
            return await callXai(config, prompt)
          case 'perplexity':
            return await callPerplexity(config, prompt)
          case 'deepseek':
            return await callDeepSeek(config, prompt)
          case 'kimi':
            return await callKimi(config, prompt)
          case 'qwen':
            return await callQwen(config, prompt)
          case 'chatglm':
            return await callChatGLM(config, prompt)
          case 'baichuan':
            return await callBaichuan(config, prompt)
          case 'yi':
            return await callYi(config, prompt)
          case 'azure':
            return await callAzureOpenAI(config, prompt)
          case 'openrouter':
            return await callOpenRouter(config, prompt)
          case 'together':
            return await callTogether(config, prompt)
          case 'groq':
            return await callGroq(config, prompt)
          case 'fireworks':
            return await callFireworks(config, prompt)
          case 'ollama':
            return await callOllama(config, prompt)
          case 'custom':
            return await callCustom(config, prompt)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[AI] Provider ${provider} failed:`, msg)
        errors.push(`${provider}: ${msg}`)
      }
    }
    
    throw new Error(`All AI providers failed. Errors: ${errors.join('; ')}`)
  })
}
