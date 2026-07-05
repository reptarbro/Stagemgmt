import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, ConfirmButton } from '../components/ui'
import { markBackedUp } from '../lib/storage'

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
  const fileRef = useRef<HTMLInputElement>(null)

  const sample = data.productions.find((p) => p.isSample)
  const realProductions = data.productions.filter((p) => !p.isSample)
  const totalPeople = data.productions.reduce((n, p) => n + p.people.length, 0)
  const totalEvents = data.productions.reduce((n, p) => n + p.events.length, 0)

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stage-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    markBackedUp()
    setMsg('Backup downloaded.')
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const res = importJSON(String(reader.result))
      setMsg(res.ok ? 'Backup restored.' : `Import failed: ${res.error}`)
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
              👁 View sample
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
        <div className="card-title">Backup & restore</div>
        <p className="small muted">
          Your data lives only in this browser. Export a backup to keep it safe or move it to another
          device, then import it there.
        </p>
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-primary" onClick={download}>
            ⬇ Export backup (.json)
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
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
      </div>

      <div className="card">
        <div className="card-title">Help &amp; feedback</div>
        <p className="small muted">
          Testing the app? Send a quick note — what worked, what didn't, and what you wish it did.
          Opens your mail app with a short template.
        </p>
        <button
          className="btn"
          onClick={() => {
            const subject = 'Stage Manager — feedback'
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
