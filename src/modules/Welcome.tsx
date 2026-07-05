import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { ReqStar } from '../components/ui'
import { StandbyMark, APP_NAME } from '../components/Brand'

export function Welcome({ inShell = false }: { inShell?: boolean }) {
  const { createProduction, loadSampleProduction } = useStore()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [venue, setVenue] = useState('')

  const canSubmit = title.trim() !== '' && venue.trim() !== ''

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    createProduction({ title: title.trim(), company: company.trim(), venue: venue.trim() })
    navigate('/hub')
  }

  return (
    <div
      style={{
        minHeight: inShell ? 'auto' : '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: inShell ? 0 : 20,
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, textAlign: 'center' }}>
        {!inShell && (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              <StandbyMark size={76} />
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                margin: '0 0 4px',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {APP_NAME}
            </h1>
            <p className="muted" style={{ marginTop: 0 }}>
              Your prompt book, contact sheet, calling script, and report desk — in one place.
            </p>
          </>
        )}

        <form onSubmit={submit} className="card" style={{ textAlign: 'left', marginTop: inShell ? 0 : 22 }}>
          <div className="card-title">Start a New Production</div>
          <label className="field">
            <span className="field-label">
              Show title <ReqStar />
            </span>
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
              <span className="field-label">
                Venue <ReqStar />
              </span>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Main Stage"
              />
            </label>
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canSubmit}>
            Create Production →
          </button>

          {inShell ? (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => navigate('/hub')}
            >
              Cancel
            </button>
          ) : (
            <>
              <div className="row" style={{ gap: 10, alignItems: 'center', margin: '14px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span className="hint">or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: '100%' }}
                onClick={() => {
                  loadSampleProduction()
                  navigate('/hub')
                }}
              >
                ✨ Explore a Sample Production
              </button>
              <p className="hint" style={{ textAlign: 'center', marginBottom: 0 }}>
                Everything is stored privately in this browser. You can export a backup anytime.
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
