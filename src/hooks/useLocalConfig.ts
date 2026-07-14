import { useCallback, useEffect, useState } from 'react'
import defaultSystemPrompt from '../../prompts/novel-writer.system.md?raw'
import { PROVIDER_PRESETS } from '../config/providers'
import {
  asBoolean,
  asString,
  clampString,
  isRecord,
  readJson,
  removeKey,
  writeJson,
} from '../lib/storage'
import { MAX_INPUT_CHARS, MAX_PROMPT_CHARS, sanitizeApiKey, sanitizeModelId } from '../lib/validate'

export const CONFIG_STORAGE_KEY = 'aiwriter.config.v1'

export type AppConfig = {
  providerId: string
  baseUrl: string
  apiKey: string
  model: string
  requirements: string
  worldview: string
  lengthId: string
  enableThinking: boolean
  /** Empty means bundled default from prompts/novel-writer.system.md */
  systemPrompt: string
}

const defaultPreset = PROVIDER_PRESETS[0]

export const DEFAULT_SYSTEM_PROMPT = defaultSystemPrompt.trim()

export const DEFAULT_CONFIG: AppConfig = {
  providerId: defaultPreset.id,
  baseUrl: defaultPreset.baseUrl,
  apiKey: '',
  model: defaultPreset.defaultModel,
  requirements: '',
  worldview: '',
  lengthId: '',
  enableThinking: false,
  systemPrompt: '',
}

function sanitizeConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) return DEFAULT_CONFIG

  const providerId = asString(raw.providerId, DEFAULT_CONFIG.providerId)
  const known = PROVIDER_PRESETS.some((p) => p.id === providerId)

  return {
    providerId: known ? providerId : 'custom',
    baseUrl: clampString(asString(raw.baseUrl, DEFAULT_CONFIG.baseUrl), 2048),
    apiKey: sanitizeApiKey(asString(raw.apiKey)),
    model: sanitizeModelId(asString(raw.model, DEFAULT_CONFIG.model)),
    requirements: clampString(asString(raw.requirements), MAX_INPUT_CHARS),
    worldview: clampString(asString(raw.worldview), MAX_INPUT_CHARS),
    lengthId: asString(raw.lengthId),
    enableThinking: asBoolean(raw.enableThinking, false),
    systemPrompt: clampString(asString(raw.systemPrompt), MAX_PROMPT_CHARS),
  }
}

function loadConfig(): AppConfig {
  const parsed = readJson<unknown>(CONFIG_STORAGE_KEY)
  if (parsed == null) return DEFAULT_CONFIG
  return sanitizeConfig(parsed)
}

export function resolveSystemPrompt(config: AppConfig): string {
  const custom = config.systemPrompt.trim()
  return custom || DEFAULT_SYSTEM_PROMPT
}

export function useLocalConfig() {
  const [config, setConfig] = useState<AppConfig>(() =>
    typeof window === 'undefined' ? DEFAULT_CONFIG : loadConfig(),
  )
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  useEffect(() => {
    const result = writeJson(CONFIG_STORAGE_KEY, config)
    if (!result.ok) {
      setStorageWarning(
        result.quotaExceeded
          ? '本地存储空间不足，设置可能无法保存。请清理历史或缩短系统提示词。'
          : '无法写入本地设置。',
      )
    } else {
      setStorageWarning(null)
    }
  }, [config])

  const update = useCallback((patch: Partial<AppConfig>) => {
    setConfig((prev) =>
      sanitizeConfig({
        ...prev,
        ...patch,
        apiKey: patch.apiKey !== undefined ? sanitizeApiKey(patch.apiKey) : prev.apiKey,
        model: patch.model !== undefined ? sanitizeModelId(patch.model) : prev.model,
        requirements:
          patch.requirements !== undefined
            ? clampString(patch.requirements, MAX_INPUT_CHARS)
            : prev.requirements,
        worldview:
          patch.worldview !== undefined
            ? clampString(patch.worldview, MAX_INPUT_CHARS)
            : prev.worldview,
        systemPrompt:
          patch.systemPrompt !== undefined
            ? clampString(patch.systemPrompt, MAX_PROMPT_CHARS)
            : prev.systemPrompt,
        baseUrl:
          patch.baseUrl !== undefined ? clampString(patch.baseUrl, 2048) : prev.baseUrl,
      }),
    )
  }, [])

  const applyProvider = useCallback((providerId: string) => {
    const preset = PROVIDER_PRESETS.find((p) => p.id === providerId)
    if (!preset) return
    setConfig((prev) => ({
      ...prev,
      providerId: preset.id,
      baseUrl: preset.baseUrl,
      model: preset.defaultModel || prev.model,
    }))
  }, [])

  const resetSystemPrompt = useCallback(() => {
    setConfig((prev) => ({ ...prev, systemPrompt: '' }))
  }, [])

  const clearApiKey = useCallback(() => {
    setConfig((prev) => ({ ...prev, apiKey: '' }))
  }, [])

  const clearAllLocalData = useCallback(() => {
    removeKey(CONFIG_STORAGE_KEY)
    setConfig(DEFAULT_CONFIG)
  }, [])

  return {
    config,
    update,
    applyProvider,
    setConfig,
    resetSystemPrompt,
    clearApiKey,
    clearAllLocalData,
    storageWarning,
  }
}
