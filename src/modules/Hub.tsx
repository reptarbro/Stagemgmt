import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PageHead, Modal } from '../components/ui'
import { formatDate, formatTime, daysUntil, todayISO } from '../lib/format'
import type { Production } from '../lib/types'

export function Hub() {
  const { production, updateProduction, createProduction } = useStore()
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
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
          <>
            <button className="btn" onClick={() => setEditing(true)}>
              ✎ Edit details
            </button>
            <button className="btn btn-ghost" onClick={() => setCreating(true)}>
              + New production
            </button>
          </>
        }
      />

      <div className="grid grid-4">
        <div className="stat">
          <div className="stat-value">{production.people.length}</div>
          <div className="stat-label">People</div>
          <div className="stat-sub">{castCount} cast</div>
        </div>
        <div className="stat">
          <div className="stat-value">{upcoming.length}</div>
          <div className="stat-label">Upcoming calls</div>
          <div className="stat-sub">{production.events.length} total scheduled</div>
        </div>
        <div className="stat">
          <div className="stat-value">{production.reports.length}</div>
          <div className="stat-label">Reports filed</div>
          <div className="stat-sub">rehearsal & performance</div>
        </div>
        <div className="stat">
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
        </div>
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
      {creating && (
        <ProductionForm
          onClose={() => setCreating(false)}
          onSave={(patch) => {
            if (patch.title) createProduction({ ...patch, title: patch.title })
            setCreating(false)
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
