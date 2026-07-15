export type ProviderModel = {
  id: string
  label: string
}

export type ProviderPreset = {
  id: string
  label: string
  baseUrl: string
  defaultModel: string
  /** Curated chat model ids for this provider; empty for custom */
  models: ProviderModel[]
}

/**
 * Model catalogs curated from public provider docs (2026).
 * DeepSeek is first — the default provider for new users.
 */
export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek（默认）',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    models: [
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash（推荐）' },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      { id: 'deepseek-chat', label: 'deepseek-chat（旧别名）' },
      { id: 'deepseek-reasoner', label: 'deepseek-reasoner（旧别名）' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    models: [
      { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
      { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna' },
      { id: 'gpt-4.1', label: 'GPT-4.1' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
      { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
      { id: 'o3', label: 'o3' },
      { id: 'o4-mini', label: 'o4-mini' },
    ],
  },
  {
    id: 'dashscope',
    label: '通义（兼容模式）',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    models: [
      { id: 'qwen3.7-max', label: 'Qwen3.7 Max' },
      { id: 'qwen3.7-plus', label: 'Qwen3.7 Plus' },
      { id: 'qwen3.6-plus', label: 'Qwen3.6 Plus' },
      { id: 'qwen3.5-plus', label: 'Qwen3.5 Plus' },
      { id: 'qwen3.5-flash', label: 'Qwen3.5 Flash' },
      { id: 'qwen3-max', label: 'Qwen3 Max' },
      { id: 'qwen-max', label: 'Qwen-Max' },
      { id: 'qwen-plus', label: 'Qwen-Plus' },
      { id: 'qwen-turbo', label: 'Qwen-Turbo' },
      { id: 'qwen-flash', label: 'Qwen-Flash' },
      { id: 'qwen3-coder-plus', label: 'Qwen3 Coder Plus' },
    ],
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V3.2',
    models: [
      { id: 'deepseek-ai/DeepSeek-V4-Pro', label: 'DeepSeek V4 Pro' },
      { id: 'deepseek-ai/DeepSeek-V4-Flash', label: 'DeepSeek V4 Flash' },
      { id: 'deepseek-ai/DeepSeek-V3.2', label: 'DeepSeek V3.2' },
      { id: 'deepseek-ai/DeepSeek-V3.1', label: 'DeepSeek V3.1' },
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek V3' },
      { id: 'deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1' },
      { id: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3 235B' },
      { id: 'Qwen/Qwen3-32B', label: 'Qwen3 32B' },
      { id: 'Qwen/Qwen3-14B', label: 'Qwen3 14B' },
      { id: 'Qwen/Qwen3-8B', label: 'Qwen3 8B' },
      { id: 'THUDM/GLM-4.5', label: 'GLM-4.5' },
    ],
  },
  {
    id: 'custom',
    label: '自定义',
    baseUrl: '',
    defaultModel: '',
    models: [],
  },
]

export type LengthOption = {
  id: string
  label: string
  hint: string
}

export const LENGTH_OPTIONS: LengthOption[] = [
  { id: '', label: '不指定', hint: '由模型按中篇把握' },
  { id: 'short', label: '短篇', hint: '约 800–1500 字' },
  { id: 'medium', label: '中篇', hint: '约 2500–4000 字' },
  { id: 'long', label: '长篇试写', hint: '约 5000–8000 字' },
]

export function getProviderModels(providerId: string): ProviderModel[] {
  return PROVIDER_PRESETS.find((p) => p.id === providerId)?.models ?? []
}

/** Default provider for first-time users */
export const DEFAULT_PROVIDER_ID = 'deepseek'

/** Made with Cursor — product attribution constant */
export const CURSOR_CREDIT = '使用 Cursor 制作'
