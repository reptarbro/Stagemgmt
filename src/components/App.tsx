import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from '../lib/store'
import { getLastBackup, markBackedUp } from '../lib/storage'
import { Welcome } from '../modules/Welcome'
import { Hub } from '../modules/Hub'
import { People } from '../modules/People'
import { Schedule } from '../modules/Schedule'
import { Scenes } from '../modules/Scenes'
import { Props } from '../modules/Props'
import { LineNotes } from '../modules/LineNotes'
import { Script } from '../modules/Script'
import { Reports } from '../modules/Reports'
import { Settings } from '../modules/Settings'

const NAV = [
  { to: '/hub', icon: '🎭', label: 'Production Hub' },
  { to: '/people', icon: '👥', label: 'People' },
  { to: '/schedule', icon: '🗓️', label: 'Schedule' },
  { to: '/scenes', icon: '🎬', label: 'Scenes' },
  { to: '/props', icon: '🎩', label: 'Props & Costumes' },
  { to: '/line-notes', icon: '📝', label: 'Line Notes' },
  { to: '/script', icon: '📄', label: 'Script' },
  { to: '/reports', icon: '📋', label: 'Reports' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
]

export function App() {
  const { production, data, setActiveProduction } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)

  // No productions at all → onboarding.
  if (data.productions.length === 0) {
    return <Welcome />
  }

  const close = () => setMenuOpen(false)

  return (
    <div className="app">
      <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={close} />
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">🎭</span>
          <div>
            <div className="brand-name">Stage Manager</div>
            <div className="brand-sub">Prompt Book</div>
          </div>
        </div>

        {data.productions.length > 1 && (
          <div className="prod-switch">
            <div className="field-label" style={{ marginBottom: 0 }}>
              Production
            </div>
            <select
              value={production?.id ?? ''}
              onChange={(e) => setActiveProduction(e.target.value)}
            >
              {data.productions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav onClick={close}>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="hint" style={{ padding: '0 10px' }}>
          Saved automatically in this browser.
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <button className="icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <strong>{production?.title ?? 'Stage Manager'}</strong>
          <span style={{ width: 24 }} />
        </div>

        <main className="main">
          <div className="main-inner">
            <BackupBanner />
            <Routes>
              <Route path="/" element={<Navigate to="/hub" replace />} />
              <Route path="/hub" element={<Hub />} />
              <Route path="/people" element={<People />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/scenes" element={<Scenes />} />
              <Route path="/props" element={<Props />} />
              <Route path="/line-notes" element={<LineNotes />} />
              <Route path="/script" element={<Script />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/hub" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Gentle reminder to export a backup when data exists and it's overdue. */
function BackupBanner() {
  const { data, exportJSON } = useStore()
  const [dismissed, setDismissed] = useState(false)

  const hasData = data.productions.some(
    (p) =>
      p.people.length ||
      p.events.length ||
      p.reports.length ||
      p.scenes.length ||
      p.props.length ||
      p.lineNotes.length,
  )
  const last = getLastBackup()
  const overdue = hasData && (last === 0 || Date.now() - last > WEEK_MS)
  if (!overdue || dismissed) return null

  const doExport = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stage-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markBackedUp()
    setDismissed(true)
  }

  return (
    <div className="backup-banner no-print">
      <span>
        💾 Your data lives on this device only.{' '}
        {last === 0 ? 'Back it up' : "It's been a while — back up again"} so you don't lose it.
      </span>
      <span className="row" style={{ gap: 8, flexShrink: 0 }}>
        <button className="btn btn-sm btn-primary" onClick={doExport}>
          Export backup
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => setDismissed(true)}>
          Later
        </button>
      </span>
    </div>
  )
}
