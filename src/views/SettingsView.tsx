import {
  CURSOR_CREDIT,
  getProviderModels,
  LENGTH_OPTIONS,
  PROVIDER_PRESETS,
} from '../config/providers'
import { useAuth } from '../auth/AuthProvider'
import { DEFAULT_SYSTEM_PROMPT, type AppConfig } from '../hooks/useLocalConfig'
import { isValidApiBaseUrl, MAX_PROMPT_CHARS } from '../lib/validate'

type SettingsViewProps = {
  config: AppConfig
  update: (patch: Partial<AppConfig>) => void
  applyProvider: (providerId: string) => void
  resetSystemPrompt: () => void
  clearApiKey: () => void
  onClearAllLocalData: () => void
  storageWarning?: string | null
}

export function SettingsView({
  config,
  update,
  applyProvider,
  resetSystemPrompt,
  clearApiKey,
  onClearAllLocalData,
  storageWarning = null,
}: SettingsViewProps) {
  const auth = useAuth()
  const models = getProviderModels(config.providerId)
  const usingCustomPrompt = Boolean(config.systemPrompt.trim())
  const promptEditorValue = usingCustomPrompt ? config.systemPrompt : DEFAULT_SYSTEM_PROMPT
  const urlInvalid = Boolean(config.baseUrl.trim()) && !isValidApiBaseUrl(config.baseUrl)

  return (
    <div className="page settings-page">
      <header className="page-header">
        <h1>设置</h1>
        <p>配置 OpenAI 兼容 API。密钥与数据仅保存在本机浏览器，不会上传到本应用服务器。</p>
      </header>

      {storageWarning ? (
        <div className="banner banner-hint" role="status">
          {storageWarning}
        </div>
      ) : null}

      <section className="page-card" aria-labelledby="api-heading">
        <h2 id="api-heading">模型连接</h2>

        <div className="field-stack">
          <label className="field">
            <span className="field-label">服务商预设</span>
            <select value={config.providerId} onChange={(e) => applyProvider(e.target.value)}>
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field-label">API URI</span>
            <input
              type="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.example.com/v1"
              value={config.baseUrl}
              aria-invalid={urlInvalid}
              onChange={(e) => update({ baseUrl: e.target.value, providerId: 'custom' })}
            />
            {urlInvalid ? (
              <span className="field-error">请使用以 http:// 或 https:// 开头的完整 URL。</span>
            ) : null}
          </label>

          <label className="field">
            <span className="field-label">API Key</span>
            <div className="field-row">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="sk-…"
                value={config.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!config.apiKey}
                onClick={clearApiKey}
              >
                清除密钥
              </button>
            </div>
          </label>

          {models.length > 0 ? (
            <label className="field">
              <span className="field-label">模型列表</span>
              <select
                value={models.some((m) => m.id === config.model) ? config.model : ''}
                onChange={(e) => {
                  if (e.target.value) update({ model: e.target.value })
                }}
              >
                <option value="" disabled>
                  选择预设模型…
                </option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}（{m.id}）
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span className="field-label">模型名称</span>
            <input
              type="text"
              autoComplete="off"
              spellCheck={false}
              list={models.length ? 'provider-model-list' : undefined}
              placeholder="例如 gpt-4.1-mini"
              value={config.model}
              onChange={(e) => update({ model: e.target.value })}
            />
            {models.length > 0 ? (
              <datalist id="provider-model-list">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </datalist>
            ) : null}
          </label>

          <label className="toggle-row settings-toggle">
            <span className="toggle-copy">
              <span className="field-label">思考</span>
              <span className="toggle-hint">默认开启/关闭思维链（写作页可同步开关）</span>
            </span>
            <input
              type="checkbox"
              className="toggle-input"
              checked={config.enableThinking}
              onChange={(e) => update({ enableThinking: e.target.checked })}
            />
          </label>
        </div>
      </section>

      <section className="page-card" aria-labelledby="defaults-heading">
        <h2 id="defaults-heading">写作默认</h2>
        <p className="page-card-note">默认长度会带到写作页；仍可在写作页临时修改。</p>
        <label className="field">
          <span className="field-label">默认小说长度</span>
          <select value={config.lengthId} onChange={(e) => update({ lengthId: e.target.value })}>
            {LENGTH_OPTIONS.map((opt) => (
              <option key={opt.id || 'none'} value={opt.id}>
                {opt.id ? `${opt.label} · ${opt.hint}` : opt.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="page-card" aria-labelledby="advanced-heading">
        <div className="page-card-head-row">
          <div>
            <h2 id="advanced-heading">高级设置</h2>
            <p className="page-card-note">
              编辑系统提示词（用于「开始写作」与「修改」）。「追问」使用独立顾问提示词，不受此处影响。
              {usingCustomPrompt ? ' 当前为自定义提示词。' : ' 当前为默认提示词。'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (window.confirm('恢复为内置默认系统提示词？')) resetSystemPrompt()
            }}
          >
            恢复默认
          </button>
        </div>

        <label className="field">
          <span className="field-label">系统提示词</span>
          <textarea
            className="prompt-editor"
            rows={16}
            maxLength={MAX_PROMPT_CHARS}
            spellCheck={false}
            value={promptEditorValue}
            onChange={(e) => update({ systemPrompt: e.target.value })}
          />
        </label>
      </section>

      <section className="page-card" aria-labelledby="account-heading">
        <h2 id="account-heading">账号</h2>
        <p className="page-card-note">
          已预留 Supabase Auth（见 <code>src/auth</code>、<code>src/lib/supabase</code>）。
          当前默认关闭：设置环境变量 <code>VITE_AUTH_ENABLED=true</code> 并配置
          <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code> 后即可启用。
        </p>
        <p className="page-card-note">
          状态：{auth.enabled ? (auth.user ? `已登录 ${auth.user.email ?? auth.user.id}` : '已启用（未登录）') : '未启用'}
        </p>
      </section>

      <section className="page-card" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">隐私与数据</h2>
        <p className="page-card-note">
          API Key、设置与历史保存在本机 localStorage。请求直接发往你填写的 API
          地址，本静态站点不代收密钥。共享电脑请用后清除。
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (
                window.confirm(
                  '将清除本机保存的设置、API Key、自定义提示词与全部历史记录。此操作不可撤销。',
                )
              ) {
                onClearAllLocalData()
              }
            }}
          >
            清除本机全部数据
          </button>
        </div>
      </section>

      <p className="page-footnote">
        浏览器直连若遇 CORS，请使用允许跨域的兼容网关。{CURSOR_CREDIT}。
      </p>
    </div>
  )
}
