import { lazy, Suspense, useState } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { getLastBackup, markBackedUp } from '../lib/storage'
import { daysToOpening, cueToCueActive, CUE_WINDOW_DAYS } from '../lib/dates'
import { moduleVisible, moduleLabel } from '../lib/productionKind'
import { ScrollToTop } from './ui'
import { CloudAutoSync } from './CloudAutoSync'
import { useSignedIn } from '../lib/cloud/auth'
import { StandbyMark, APP_NAME, APP_TAGLINE } from './Brand'
import { NavIcon, type IconName } from './icons'
import { Welcome } from '../modules/Welcome'
// Route modules are lazy-loaded so the initial bundle is just the shell + the
// landing page; each module (and heavy deps like the PDF/print path) loads on
// first navigation. Welcome stays eager for a fast first paint.
const Hub = lazy(() => import('../modules/Hub').then((m) => ({ default: m.Hub })))
const People = lazy(() => import('../modules/People').then((m) => ({ default: m.People })))
const Schedule = lazy(() => import('../modules/Schedule').then((m) => ({ default: m.Schedule })))
const Scenes = lazy(() => import('../modules/Scenes').then((m) => ({ default: m.Scenes })))
const Props = lazy(() => import('../modules/Props').then((m) => ({ default: m.Props })))
const LineNotes = lazy(() => import('../modules/LineNotes').then((m) => ({ default: m.LineNotes })))
const Script = lazy(() => import('../modules/Script').then((m) => ({ default: m.Script })))
const Assets = lazy(() => import('../modules/Assets').then((m) => ({ default: m.Assets })))
const CueToCue = lazy(() => import('../modules/CueToCue').then((m) => ({ default: m.CueToCue })))
const Reports = lazy(() => import('../modules/Reports').then((m) => ({ default: m.Reports })))
const Settings = lazy(() => import('../modules/Settings').then((m) => ({ default: m.Settings })))
const PrivacyPolicy = lazy(() => import('../modules/Legal').then((m) => ({ default: m.PrivacyPolicy })))
const Terms = lazy(() => import('../modules/Legal').then((m) => ({ default: m.Terms })))
const SharedView = lazy(() => import('../modules/SharedView').then((m) => ({ default: m.SharedView })))

/** Small, unobtrusive fallback while a lazily-loaded page chunk arrives. */
function PageLoading() {
  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }} aria-busy="true">
      Loading…
    </div>
  )
}

const NAV: { to: string; icon: IconName; label: string }[] = [
  { to: '/hub', icon: 'hub', label: 'Production Hub' },
  { to: '/people', icon: 'people', label: 'People' },
  { to: '/schedule', icon: 'schedule', label: 'Schedule' },
  { to: '/scenes', icon: 'scenes', label: 'Scenes' },
  { to: '/props', icon: 'props', label: 'Props & Costumes' },
  { to: '/line-notes', icon: 'notes', label: 'Line Notes' },
  { to: '/script', icon: 'script', label: 'Script' },
  { to: '/assets', icon: 'assets', label: 'Assets' },
  { to: '/reports', icon: 'reports', label: 'Reports' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

/** Gel color for each index tab's spine — a color-coded binder edge. */
const TAB_COLOR: Record<string, string> = {
  '/hub': 'var(--gel-spot)',
  '/people': 'var(--go)',
  '/schedule': 'var(--standby)',
  '/scenes': 'var(--gel-sound)',
  '/props': 'var(--gel-projection)',
  '/line-notes': 'var(--gel-fly)',
  '/script': 'var(--gel-spot)',
  '/assets': 'var(--gel-deck)',
  '/cues': 'var(--gel-light)',
  '/reports': 'var(--info)',
  '/settings': 'var(--text-dim)',
}

export function App() {
  return (
    <>
      <ScrollToTop />
      <CloudAutoSync />
      <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Home / landing — every fresh entry starts here. */}
        <Route path="/" element={<Welcome />} />
        {/* Standalone legal pages — linkable without an active production. */}
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Chromeless, read-only shared view — opened from a share link, no login. */}
        <Route path="/view/:token" element={<SharedView />} />
        {/* App pages share the sidebar shell. */}
        <Route element={<Shell />}>
          <Route path="/hub" element={<Hub />} />
          <Route path="/people" element={<People />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/scenes" element={<Scenes />} />
          <Route path="/props" element={<Props />} />
          <Route path="/line-notes" element={<LineNotes />} />
          <Route path="/script" element={<Script />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/cues" element={<CueToCue />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
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

  // The visible nav — and a couple of labels — depend on the show's kind.
  const kind = production.kind
  const baseNav: { to: string; icon: IconName; label: string; hint?: string }[] = [
    ...NAV.slice(0, 8), // Hub … Assets
    { to: '/cues', icon: 'cues', label: 'Cue-to-Cue', hint: cueHint },
    ...NAV.slice(8), // Reports, Settings
  ]
  const nav = baseNav
    .filter((n) => moduleVisible(production, n.to))
    .map((n) => ({ ...n, label: moduleLabel(kind, n.to) }))

  // Cue-light status for the calling-desk strip: STANDBY (amber) counting down
  // to opening, flipping to GO (green) once tech is live / the show has opened.
  const cue = cueActive
    ? { cls: 'go', txt: 'TECH · GO' }
    : dOpen == null
      ? null
      : dOpen > 0
        ? { cls: 'standby', txt: `T‑${dOpen} · STANDBY` }
        : dOpen === 0
          ? { cls: 'go', txt: 'OPENING · GO' }
          : { cls: 'go', txt: 'OPEN · GO' }

  return (
    <div className="app">
      <div className={`scrim ${menuOpen ? 'open' : ''}`} onClick={close} />
      <aside className={`deck-rail ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" className="brand" onClick={close} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="brand-mark" style={{ display: 'flex' }}>
            <StandbyMark size={30} />
          </span>
          <div>
            <div className="brand-name">{APP_NAME}</div>
            <div className="brand-sub">{APP_TAGLINE}</div>
          </div>
        </NavLink>

        <div className="rail-label">Prompt Book</div>
        <nav className="rail-nav" onClick={close}>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `tab ${isActive ? 'active' : ''}`}
              style={{ ['--tab' as string]: TAB_COLOR[n.to] ?? 'var(--accent-strong)' } as React.CSSProperties}
            >
              <span className="nav-icon"><NavIcon name={n.icon} /></span>
              <span className="tab-label">{n.label}</span>
              {n.hint && <span className="nav-hint">{n.hint}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="rail-spacer" />

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
        <div className="hint" style={{ padding: '0 12px', fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '0.06em' }}>
          Saved on this device.
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div className="deck-head">
          <button className="icon-btn deck-menu" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
            ☰
          </button>
          <div className="deck-title">
            Calling&nbsp;<b>{production.title}</b>
          </div>
          <div className="deck-spacer" />
          {cue && (
            <span className={`cue-pill ${cue.cls}`}>
              <span className="cue-dot" />
              {cue.txt}
            </span>
          )}
        </div>

        <main className="main">
          <div className="main-inner">
            <BackupBanner />
            {/* Nearer boundary than the top-level one, so switching modules shows
                the fallback only in the content area — the rail stays put. */}
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
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
  const signedIn = useSignedIn()
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
  // Signed in, the data also lives in the cloud (and syncs automatically), so
  // the "on this device only — back it up or lose it" nudge is both alarming
  // and inaccurate. Suppress it; a full export is still available in Settings.
  if (!overdue || dismissed || signedIn) return null

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
