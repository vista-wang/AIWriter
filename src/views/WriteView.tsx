import { useEffect, useMemo, useRef, useState } from 'react'
import askSystemPrompt from '../../prompts/novel-ask.system.md?raw'
import { CURSOR_CREDIT, LENGTH_OPTIONS } from '../config/providers'
import { resolveSystemPrompt, type AppConfig } from '../hooks/useLocalConfig'
import {
  buildAskUserPrompt,
  buildReviseUserPrompt,
  buildUserPrompt,
  downloadTextFile,
  isAbortError,
  streamChatCompletion,
  suggestDownloadFilename,
  type ChatMessage,
} from '../lib/openaiCompatible'
import { isValidApiBaseUrl, MAX_INPUT_CHARS, MAX_NOVEL_CHARS } from '../lib/validate'

type StreamMode = 'write' | 'ask' | 'revise'

type WriteViewProps = {
  config: AppConfig
  update: (patch: Partial<AppConfig>) => void
  output: string
  setOutput: (value: string | ((prev: string) => string)) => void
  onNavigateSettings: () => void
  onSaveHistory: (content: string) => void
  storageWarning?: string | null
}

export function WriteView({
  config,
  update,
  output,
  setOutput,
  onNavigateSettings,
  onSaveHistory,
  storageWarning = null,
}: WriteViewProps) {
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [streamMode, setStreamMode] = useState<StreamMode | null>(null)
  const [copied, setCopied] = useState(false)
  const [reasoning, setReasoning] = useState('')
  const [askInput, setAskInput] = useState('')
  const [reviseInput, setReviseInput] = useState('')
  const [askReply, setAskReply] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const outputRef = useRef<HTMLDivElement | null>(null)
  const outputSnapshotRef = useRef('')
  const mountedRef = useRef(true)

  const lengthLabel = useMemo(() => {
    const opt = LENGTH_OPTIONS.find((o) => o.id === config.lengthId)
    if (!opt || !opt.id) return ''
    return `${opt.label}（${opt.hint}）`
  }, [config.lengthId])

  const apiReady =
    isValidApiBaseUrl(config.baseUrl) &&
    Boolean(config.apiKey.trim()) &&
    Boolean(config.model.trim())

  const canGenerate = apiReady && !generating
  const canAsk = apiReady && !generating && Boolean(output.trim()) && Boolean(askInput.trim())
  const canRevise =
    apiReady && !generating && Boolean(output.trim()) && Boolean(reviseInput.trim())

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!generating || !outputRef.current) return
    outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [output, askReply, reasoning, generating])

  async function runStream(
    messages: ChatMessage[],
    mode: StreamMode,
    onText: (full: string) => void,
  ): Promise<{ text: string; aborted: boolean; failed: boolean }> {
    setError(null)
    setCopied(false)
    setReasoning('')
    setStreamMode(mode)
    setGenerating(true)

    const controller = new AbortController()
    abortRef.current = controller
    let finalText = ''

    try {
      await streamChatCompletion({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        model: config.model,
        providerId: config.providerId,
        enableThinking: config.enableThinking,
        messages,
        signal: controller.signal,
        onDelta: (text) => {
          finalText += text
          if (finalText.length > MAX_NOVEL_CHARS) {
            finalText = finalText.slice(0, MAX_NOVEL_CHARS)
            controller.abort()
            return
          }
          if (mountedRef.current) onText(finalText)
        },
        onReasoningDelta: (text) => {
          if (mountedRef.current) setReasoning((prev) => (prev + text).slice(0, MAX_NOVEL_CHARS))
        },
      })
      return { text: finalText, aborted: controller.signal.aborted, failed: false }
    } catch (err) {
      if (controller.signal.aborted || isAbortError(err)) {
        if (mountedRef.current && finalText.length >= MAX_NOVEL_CHARS) {
          setError(`输出已达到长度上限（${MAX_NOVEL_CHARS} 字），已停止。`)
        } else if (mountedRef.current) {
          setError('已停止生成。')
        }
        return { text: finalText, aborted: true, failed: false }
      }
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : String(err))
      }
      return { text: finalText, aborted: false, failed: true }
    } finally {
      if (mountedRef.current) {
        setGenerating(false)
        setStreamMode(null)
      }
      abortRef.current = null
    }
  }

  async function handleGenerate() {
    if (!canGenerate) return
    setOutput('')
    setAskReply('')

    const messages: ChatMessage[] = [
      { role: 'system', content: resolveSystemPrompt(config) },
      {
        role: 'user',
        content: buildUserPrompt({
          requirements: config.requirements,
          worldview: config.worldview,
          lengthId: config.lengthId,
          lengthLabel,
        }),
      },
    ]

    const { text, failed } = await runStream(messages, 'write', (full) => setOutput(full))
    if (!failed && text.trim()) onSaveHistory(text)
  }

  async function handleAsk() {
    if (!canAsk) return
    const question = askInput.trim().slice(0, MAX_INPUT_CHARS)
    setAskInput('')
    setAskReply('')

    const messages: ChatMessage[] = [
      { role: 'system', content: askSystemPrompt.trim() },
      {
        role: 'user',
        content: buildAskUserPrompt(output.slice(0, MAX_NOVEL_CHARS), question),
      },
    ]

    await runStream(messages, 'ask', (full) => setAskReply(full))
  }

  async function handleRevise() {
    if (!canRevise) return
    const instruction = reviseInput.trim().slice(0, MAX_INPUT_CHARS)
    const snapshot = output
    outputSnapshotRef.current = snapshot
    setReviseInput('')

    const messages: ChatMessage[] = [
      { role: 'system', content: resolveSystemPrompt(config) },
      {
        role: 'user',
        content: buildReviseUserPrompt(snapshot.slice(0, MAX_NOVEL_CHARS), instruction),
      },
    ]

    let replaced = false
    const { text, failed, aborted } = await runStream(messages, 'revise', (full) => {
      replaced = true
      setOutput(full)
    })

    // Hard failure with no tokens: restore original novel.
    if (failed && !replaced) {
      setOutput(snapshot)
      return
    }

    // Aborted before any token: restore original.
    if (aborted && !replaced) {
      setOutput(snapshot)
      return
    }

    if (text.trim()) onSaveHistory(text)
  }

  function handleStop() {
    abortRef.current?.abort()
  }

  async function handleCopy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output)
      setCopied(true)
      window.setTimeout(() => {
        if (mountedRef.current) setCopied(false)
      }, 1600)
    } catch {
      setError('复制失败，请手动选择文本复制。')
    }
  }

  function handleDownload() {
    if (!output.trim()) return
    downloadTextFile(suggestDownloadFilename(output), output)
  }

  const statusLabel =
    streamMode === 'ask'
      ? '正在追问…'
      : streamMode === 'revise'
        ? '正在修改…'
        : generating
          ? '正在生成…'
          : '生成结果'

  return (
    <div className="write-layout">
      <section className="write-output" aria-labelledby="output-heading">
        <div className="pane-toolbar">
          <div className="pane-toolbar-text">
            <h2 id="output-heading">正文</h2>
            <p>{statusLabel}</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-secondary" disabled={!output} onClick={handleCopy}>
              {copied ? '已复制' : '复制'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!output.trim()}
              onClick={handleDownload}
            >
              下载
            </button>
            {generating ? (
              <button type="button" className="btn btn-secondary" onClick={handleStop}>
                停止
              </button>
            ) : null}
          </div>
        </div>

        {storageWarning ? (
          <div className="banner banner-hint" role="status">
            {storageWarning}
          </div>
        ) : null}

        {error ? (
          <div className="banner banner-error" role="alert">
            {error}
          </div>
        ) : null}

        <div className="output-scroll" ref={outputRef}>
          {config.enableThinking && (reasoning || generating) ? (
            <details className="reasoning-box" open={Boolean(reasoning) || generating}>
              <summary>思考过程</summary>
              <pre className="reasoning-text">{reasoning || '等待模型输出思维链…'}</pre>
            </details>
          ) : null}

          <article
            className={`output-pane ${streamMode === 'write' || streamMode === 'revise' ? 'output-live' : ''}`}
            aria-live="polite"
            aria-busy={streamMode === 'write' || streamMode === 'revise'}
          >
            {output ? (
              <pre className="output-text">{output}</pre>
            ) : (
              <div className="output-empty">
                <p className="empty-title">
                  {streamMode === 'write' ? '正在生成…' : '尚未开始写作'}
                </p>
                <p className="empty-desc">在右侧填写要求后点击「开始写作」，正文将显示在此处。</p>
              </div>
            )}
          </article>

          {askReply || streamMode === 'ask' ? (
            <section className="ask-panel" aria-labelledby="ask-reply-heading">
              <div className="ask-panel-head">
                <h3 id="ask-reply-heading">追问回复</h3>
                {askReply && !generating ? (
                  <button
                    type="button"
                    className="btn btn-ghost ask-clear"
                    onClick={() => setAskReply('')}
                  >
                    清除回复
                  </button>
                ) : null}
              </div>
              <pre className="ask-reply-text">
                {askReply || (streamMode === 'ask' ? '正在生成回复…' : '')}
              </pre>
            </section>
          ) : null}
        </div>

        <div className="composer-bar">
          <div className="composer-row">
            <label className="followup-field">
              <span className="field-label">追问</span>
              <input
                type="text"
                maxLength={MAX_INPUT_CHARS}
                placeholder="解读人物、主题、伏笔；不改写正文"
                value={askInput}
                disabled={!output.trim() || generating}
                onChange={(e) => setAskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && canAsk) {
                    e.preventDefault()
                    void handleAsk()
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!canAsk}
              onClick={() => void handleAsk()}
            >
              追问
            </button>
          </div>

          <div className="composer-row">
            <label className="followup-field">
              <span className="field-label">修改</span>
              <input
                type="text"
                maxLength={MAX_INPUT_CHARS}
                placeholder="改写、续写、润色；将更新上方正文"
                value={reviseInput}
                disabled={!output.trim() || generating}
                onChange={(e) => setReviseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && canRevise) {
                    e.preventDefault()
                    void handleRevise()
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canRevise}
              onClick={() => void handleRevise()}
            >
              修改
            </button>
          </div>
        </div>
      </section>

      <aside className="write-sidebar" aria-labelledby="story-heading">
        <div className="pane-toolbar">
          <div className="pane-toolbar-text">
            <h2 id="story-heading">写作要求</h2>
            <p>均为可选</p>
          </div>
        </div>

        {!apiReady ? (
          <div className="banner banner-hint" role="status">
            {!isValidApiBaseUrl(config.baseUrl)
              ? 'API URI 无效，请填写 http(s) 地址。'
              : '尚未配置 API。'}
            <button type="button" className="text-link" onClick={onNavigateSettings}>
              前往设置
            </button>
            <a className="text-link" href="/guides/api-key.html" target="_blank" rel="noopener">
              查看 Key 教程
            </a>
          </div>
        ) : null}

        <div className="sidebar-fields">
          <label className="field field-grow">
            <span className="field-label">写作要求</span>
            <textarea
              maxLength={MAX_INPUT_CHARS}
              placeholder="题材、情节方向、文风、禁忌等"
              value={config.requirements}
              onChange={(e) => update({ requirements: e.target.value })}
            />
          </label>

          <label className="field field-grow">
            <span className="field-label">世界观</span>
            <textarea
              maxLength={MAX_INPUT_CHARS}
              placeholder="时代背景、力量体系、地理与势力等"
              value={config.worldview}
              onChange={(e) => update({ worldview: e.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">小说长度</span>
            <select value={config.lengthId} onChange={(e) => update({ lengthId: e.target.value })}>
              {LENGTH_OPTIONS.map((opt) => (
                <option key={opt.id || 'none'} value={opt.id}>
                  {opt.id ? `${opt.label} · ${opt.hint}` : opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-row">
            <span className="toggle-copy">
              <span className="field-label">思考</span>
              <span className="toggle-hint">开启模型思维链（视服务商支持情况）</span>
            </span>
            <input
              type="checkbox"
              className="toggle-input"
              checked={config.enableThinking}
              onChange={(e) => update({ enableThinking: e.target.checked })}
            />
          </label>
        </div>

        <div className="sidebar-actions">
          {generating ? (
            <button type="button" className="btn btn-secondary btn-block" onClick={handleStop}>
              停止生成
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={!canGenerate}
              onClick={() => void handleGenerate()}
            >
              开始写作
            </button>
          )}
          <p className="sidebar-credit">{CURSOR_CREDIT}</p>
        </div>
      </aside>
    </div>
  )
}
