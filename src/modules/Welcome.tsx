import { useState } from 'react'
import { useStore } from '../lib/store'

export function Welcome() {
  const { createProduction, loadSampleProduction } = useStore()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [venue, setVenue] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    createProduction({ title: title.trim(), company: company.trim(), venue: venue.trim() })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        <div style={{ fontSize: '3.4rem', filter: 'drop-shadow(0 0 14px rgba(224,182,77,.4))' }}>
          🎭
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: 4 }}>Stage Manager</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Your prompt book, contact sheet, calling script, and report desk — in one place.
        </p>

        <form onSubmit={submit} className="card" style={{ textAlign: 'left', marginTop: 22 }}>
          <div className="card-title">Start a new production</div>
          <label className="field">
            <span className="field-label">Show title *</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. A Midsummer Night's Dream"
            />
          </label>
          <div className="form-row">
            <label className="field">
              <span className="field-label">Company</span>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Theatre / troupe"
              />
            </label>
            <label className="field">
              <span className="field-label">Venue</span>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Main Stage"
              />
            </label>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={!title.trim()}>
            Create production →
          </button>
          <div className="row" style={{ gap: 10, alignItems: 'center', margin: '14px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span className="hint">or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <button
            type="button"
            className="btn"
            style={{ width: '100%' }}
            onClick={() => loadSampleProduction()}
          >
            ✨ Explore a sample production
          </button>
          <p className="hint" style={{ textAlign: 'center', marginBottom: 0 }}>
            Everything is stored privately in this browser. You can export a backup anytime.
          </p>
        </form>
      </div>
    </div>
  )
}
