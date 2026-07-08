import { useState } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { getLastBackup, markBackedUp } from '../lib/storage'
import { daysToOpening, cueToCueActive, CUE_WINDOW_DAYS } from '../lib/dates'
import { ScrollToTop } from './ui'
import { CloudAutoSync } from './CloudAutoSync'
import { StandbyMark, APP_NAME, APP_TAGLINE } from './Brand'
import { NavIcon, type IconName } from './icons'
import { Welcome } from '../modules/Welcome'
import { Hub } from '../modules/Hub'
import { People } from '../modules/People'
import { Schedule } from '../modules/Schedule'
import { Scenes } from '../modules/Scenes'
import { Props } from '../modules/Props'
import { LineNotes } from '../modules/LineNotes'
import { Script } from '../modules/Script'
import { CueToCue } from '../modules/CueToCue'
import { Reports } from '../modules/Reports'
import { Settings } from '../modules/Settings'

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: '/hub', icon: 'hub', label: 'Production Hub' },
  { to: '/people', icon: 'people', label: 'People' },
  { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/scenes', icon: 'scenes', label: 'Scenes' },
  { to: '/props', icon: 'props', label: 'Props & Costumes' },
  { to: '/line-notes', icon: 'notes', label: 'Line Notes' },
  { to: '/script', icon: 'script', label: 'Script' },
  { to: '/reports', icon: 'reports', label: 'Reports' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

export function App() {
  return (
    <>
      <ScrollToTop />
      <CloudAutoSync />
      <Routes>
        {/* Home / landing — every fresh entry starts here. */}
        <Route path="/" element={<Welcome />} />
        {/* App pages share the sidebar shell. */}
        <Route element={<Shell />}>
          <Route path="/hub" element={<Hub />} />
          <Route path="/people" element={<People />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/scenes" element={<Scenes />} />
          <Route path="/props" element={<Props />} />
          <Route path="/line-notes" element={<LineNotes />} />
          <Route path="/script" element={<Script />} />
          <Route path="/cues" element={<CueToCue />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

/** Sidebar + top bar layout for the in-production pages. */
function Shell() {
  const { production, data, setActiveProduction } = useStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [switcher, setSwitcher] = useState(false)

  // No active production (e.g. deep link or after deletion) → back to home.
  if (!production) return <Navigate to="/" replace />

  const close = () => setMenuOpen(false)

  // Cue-to-cue surfaces as tech nears; show a countdown hint until then.
  const dOpen = daysToOpening(production)
  const cueActive = cueToCueActive(production)
  const cueHint = dOpen === null || cueActive ? undefined : `in ${dOpen - CUE_WINDOW_DAYS}d`

  const nav: { to: string; icon: IconName; label: string; hint?: string }[] = [
    ...NAV.slice(0, 7), // Hub … Script
    { to: '/cues', icon: 'cues', label: 'Cue-to-Cue', hint: cueHint },
    ...NAV.slice(7), // Reports, Settings
  ]

  return (
    <div className="app">
      <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={close} />
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" className="brand" onClick={close} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="brand-mark" style={{ display: 'flex' }}>
            <StandbyMark size={30} />
          </span>
          <div>
            <div className="brand-name" style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {APP_NAME}
            </div>
            <div className="brand-sub">{APP_TAGLINE}</div>
          </div>
        </NavLink>

        {data.productions.length > 1 && (
          <div className="prod-switch">
            <div className="field-label" style={{ marginBottom: 0 }}>
              Production
            </div>
            <select
              value={production.id}
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
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon"><NavIcon name={n.icon} /></span>
              <span style={{ flex: 1 }}>{n.label}</span>
              {n.hint && <span className="nav-hint">{n.hint}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="prod-switcher">
          {switcher && (
            <div className="switch-menu">
              <div className="switch-label">Switch to</div>
              {data.productions.map((p) => (
                <button
                  key={p.id}
                  className={`switch-item ${p.id === production.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveProduction(p.id)
                    setSwitcher(false)
                    close()
                    navigate('/hub')
                  }}
                >
                  {p.title}
                  {p.isSample ? ' · sample' : ''}
                </button>
              ))}
              <div className="divider" style={{ margin: '6px 0' }} />
              <button
                className="switch-item"
                onClick={() => {
                  setSwitcher(false)
                  close()
                  navigate('/')
                }}
              >
                + Start new production
              </button>
            </div>
          )}
          <button
            className="btn btn-primary"
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={() => setSwitcher((o) => !o)}
          >
            + New / Switch Production
          </button>
        </div>
        <div className="hint" style={{ padding: '0 10px' }}>
          Saved automatically in this browser.
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="topbar">
          <button className="icon-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <strong>{production.title}</strong>
          <span style={{ width: 24 }} />
        </div>

        <main className="main">
          <div className="main-inner">
            <BackupBanner />
            <Outlet />
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
    a.download = `standby-backup-${new Date().toISOString().slice(0, 10)}.json`
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
