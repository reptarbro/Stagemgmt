import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Welcome } from '../modules/Welcome'
import { Hub } from '../modules/Hub'
import { People } from '../modules/People'
import { Schedule } from '../modules/Schedule'
import { Reports } from '../modules/Reports'
import { Settings } from '../modules/Settings'

const NAV = [
  { to: '/hub', icon: '🎭', label: 'Production Hub' },
  { to: '/people', icon: '👥', label: 'People' },
  { to: '/schedule', icon: '🗓️', label: 'Schedule' },
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
            <Routes>
              <Route path="/" element={<Navigate to="/hub" replace />} />
              <Route path="/hub" element={<Hub />} />
              <Route path="/people" element={<People />} />
              <Route path="/schedule" element={<Schedule />} />
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
