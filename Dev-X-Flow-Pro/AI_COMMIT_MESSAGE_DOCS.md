# Dev-X-Flow-Pro AI Commit Message Generation Documentation

## Overview
Dev-X-Flow-Pro now supports AI-powered commit message generation with multi-provider support. This feature analyzes your git diff and generates professional, conventional commit messages using various AI providers.

## Supported AI Providers

| Provider | Model | API Key URL |
|----------|-------|-------------|
| OpenAI | gpt-3.5-turbo | https://platform.openai.com/api-keys |
| Google Gemini | gemini-pro | https://makersuite.google.com/app/apikey |
| Anthropic Claude | claude-3-haiku | https://console.anthropic.com/settings/keys |
| Moonshot Kimi | moonshot-v1-8k | https://platform.moonshot.cn/console/api-keys |
| ChatGLM | glm-4 | https://open.bigmodel.cn/usercenter/apikeys |
| DeepSeek | deepseek-chat | https://platform.deepseek.com/api_keys |
| Azure OpenAI | gpt-35-turbo | https://portal.azure.com |

## Setup Instructions

### First-Time Setup
1. Open Dev-X-Flow-Pro
2. Navigate to the "Status & Commit" tab
3. Click the "✨ AI Generate" button next to the commit message field
4. Click "Yes" when prompted to configure API settings
5. Select your preferred AI provider from the dropdown
6. Enter your API key for the selected provider
7. (Optional) Enter a custom model name if desired
8. Click "🔑 Get API Key" if you need to obtain an API key
9. Click "Save" to store your configuration

### Using the Feature
1. Stage your changes using "1. Stage All" button
2. Click "✨ AI Generate" button
3. The AI will analyze your staged changes
4. A commit message will be generated and placed in the commit field
5. Edit the message if needed
6. Click "2. Commit" to commit your changes

## Configuration File
Settings are stored in `~/.gitflow_ai_config.json`:
```json
{
  "api_key": "your-api-key",
  "provider": "openai",
  "custom_model": ""
}
```

## Technical Details

### How It Works
1. Retrieves git diff of staged changes (or unstaged if none staged)
2. Sends diff to selected AI provider with a structured prompt
3. AI analyzes the changes and generates a conventional commit message
4. Message is cleaned and truncated to 72 characters max
5. Result appears in the commit message field

### Prompt Template
```
Analyze the following git diff and generate a concise, professional commit message.
Follow conventional commits format (type: description).
Keep it under 72 characters.

Git diff:
[git diff content]

Generate only the commit message, nothing else.
```

### API Request Structure
Each provider has specific:
- **Endpoint URL**: Provider's API endpoint
- **Headers**: Authentication headers
- **Payload**: Request body format
- **Response Extractor**: How to parse the AI response

## Troubleshooting

### "API Key Required" Message
- Click "Yes" to configure your API key
- Select your provider
- Enter a valid API key
- Click Save

### "No Changes Detected" Message
- Stage your changes first using "1. Stage All"
- Or ensure you have unstaged changes

### API Errors
- Check your API key is valid
- Verify you have credits/quota with your provider
- Check your internet connection
- Try a different provider

### Custom Models
- Leave "Custom Model" field empty to use default
- Enter specific model name to override (e.g., "gpt-4", "claude-3-opus")
- For Azure: use format "resource-name/deployment-name"

## Security Notes
- API keys are stored locally in `~/.gitflow_ai_config.json`
- Keys are never transmitted to any server except the AI provider
- Use environment variables or secure key management for production use

## Provider-Specific Notes

### Azure OpenAI
- Requires resource name and deployment name
- Enter as "resource-name/deployment-name" in custom model field
- Uses api-key header authentication

### Google Gemini
- Uses API key as query parameter
- Different response format than OpenAI
- Free tier available

### Anthropic Claude
- Requires x-api-key header
- Uses anthropic-version header
- Fast and reliable for short prompts

## Feature Status
✓ **Implementation Complete** - Ready for use with any supported provider

---
*Documentation generated for Dev-X-Flow-Pro*
