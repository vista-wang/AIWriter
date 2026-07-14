import { useCallback, useState } from 'react'
import {
  asString,
  clampString,
  isRecord,
  readJson,
  removeKey,
  writeJson,
} from '../lib/storage'
import { MAX_INPUT_CHARS, MAX_NOVEL_CHARS } from '../lib/validate'

export type HistoryEntry = {
  id: string
  createdAt: number
  title: string
  requirements: string
  worldview: string
  lengthId: string
  model: string
  content: string
}

export const HISTORY_STORAGE_KEY = 'aiwriter.history.v1'
const MAX_ENTRIES = 80

function sanitizeEntry(raw: unknown): HistoryEntry | null {
  if (!isRecord(raw)) return null
  const id = asString(raw.id)
  const content = asString(raw.content)
  const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
    ? raw.createdAt
    : Date.now()
  if (!id || !content.trim()) return null
  return {
    id: id.slice(0, 80),
    createdAt,
    title: clampString(asString(raw.title, '未命名作品'), 80),
    requirements: clampString(asString(raw.requirements), MAX_INPUT_CHARS),
    worldview: clampString(asString(raw.worldview), MAX_INPUT_CHARS),
    lengthId: asString(raw.lengthId),
    model: clampString(asString(raw.model), 200),
    content: clampString(content, MAX_NOVEL_CHARS),
  }
}

function loadHistory(): HistoryEntry[] {
  const parsed = readJson<unknown>(HISTORY_STORAGE_KEY)
  if (!Array.isArray(parsed)) return []
  return parsed.map(sanitizeEntry).filter((e): e is HistoryEntry => e != null).slice(0, MAX_ENTRIES)
}

function persist(entries: HistoryEntry[]): { ok: boolean; quotaExceeded: boolean } {
  return writeJson(HISTORY_STORAGE_KEY, entries.slice(0, MAX_ENTRIES))
}

export function createHistoryTitle(content: string, requirements: string): string {
  const fromContent = content.trim().split(/\n+/).find((line) => line.trim())
  if (fromContent) {
    const cleaned = fromContent.replace(/^#+\s*/, '').trim()
    return cleaned.length > 36 ? `${cleaned.slice(0, 36)}…` : cleaned
  }
  const fromReq = requirements.trim().split(/\n+/)[0]?.trim()
  if (fromReq) return fromReq.length > 36 ? `${fromReq.slice(0, 36)}…` : fromReq
  return '未命名作品'
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>(() =>
    typeof window === 'undefined' ? [] : loadHistory(),
  )
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  const addEntry = useCallback(
    (input: Omit<HistoryEntry, 'id' | 'createdAt' | 'title'> & { title?: string }) => {
      const content = clampString(input.content, MAX_NOVEL_CHARS)
      if (!content.trim()) return null

      const entry: HistoryEntry = {
        id: newId(),
        createdAt: Date.now(),
        title: input.title ?? createHistoryTitle(content, input.requirements),
        requirements: clampString(input.requirements, MAX_INPUT_CHARS),
        worldview: clampString(input.worldview, MAX_INPUT_CHARS),
        lengthId: input.lengthId,
        model: clampString(input.model, 200),
        content,
      }

      setEntries((prev) => {
        const next = [entry, ...prev].slice(0, MAX_ENTRIES)
        const result = persist(next)
        if (!result.ok) {
          setStorageWarning(
            result.quotaExceeded
              ? '本地存储空间不足，历史可能未完整保存。可删除旧记录后重试。'
              : '无法保存历史记录。',
          )
          // Still keep in-memory list for the session.
        } else {
          setStorageWarning(null)
        }
        return next
      })
      return entry
    },
    [],
  )

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== id)
      persist(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setEntries([])
    removeKey(HISTORY_STORAGE_KEY)
    setStorageWarning(null)
  }, [])

  return { entries, addEntry, removeEntry, clearHistory, storageWarning }
}
