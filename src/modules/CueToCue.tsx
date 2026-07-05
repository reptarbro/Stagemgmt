import { useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar, SortTh, useSort } from '../components/ui'
import { daysToOpening, cueToCueActive, CUE_WINDOW_DAYS } from '../lib/dates'
import type { Cue, CueDept, CueStatus } from '../lib/types'

const DEPTS: CueDept[] = ['LX', 'Sound', 'Fly', 'Deck', 'Spot', 'Projection', 'Other']
const STATUSES: CueStatus[] = ['dry-tech', 'teched', 'set']
const STATUS_LABEL: Record<CueStatus, string> = {
  'dry-tech': 'Dry tech',
  teched: 'Teched',
  set: 'Set',
}

const BLANK: Omit<Cue, 'id'> = {
  number: '',
  dept: 'LX',
  placement: '',
  action: '',
  standby: '',
  status: 'dry-tech',
}

type SortKey = 'number' | 'dept' | 'placement' | 'status'
const sortVal = (c: Cue, key: SortKey): string => {
  switch (key) {
    case 'dept':
      return c.dept
    case 'placement':
      return c.placement || ''
    case 'status':
      return STATUSES.indexOf(c.status).toString()
    default:
      return c.number
  }
}

export function CueToCue() {
  const { production, addCue, updateCue, deleteCue } = useStore()
  const [editing, setEditing] = useState<Cue | 'new' | null>(null)
  const [viewing, setViewing] = useState<Cue | null>(null)
  const [deptFilter, setDeptFilter] = useState<'All' | CueDept>('All')
  const sort = useSort<SortKey>('number')
  if (!production) return null

  const cues = production.cues ?? []
  const active = cueToCueActive(production)
  const d = daysToOpening(production)

  const filtered = cues.filter((c) => (deptFilter === 'All' ? true : c.dept === deptFilter))
  const rows = sort.sorted(filtered, sortVal)

  const deptCounts: Record<string, number> = {}
  for (const c of cues) deptCounts[c.dept] = (deptCounts[c.dept] ?? 0) + 1

  return (
    <>
      <PageHead
        title="Cue-to-Cue"
        subtitle="Calling script — standbys, cues & status"
        actions={
          <div className="row wrap no-print" style={{ gap: 6 }}>
            {cues.length > 0 && (
              <button className="btn btn-sm btn-ghost" onClick={() => window.print()} title="Print calling script">
                🖨 Print
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add Cue
            </button>
          </div>
        }
      />

      {/* Countdown context. */}
      <div className="card no-print" style={{ padding: '12px 16px', marginBottom: 16 }}>
        {active ? (
          <span className="small">
            💡 <strong>Tech window is open.</strong>{' '}
            {d !== null && (d > 0 ? `${d} day${d === 1 ? '' : 's'} to opening.` : d === 0 ? 'Opening tonight.' : 'In performance.')}{' '}
            Build and call your cues here.
          </span>
        ) : (
          <span className="small muted">
            💡 The cue-to-cue calling sheet is designed for tech week — it steps forward on its own about{' '}
            {CUE_WINDOW_DAYS} days before opening.{' '}
            {d !== null ? `Opening is ${d} days out; it activates in ${d - CUE_WINDOW_DAYS} days.` : 'Set an opening night on the Hub to start the countdown.'}{' '}
            You can still draft cues now.
          </span>
        )}
      </div>

      {cues.length === 0 ? (
        <EmptyState mark="💡" title="No cues yet">
          Add your first standby/GO — light, sound, fly, deck, and spot cues — to build the calling script.
        </EmptyState>
      ) : (
        <>
          <div className="row wrap mb no-print" style={{ gap: 8 }}>
            <FilterChip active={deptFilter === 'All'} onClick={() => setDeptFilter('All')}>
              All {cues.length}
            </FilterChip>
            {DEPTS.filter((g) => deptCounts[g]).map((g) => (
              <FilterChip key={g} active={deptFilter === g} onClick={() => setDeptFilter(g)}>
                {g} {deptCounts[g]}
              </FilterChip>
            ))}
          </div>

          <p className="hint no-print" style={{ marginTop: -6 }}>
            Tap a cue to see its standby line and notes.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Cue" sortKey="number" ctrl={sort} style={{ width: 90 }} />
                  <SortTh label="Dept" sortKey="dept" ctrl={sort} style={{ width: 96 }} />
                  <SortTh label="Placement" sortKey="placement" ctrl={sort} />
                  <th>Action</th>
                  <SortTh label="Status" sortKey="status" ctrl={sort} style={{ width: 110 }} />
                  <th style={{ width: 96 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="row-tap" onClick={() => setViewing(c)}>
                    <td style={{ fontWeight: 700 }}>{c.number}</td>
                    <td>
                      <span className="badge">{c.dept}</span>
                    </td>
                    <td className="small">{c.placement || '—'}</td>
                    <td className="small">{c.action || '—'}</td>
                    <td>
                      <span className={`badge cue-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                    </td>
                    <td className="no-print">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => setEditing(c)} aria-label="Edit" title="Edit">
                          ✎
                        </button>
                        <ConfirmButton className="icon-btn danger" onConfirm={() => deleteCue(c.id)}>
                          🗑
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {viewing && (
        <CueDetail
          cue={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const c = viewing
            setViewing(null)
            setEditing(c)
          }}
        />
      )}

      {editing && (
        <CueForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addCue(vals)
            else updateCue(editing.id, vals)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function CueDetail({ cue, onClose, onEdit }: { cue: Cue; onClose: () => void; onEdit: () => void }) {
  return (
    <Modal title={`${cue.number} · ${cue.dept}`} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className={`badge cue-${cue.status}`}>{STATUS_LABEL[cue.status]}</span>
        {cue.placement && <span className="tag">{cue.placement}</span>}
      </div>
      {cue.standby && (
        <p className="small" style={{ margin: '0 0 10px' }}>
          <strong>Standby:</strong> {cue.standby}
        </p>
      )}
      {cue.action && (
        <p className="small" style={{ margin: '0 0 10px' }}>
          <strong>GO:</strong> {cue.action}
        </p>
      )}
      {cue.notes && (
        <>
          <div className="field-label">Notes</div>
          <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{cue.notes}</p>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
      onClick={onClick}
      style={{ borderRadius: 999 }}
    >
      {children}
    </button>
  )
}

function CueForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Cue
  onClose: () => void
  onSave: (vals: Omit<Cue, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<Cue, 'id'>>({ ...BLANK, ...initial })
  const set =
    (k: keyof Omit<Cue, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal title={initial ? 'Edit Cue' : 'Add Cue'} onClose={onClose}>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">Cue # <ReqStar /></span>
          <input value={f.number} onChange={set('number')} autoFocus placeholder="Q1, LX 12…" />
        </label>
        <label className="field">
          <span className="field-label">Dept</span>
          <select value={f.dept} onChange={set('dept')}>
            {DEPTS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={f.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field-label">Placement</span>
        <input value={f.placement} onChange={set('placement')} placeholder="p.12 / “goodnight” or a visual" />
      </label>
      <label className="field">
        <span className="field-label">Standby line</span>
        <input value={f.standby} onChange={set('standby')} placeholder="Standby LX 12…" />
      </label>
      <label className="field">
        <span className="field-label">Action on GO</span>
        <textarea value={f.action} onChange={set('action')} placeholder="What happens when you call GO" />
      </label>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Timing, warnings, follow-ons…" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={!f.number.trim()} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
