import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PRODUCTION_KINDS, KIND_PROFILES, moduleVisible, moduleLabel } from '../lib/productionKind'
import type { ProductionKind } from '../lib/types'
import { PageHead, ConfirmButton } from '../components/ui'
import { markBackedUp } from '../lib/storage'
import { slug } from '../lib/exporters'
import { buildBundleString, applyBackupText } from '../lib/backup'
import { CloudSync } from '../components/CloudSync'
import { FeedbackForm } from '../components/FeedbackForm'
import { ShareModal } from '../components/ShareModal'
import { CLOUD_ENABLED } from '../lib/cloud/config'

export function Settings() {
  const {
    production,
    data,
    exportJSON,
    importJSON,
    updateProduction,
    deleteProduction,
    loadSampleProduction,
    setActiveProduction,
  } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const samples = data.productions.filter((p) => p.isSample)
  const realProductions = data.productions.filter((p) => !p.isSample)
  const totalPeople = data.productions.reduce((n, p) => n + p.people.length, 0)
  const totalEvents = data.productions.reduce((n, p) => n + p.events.length, 0)

  // Optional modules a user can show/hide per show. Core modules (Hub, People,
  // Schedule, Reports, Settings) are always available and not listed here.
  const moduleToggles = [
    { to: '/scenes', label: moduleLabel(production?.kind, '/scenes') },
    { to: '/props', label: moduleLabel(production?.kind, '/props') },
    { to: '/line-notes', label: moduleLabel(production?.kind, '/line-notes') },
    { to: '/script', label: moduleLabel(production?.kind, '/script') },
    { to: '/assets', label: moduleLabel(production?.kind, '/assets') },
    { to: '/cues', label: moduleLabel(production?.kind, '/cues') },
  ]

  // A COMPLETE, portable backup: the data model + every binary (uploaded script
  // PDF, sign-in photos) base64-packed into one file, so it fully rehydrates on
  // another device. Prefers the native share sheet (AirDrop/Messages/Files).
  const exportAll = async () => {
    if (busy) return
    setBusy(true)
    try {
      const json = await buildBundleString(exportJSON())
      const name = `standby-${slug(production?.title ?? 'backup')}-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      const blob = new Blob([json], { type: 'application/json' })
      const file = new File([blob], name, { type: 'application/json' })
      markBackedUp()

      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share!({ files: [file], title: 'StandBy backup' } as ShareData)
          setMsg('Backup shared - open it on the other device and Import.')
          return
        } catch (err) {
          if ((err as Error).name === 'AbortError') {
            setMsg(null)
            return
          }
          // otherwise fall through to a normal download
        }
      }
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
      const kb = Math.round(blob.size / 1024)
      setMsg(`Full backup downloaded (${kb} KB - includes your script & photos).`)
    } catch (e) {
      setMsg(`Export failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const res = await applyBackupText(String(reader.result), importJSON)
      if (!res.ok) setMsg(`Import failed: ${res.error}`)
      else if (res.bundle) setMsg(`Restored everything - ${res.files} file(s) included.`)
      else setMsg('Restored (data only - this file had no bundled script/photos).')
      setBusy(false)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <>
      <PageHead title="Settings" subtitle="Backup, restore & data" />

      {msg && (
        <div className="card" style={{ borderColor: 'rgba(95,184,122,.4)', padding: '12px 16px' }}>
          <span className="small" style={{ color: 'var(--success)' }}>{msg}</span>
        </div>
      )}

      {/* Storage overview - across every production. */}
      <div className="card">
        <div className="card-title">Storage</div>
        <div className="grid grid-4">
          <Stat value={realProductions.length} label="Productions" />
          <Stat value={totalPeople} label="People (all shows)" />
          <Stat value={totalEvents} label="Events (all shows)" />
          <Stat value={production?.title ?? '-'} label="Current" small />
        </div>
      </div>

      {/* Per-show type & module visibility. */}
      {production && (
        <div className="card">
          <div className="card-title">Show type &amp; modules</div>
          <p className="small muted">
            The type sets the vocabulary and which modules appear for{' '}
            <strong>{production.title}</strong>. Adjust its type, or turn individual modules on and
            off for this show.
          </p>
          <label className="field" style={{ maxWidth: 340 }}>
            <span className="field-label">Type of show</span>
            <select
              value={production.kind ?? 'play'}
              onChange={(e) => updateProduction(production.id, { kind: e.target.value as ProductionKind })}
            >
              {PRODUCTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {KIND_PROFILES[k].label}
                </option>
              ))}
            </select>
            <span className="hint" style={{ marginTop: 4 }}>{KIND_PROFILES[production.kind ?? 'play'].blurb}</span>
          </label>
          <div className="field-label" style={{ marginTop: 14 }}>Modules shown for this show</div>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 6 }}
          >
            {moduleToggles.map((m) => (
              <label key={m.to} className="row" style={{ gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={moduleVisible(production, m.to)}
                  onChange={(e) =>
                    updateProduction(production.id, {
                      modules: { ...production.modules, [m.to]: e.target.checked },
                    })
                  }
                />
                <span className="small">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {production && CLOUD_ENABLED && (
        <div className="card">
          <div className="card-title">Share &amp; team access</div>
          <p className="small muted">
            <strong>Co-run with your team:</strong> invite co-SMs, ASMs, and directors to edit this
            same show live - each signs in once and every change syncs automatically.
            <br />
            <strong>Or share view-only:</strong> a read-only link anyone can open with no login
            (line notes, reports, and private contact details are never shared).
          </p>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={() => setShowShare(true)}>👥 Share / invite team</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Demo</div>
        <p className="small muted">
          Preview a fully-populated sample show - cast &amp; crew, schedule, scenes, props, line notes,
          cues, and a filed report - to see how everything fits together. It's clearly marked as a sample
          and you can remove it in one tap; your real shows aren't affected.
        </p>
        <div className="row wrap" style={{ gap: 10 }}>
          {(['play', 'cabaret'] as const).map((k) => {
            const s = samples.find((x) => (x.kind ?? 'play') === k)
            return s ? (
              <button
                key={k}
                className="btn"
                onClick={() => {
                  setActiveProduction(s.id)
                  setMsg(`Viewing the ${KIND_PROFILES[k].label} sample - see the Production Hub.`)
                }}
              >
                View {KIND_PROFILES[k].label} sample
              </button>
            ) : (
              <button
                key={k}
                className="btn"
                onClick={() => {
                  loadSampleProduction(k)
                  setMsg(`${KIND_PROFILES[k].label} sample loaded - see the Production Hub.`)
                }}
              >
                {k === 'cabaret' ? '🎵' : '✨'} {KIND_PROFILES[k].label} sample
              </button>
            )
          })}
          {samples.length > 0 && (
            <ConfirmButton
              className="btn btn-danger"
              onConfirm={() => {
                samples.forEach((s) => deleteProduction(s.id))
                setMsg('Sample(s) removed.')
              }}
            >
              Remove sample{samples.length > 1 ? 's' : ''}
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Backup &amp; move to another device</div>
        <p className="small muted">
          Your data lives only in this browser. Export a <strong>complete backup</strong> - every
          production plus your uploaded script and sign-in photos, all in one file - then import it on
          another device (iPad → desktop → phone). On phones/tablets, Export opens the share sheet so you
          can AirDrop or message it straight over.
        </p>
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={exportAll} disabled={busy}>
            {busy ? '… working' : '⤴ Export / Share (full backup)'}
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()} disabled={busy}>
            ⬆ Import backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            style={{ display: 'none' }}
          />
        </div>
        <p className="hint" style={{ marginTop: 10 }}>
          Import <strong>replaces</strong> everything currently in this browser - so export here first if
          this device has changes you want to keep.
        </p>
      </div>

      {CLOUD_ENABLED && <CloudSync />}

      <div className="card">
        <div className="card-title">Help &amp; feedback</div>
        <p className="small muted">
          Using the app on a show? Send a quick note - what worked, what didn't, and what you wish it
          did. It goes straight to us in the app; no email needed.
        </p>
        <div className="row wrap" style={{ gap: 10 }}>
          {CLOUD_ENABLED && (
            <button className="btn btn-primary" onClick={() => setShowFeedback(true)}>
              ✉ Send feedback
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const subject = 'StandBy - feedback'
              const body =
                'What I was doing:\n\nWhat happened / what I wish it did:\n\nDevice & browser:\n'
              window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
            }}
          >
            {CLOUD_ENABLED ? 'or email instead' : '✉ Send feedback by email'}
          </button>
        </div>
      </div>

      {production && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.35)' }}>
          <div className="card-title" style={{ color: 'var(--danger)' }}>
            Danger zone
          </div>
          <p className="small muted">
            Permanently delete <strong>{production.title}</strong> and all its people, schedule, and
            reports. Export a backup first if you might need it.
          </p>
          <ConfirmButton
            className="btn btn-danger"
            onConfirm={() => {
              deleteProduction(production.id)
              setMsg('Production deleted.')
            }}
          >
            Delete this production
          </ConfirmButton>
        </div>
      )}

      <p className="hint" style={{ textAlign: 'center', marginTop: 4 }}>
        <Link to="/privacy">Privacy Policy</Link>
        <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
        <Link to="/terms">Terms of Service</Link>
      </p>

      {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}
      {showShare && <ShareModal onClose={() => setShowShare(false)} />}
    </>
  )
}

function Stat({ value, label, small }: { value: React.ReactNode; label: string; small?: boolean }) {
  return (
    <div className="stat">
      <div className="stat-value" style={small ? { fontSize: '1.1rem' } : undefined}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
