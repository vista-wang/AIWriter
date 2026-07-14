import {
  assertValidApiBaseUrl,
  sanitizeApiKey,
  sanitizeModelId,
} from './validate'

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type StreamChatParams = {
  baseUrl: string
  apiKey: string
  model: string
  messages: ChatMessage[]
  enableThinking?: boolean
  providerId?: string
  signal?: AbortSignal
  onDelta: (text: string) => void
  onReasoningDelta?: (text: string) => void
}

function chatCompletionsUrl(baseUrl: string): string {
  const base = assertValidApiBaseUrl(baseUrl)
  if (base.endsWith('/chat/completions')) return base
  return `${base}/chat/completions`
}

function formatApiError(status: number, body: string): string {
  // Avoid dumping secrets that some gateways echo back.
  const trimmed = body.replace(/sk-[a-zA-Z0-9_-]{10,}/g, 'sk-***').trim().slice(0, 300)
  if (status === 401 || status === 403) {
    return `鉴权失败（${status}）。请检查 API Key 是否正确、是否有权限。`
  }
  if (status === 404) {
    return `接口不存在（404）。请确认 API URI 是否为 OpenAI 兼容的 /v1 根路径。`
  }
  if (status === 429) {
    return `请求过于频繁或额度不足（429）。请稍后再试。`
  }
  if (status >= 500) {
    return `服务端错误（${status}）。请稍后重试。`
  }
  return `请求失败（${status}）。${trimmed || '无详细错误信息'}`
}

export function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = 'name' in err ? String(err.name) : ''
  return name === 'AbortError'
}

/** Provider-specific body fields for enabling / disabling chain-of-thought. */
export function buildThinkingBodyFields(
  providerId: string | undefined,
  enableThinking: boolean,
): Record<string, unknown> {
  const id = providerId ?? 'custom'

  if (id === 'deepseek') {
    return { thinking: { type: enableThinking ? 'enabled' : 'disabled' } }
  }
  if (id === 'dashscope' || id === 'siliconflow') {
    return { enable_thinking: enableThinking }
  }
  if (id === 'openai') {
    return enableThinking ? { reasoning_effort: 'medium' } : {}
  }
  return enableThinking
    ? { thinking: { type: 'enabled' }, enable_thinking: true }
    : { thinking: { type: 'disabled' }, enable_thinking: false }
}

export async function streamChatCompletion(params: StreamChatParams): Promise<void> {
  const {
    baseUrl,
    apiKey,
    model,
    messages,
    enableThinking = false,
    providerId,
    signal,
    onDelta,
    onReasoningDelta,
  } = params

  const safeKey = sanitizeApiKey(apiKey)
  const safeModel = sanitizeModelId(model)
  if (!safeKey) throw new Error('请先填写 API Key。')
  if (!safeModel) throw new Error('请先填写模型名称。')
  if (!messages.length) throw new Error('请求消息为空。')

  const url = chatCompletionsUrl(baseUrl)
  const body: Record<string, unknown> = {
    model: safeModel,
    messages,
    stream: true,
    temperature: 0.85,
    ...buildThinkingBodyFields(providerId, enableThinking),
  }

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${safeKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (signal?.aborted || isAbortError(err)) throw err
    const message = err instanceof Error ? err.message : String(err)
    if (/Failed to fetch|NetworkError|Load failed|CORS/i.test(message)) {
      throw new Error(
        '无法连接 API（网络或 CORS）。浏览器直连需对方允许跨域；可换兼容 CORS 的网关。',
      )
    }
    throw new Error(`网络错误：${message}`)
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    throw new Error(formatApiError(response.status, errBody))
  }

  if (!response.body) {
    throw new Error('响应无正文流，无法流式读取。')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const onAbort = () => {
    void reader.cancel().catch(() => undefined)
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith(':')) continue
        if (!line.startsWith('data:')) continue

        const data = line.slice(5).trim()
        if (data === '[DONE]') return

        try {
          const json = JSON.parse(data) as {
            choices?: Array<{
              delta?: {
                content?: string | null
                reasoning_content?: string | null
                reasoning?: string | null
              }
              message?: {
                content?: string | null
                reasoning_content?: string | null
              }
            }>
            error?: { message?: string }
          }

          if (json.error?.message) {
            throw new Error(json.error.message.slice(0, 300))
          }

          const choice = json.choices?.[0]
          const reasoning =
            choice?.delta?.reasoning_content ??
            choice?.delta?.reasoning ??
            choice?.message?.reasoning_content
          if (typeof reasoning === 'string' && reasoning) onReasoningDelta?.(reasoning)

          const delta = choice?.delta?.content ?? choice?.message?.content
          if (typeof delta === 'string' && delta) onDelta(delta)
        } catch (chunkErr) {
          if (chunkErr instanceof SyntaxError) continue
          throw chunkErr
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

export function buildUserPrompt(input: {
  requirements: string
  worldview: string
  lengthId: string
  lengthLabel: string
}): string {
  const parts: string[] = ['请根据以下设定创作小说正文。']

  if (input.requirements.trim()) {
    parts.push(`## 写作要求\n${input.requirements.trim()}`)
  } else {
    parts.push('## 写作要求\n（未填写，请自行拟定合理题材与情节。）')
  }

  if (input.worldview.trim()) {
    parts.push(`## 世界观与背景\n${input.worldview.trim()}`)
  }

  if (input.lengthId) {
    parts.push(`## 目标长度\n${input.lengthLabel}`)
  }

  parts.push('请直接开始正文。')
  return parts.join('\n\n')
}

export function buildAskUserPrompt(novel: string, question: string): string {
  return [
    '请基于下列小说正文回答我的追问。不要重写整篇小说，除非我明确要求举例改写。',
    '',
    '## 小说正文',
    novel.trim(),
    '',
    '## 追问',
    question.trim(),
  ].join('\n')
}

export function buildReviseUserPrompt(novel: string, instruction: string): string {
  return [
    '请根据修改意见，在下列原文基础上产出完整修订后的小说正文。',
    '只输出修订后的全文，不要解释过程。',
    '',
    '## 原文',
    novel.trim(),
    '',
    '## 修改意见',
    instruction.trim(),
  ].join('\n')
}

function stripControlChars(value: string): string {
  let out = ''
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code >= 32 || code === 9) out += value[i]
  }
  return out
}

export function downloadTextFile(filename: string, content: string) {
  const safeName =
    stripControlChars(filename.replace(/[\\/:*?"<>|]/g, '_')).slice(0, 120) || 'novel.txt'
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = safeName
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function suggestDownloadFilename(content: string): string {
  const first = content.trim().split(/\n+/).find((l) => l.trim())
  const base = stripControlChars(
    (first ?? 'novel').replace(/^#+\s*/, '').replace(/[\\/:*?"<>|]/g, '_'),
  )
    .trim()
    .slice(0, 40)
  const stamp = new Date().toISOString().slice(0, 10)
  return `${base || 'novel'}-${stamp}.txt`
}
