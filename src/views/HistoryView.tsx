import type { HistoryEntry } from '../hooks/useHistory'
import { LENGTH_OPTIONS } from '../config/providers'

type HistoryViewProps = {
  entries: HistoryEntry[]
  onOpen: (entry: HistoryEntry) => void
  onDelete: (id: string) => void
  onClear: () => void
}

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

function lengthLabel(id: string): string {
  const opt = LENGTH_OPTIONS.find((o) => o.id === id)
  return opt?.label ?? '未指定'
}

export function HistoryView({ entries, onOpen, onDelete, onClear }: HistoryViewProps) {
  return (
    <div className="page history-page">
      <header className="page-header page-header-row">
        <div>
          <h1>历史记录</h1>
          <p>保存在本机 localStorage，最多保留 80 条。</p>
        </div>
        {entries.length > 0 ? (
          <button type="button" className="btn btn-secondary" onClick={onClear}>
            清空全部
          </button>
        ) : null}
      </header>

      {entries.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">暂无历史</p>
          <p className="empty-desc">完成一次写作后，正文会自动出现在这里。</p>
        </div>
      ) : (
        <ul className="history-list">
          {entries.map((entry) => (
            <li key={entry.id} className="history-item">
              <button type="button" className="history-main" onClick={() => onOpen(entry)}>
                <span className="history-title">{entry.title}</span>
                <span className="history-meta">
                  {formatTime(entry.createdAt)} · {entry.model || '未知模型'} ·{' '}
                  {lengthLabel(entry.lengthId)}
                </span>
                <span className="history-preview">
                  {entry.content.trim().slice(0, 120) || '（空正文）'}
                  {entry.content.trim().length > 120 ? '…' : ''}
                </span>
              </button>
              <button
                type="button"
                className="btn btn-ghost history-delete"
                aria-label={`删除 ${entry.title}`}
                onClick={() => {
                  if (window.confirm(`删除「${entry.title}」？`)) onDelete(entry.id)
                }}
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
