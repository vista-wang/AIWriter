import { useState } from 'react'
import { CURSOR_CREDIT } from './config/providers'
import { useHistory, type HistoryEntry } from './hooks/useHistory'
import { useLocalConfig } from './hooks/useLocalConfig'
import { HistoryView } from './views/HistoryView'
import { SettingsView } from './views/SettingsView'
import { WriteView } from './views/WriteView'
import './App.css'

// Made with Cursor — AIWriter web novel writing framework
type AppView = 'write' | 'history' | 'settings'

const NAV: { id: AppView; label: string }[] = [
  { id: 'write', label: '写作' },
  { id: 'history', label: '历史' },
  { id: 'settings', label: '设置' },
]

export default function App() {
  const {
    config,
    update,
    applyProvider,
    resetSystemPrompt,
    clearApiKey,
    clearAllLocalData,
    storageWarning: configStorageWarning,
  } = useLocalConfig()
  const {
    entries,
    addEntry,
    removeEntry,
    clearHistory,
    storageWarning: historyStorageWarning,
  } = useHistory()
  const [view, setView] = useState<AppView>('write')
  const [output, setOutput] = useState('')

  const storageWarning = historyStorageWarning || configStorageWarning

  function handleSaveHistory(content: string) {
    if (!content.trim()) return
    addEntry({
      content,
      requirements: config.requirements,
      worldview: config.worldview,
      lengthId: config.lengthId,
      model: config.model,
    })
  }

  function handleOpenHistory(entry: HistoryEntry) {
    setOutput(entry.content)
    update({
      requirements: entry.requirements,
      worldview: entry.worldview,
      lengthId: entry.lengthId,
    })
    setView('write')
  }

  function handleClearHistory() {
    if (window.confirm('确定清空全部历史记录？此操作不可撤销。')) {
      clearHistory()
    }
  }

  function handleClearAllLocalData() {
    clearHistory()
    clearAllLocalData()
    setOutput('')
    setView('settings')
  }

  return (
    <div className="shell">
      <header className="toolbar">
        <div className="toolbar-brand">
          <span className="toolbar-mark">AIWriter</span>
          <span className="toolbar-credit">{CURSOR_CREDIT}</span>
        </div>

        <nav className="toolbar-nav" aria-label="主导航">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? 'nav-item-active' : ''}`}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="toolbar-meta" aria-hidden={true}>
          <span className="toolbar-model">{config.model || '未配置模型'}</span>
        </div>
      </header>

      <main className="shell-main">
        {view === 'write' ? (
          <WriteView
            config={config}
            update={update}
            output={output}
            setOutput={setOutput}
            onNavigateSettings={() => setView('settings')}
            onSaveHistory={handleSaveHistory}
            storageWarning={storageWarning}
          />
        ) : null}

        {view === 'history' ? (
          <HistoryView
            entries={entries}
            onOpen={handleOpenHistory}
            onDelete={removeEntry}
            onClear={handleClearHistory}
          />
        ) : null}

        {view === 'settings' ? (
          <SettingsView
            config={config}
            update={update}
            applyProvider={applyProvider}
            resetSystemPrompt={resetSystemPrompt}
            clearApiKey={clearApiKey}
            onClearAllLocalData={handleClearAllLocalData}
            storageWarning={storageWarning}
          />
        ) : null}
      </main>
    </div>
  )
}
