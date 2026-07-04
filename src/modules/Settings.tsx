import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, ConfirmButton } from '../components/ui'

export function Settings() {
  const { production, data, exportJSON, importJSON, deleteProduction, loadSampleProduction } =
    useStore()
  const [msg, setMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const download = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stage-manager-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
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

      <div className="card">
        <div className="card-title">Demo</div>
        <p className="small muted">
          Load a fully-populated sample show — cast &amp; crew, schedule, scenes, props, line notes, and a
          filed report — so the app looks alive when you show it to someone. It's added as a separate
          production; delete it anytime in the Danger zone below.
        </p>
        <button
          className="btn"
          onClick={() => {
            loadSampleProduction()
            setMsg('Sample production loaded — see the Production Hub.')
          }}
        >
          ✨ Load sample production
        </button>
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
        <div className="card-title">Storage</div>
        <div className="row-between small" style={{ padding: '4px 0' }}>
          <span className="faint">Productions</span>
          <span>{data.productions.length}</span>
        </div>
        <div className="row-between small" style={{ padding: '4px 0' }}>
          <span className="faint">Current production</span>
          <span>{production?.title ?? '—'}</span>
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
    </>
  )
}
