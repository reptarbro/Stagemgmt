import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHead, ConfirmButton } from '../components/ui'
import { markBackedUp } from '../lib/storage'
import { slug } from '../lib/exporters'
import { buildBundleString, applyBackupText } from '../lib/backup'
import { CloudSync } from '../components/CloudSync'
import { CLOUD_ENABLED } from '../lib/cloud/config'

export function Settings() {
  const {
    production,
    data,
    exportJSON,
    importJSON,
    deleteProduction,
    loadSampleProduction,
    setActiveProduction,
  } = useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sample = data.productions.find((p) => p.isSample)
  const realProductions = data.productions.filter((p) => !p.isSample)
  const totalPeople = data.productions.reduce((n, p) => n + p.people.length, 0)
  const totalEvents = data.productions.reduce((n, p) => n + p.events.length, 0)

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
          await nav.share!({ files: [file], title: 'Standby backup' } as ShareData)
          setMsg('Backup shared — open it on the other device and Import.')
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
      setMsg(`Full backup downloaded (${kb} KB — includes your script & photos).`)
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
      else if (res.bundle) setMsg(`Restored everything — ${res.files} file(s) included.`)
      else setMsg('Restored (data only — this file had no bundled script/photos).')
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

      {/* Storage overview — across every production. */}
      <div className="card">
        <div className="card-title">Storage</div>
        <div className="grid grid-4">
          <Stat value={realProductions.length} label="Productions" />
          <Stat value={totalPeople} label="People (all shows)" />
          <Stat value={totalEvents} label="Events (all shows)" />
          <Stat value={production?.title ?? '—'} label="Current" small />
        </div>
      </div>

      <div className="card">
        <div className="card-title">Demo</div>
        <p className="small muted">
          Preview a fully-populated sample show — cast &amp; crew, schedule, scenes, props, line notes,
          cues, and a filed report — to see how everything fits together. It's clearly marked as a sample
          and you can remove it in one tap; your real shows aren't affected.
        </p>
        {sample ? (
          <div className="row wrap" style={{ gap: 10 }}>
            <button
              className="btn"
              onClick={() => {
                setActiveProduction(sample.id)
                setMsg('Viewing the sample — see the Production Hub.')
              }}
            >
              View sample
            </button>
            <ConfirmButton
              className="btn btn-danger"
              onConfirm={() => {
                deleteProduction(sample.id)
                setMsg('Sample removed.')
              }}
            >
              Remove sample
            </ConfirmButton>
          </div>
        ) : (
          <button
            className="btn"
            onClick={() => {
              loadSampleProduction()
              setMsg('Sample loaded — see the Production Hub.')
            }}
          >
            ✨ Preview a sample show
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-title">Backup &amp; move to another device</div>
        <p className="small muted">
          Your data lives only in this browser. Export a <strong>complete backup</strong> — every
          production plus your uploaded script and sign-in photos, all in one file — then import it on
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
          Import <strong>replaces</strong> everything currently in this browser — so export here first if
          this device has changes you want to keep.
        </p>
      </div>

      {CLOUD_ENABLED && <CloudSync />}

      <div className="card">
        <div className="card-title">Help &amp; feedback</div>
        <p className="small muted">
          Testing the app? Send a quick note — what worked, what didn't, and what you wish it did.
          Opens your mail app with a short template.
        </p>
        <button
          className="btn"
          onClick={() => {
            const subject = 'Standby — feedback'
            const body =
              'What I was doing:\n\nWhat happened / what I wish it did:\n\nDevice & browser:\n'
            window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
          }}
        >
          ✉ Send feedback
        </button>
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
