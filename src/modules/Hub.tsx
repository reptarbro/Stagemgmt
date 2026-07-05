import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHead, Modal } from '../components/ui'
import { formatDate, formatTime, daysUntil, todayISO } from '../lib/format'
import { cueToCueActive } from '../lib/dates'
import type { Production } from '../lib/types'

export function Hub() {
  const { production, updateProduction } = useStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [quick, setQuick] = useState<null | 'cast' | 'calls'>(null)
  if (!production) return null

  const today = todayISO()
  const upcoming = [...production.events]
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.callTime ?? '').localeCompare(b.callTime ?? ''))

  const nextEvents = upcoming.slice(0, 5)
  const castCount = production.people.filter((p) => p.group === 'Cast').length
  const opening = daysUntil(production.openingNight)

  return (
    <>
      <PageHead
        title={production.title}
        subtitle={[production.company, production.venue].filter(Boolean).join(' · ') || 'Production overview'}
        actions={
          <button className="btn" onClick={() => setEditing(true)}>
            ✎ Edit Details
          </button>
        }
      />

      {cueToCueActive(production) && (
        <Link
          to="/cues"
          className="backup-banner no-print"
          style={{ marginBottom: 18, textDecoration: 'none' }}
        >
          <span>💡 Tech is near — your Cue-to-Cue calling sheet is open.</span>
          <span className="small" style={{ fontWeight: 600, flexShrink: 0 }}>Open →</span>
        </Link>
      )}

      <div className="grid grid-4">
        <button type="button" className="stat stat-tap" onClick={() => setQuick('cast')}>
          <div className="stat-value">{production.people.length}</div>
          <div className="stat-label">People</div>
          <div className="stat-sub">{castCount} cast · tap for list</div>
        </button>
        <button type="button" className="stat stat-tap" onClick={() => setQuick('calls')}>
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-label">Upcoming calls</div>
          <div className="stat-sub">{production.events.length} total · tap to view</div>
        </button>
        <button type="button" className="stat stat-tap" onClick={() => navigate('/reports')}>
          <div className="stat-value">{production.reports.length}</div>
          <div className="stat-label">Reports filed</div>
          <div className="stat-sub">rehearsal &amp; performance →</div>
        </button>
        <button type="button" className="stat stat-tap" onClick={() => navigate('/schedule')}>
          <div className="stat-value">
            {opening === null ? '—' : opening > 0 ? opening : opening === 0 ? '🎉' : '✓'}
          </div>
          <div className="stat-label">
            {opening === null
              ? 'Opening night'
              : opening > 0
                ? 'Days to opening'
                : opening === 0
                  ? 'Opening tonight!'
                  : 'Opened'}
          </div>
          <div className="stat-sub">{formatDate(production.openingNight)}</div>
        </button>
      </div>

      <div className="grid grid-2 mt">
        <div className="card">
          <div className="row-between mb">
            <div className="card-title" style={{ margin: 0 }}>
              Next up
            </div>
            <Link to="/schedule" className="small">
              Full schedule →
            </Link>
          </div>
          {nextEvents.length === 0 ? (
            <p className="muted small">
              No upcoming calls. <Link to="/schedule">Add one →</Link>
            </p>
          ) : (
            <ul className="list-reset">
              {nextEvents.map((e) => (
                <li
                  key={e.id}
                  className="row-between"
                  style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.title}</div>
                    <div className="faint small">
                      {formatDate(e.date)}
                      {e.callTime && ` · Call ${formatTime(e.callTime)}`}
                      {e.location && ` · ${e.location}`}
                    </div>
                  </div>
                  <span className={`badge`}>{e.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="card-title">Key dates & info</div>
          <KeyValue label="Director" value={production.director} />
          <KeyValue label="First rehearsal" value={formatDate(production.firstRehearsal)} />
          <KeyValue label="Opening night" value={formatDate(production.openingNight)} />
          <KeyValue label="Closing night" value={formatDate(production.closingNight)} />
          {production.notes && (
            <>
              <div className="divider" />
              <div className="field-label">Notes</div>
              <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                {production.notes}
              </p>
            </>
          )}
        </div>
      </div>

      {quick === 'cast' && (
        <Modal title="Cast & Crew" onClose={() => setQuick(null)}>
          <ul className="list-reset">
            {production.people.length === 0 ? (
              <li className="muted small">No one on the roster yet.</li>
            ) : (
              [...production.people]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <li key={p.id} className="row-between" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 550 }}>{p.name}</span>
                    <span className="faint small">{p.character || p.role || p.group}</span>
                  </li>
                ))
            )}
          </ul>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setQuick(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => navigate('/people')}>Open People →</button>
          </div>
        </Modal>
      )}

      {quick === 'calls' && (
        <Modal title="Upcoming Calls" onClose={() => setQuick(null)}>
          {upcoming.length === 0 ? (
            <p className="muted small" style={{ marginTop: 0 }}>No upcoming calls.</p>
          ) : (
            <ul className="list-reset">
              {upcoming.map((e) => (
                <li key={e.id} className="row-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 550 }} className="tcase">{e.title || e.type}</div>
                    <div className="faint small">
                      {formatDate(e.date)}
                      {e.callTime && ` · Call ${formatTime(e.callTime)}`}
                      {e.location && ` · ${e.location}`}
                    </div>
                  </div>
                  <span className="badge">{e.type}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setQuick(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => navigate('/schedule')}>Open Schedule →</button>
          </div>
        </Modal>
      )}

      {editing && (
        <ProductionForm
          initial={production}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            updateProduction(production.id, patch)
            setEditing(false)
          }}
        />
      )}
    </>
  )
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="row-between" style={{ padding: '7px 0' }}>
      <span className="faint small">{label}</span>
      <span className="small" style={{ fontWeight: 550 }}>
        {value || '—'}
      </span>
    </div>
  )
}

export function ProductionForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Production
  onClose: () => void
  onSave: (patch: Partial<Production>) => void
}) {
  const [f, setF] = useState({
    title: initial?.title ?? '',
    company: initial?.company ?? '',
    venue: initial?.venue ?? '',
    director: initial?.director ?? '',
    firstRehearsal: initial?.firstRehearsal ?? '',
    openingNight: initial?.openingNight ?? '',
    closingNight: initial?.closingNight ?? '',
    notes: initial?.notes ?? '',
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal title={initial ? 'Edit production' : 'New production'} onClose={onClose}>
      <label className="field">
        <span className="field-label">Show title *</span>
        <input value={f.title} onChange={set('title')} autoFocus />
      </label>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Company</span>
          <input value={f.company} onChange={set('company')} />
        </label>
        <label className="field">
          <span className="field-label">Venue</span>
          <input value={f.venue} onChange={set('venue')} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Director</span>
        <input value={f.director} onChange={set('director')} />
      </label>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">First rehearsal</span>
          <input type="date" value={f.firstRehearsal} onChange={set('firstRehearsal')} />
        </label>
        <label className="field">
          <span className="field-label">Opening night</span>
          <input type="date" value={f.openingNight} onChange={set('openingNight')} />
        </label>
        <label className="field">
          <span className="field-label">Closing night</span>
          <input type="date" value={f.closingNight} onChange={set('closingNight')} />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Any production-wide notes…" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!f.title.trim()} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
