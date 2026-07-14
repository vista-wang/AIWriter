const MAX_URL_LENGTH = 2048

/**
 * Only allow http(s) API bases. Rejects empty, relative, and dangerous schemes.
 */
export function isValidApiBaseUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return false
  try {
    const url = new URL(trimmed)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function assertValidApiBaseUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!isValidApiBaseUrl(trimmed)) {
    throw new Error('API URI 无效：请使用以 http:// 或 https:// 开头的完整地址。')
  }
  return trimmed.replace(/\/+$/, '')
}

export function sanitizeModelId(raw: string): string {
  return raw.trim().slice(0, 200)
}

export function sanitizeApiKey(raw: string): string {
  // Trim only; keys may contain special characters.
  return raw.trim().slice(0, 512)
}

/** Soft cap to avoid freezing the tab / blowing localStorage. */
export const MAX_NOVEL_CHARS = 400_000
export const MAX_PROMPT_CHARS = 100_000
export const MAX_INPUT_CHARS = 50_000
