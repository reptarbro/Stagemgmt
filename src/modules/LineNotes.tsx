import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import { formatDate, todayISO } from '../lib/format'
import type { LineNote, LineNoteType, Person } from '../lib/types'

const TYPES: LineNoteType[] = [
  'dropped',
  'paraphrased',
  'jumped',
  'added',
  'called for line',
  'other',
]

const BLANK: Omit<LineNote, 'id'> = {
  date: todayISO(),
  personId: '',
  location: '',
  type: 'dropped',
  note: '',
  resolved: false,
}

export function LineNotes() {
  const { production, addLineNote, updateLineNote, deleteLineNote } = useStore()
  const [editing, setEditing] = useState<LineNote | 'new' | null>(null)
  const [hideResolved, setHideResolved] = useState(false)

  const notes = production?.lineNotes ?? []
  const cast = useMemo(
    () => (production?.people ?? []).filter((p) => p.group === 'Cast'),
    [production?.people],
  )
  const people = production?.people ?? []
  const nameFor = (id: string) => {
    const p = people.find((x) => x.id === id)
    return p ? p.character || p.name : 'Unknown'
  }

  const visible = useMemo(
    () =>
      [...notes]
        .filter((n) => (hideResolved ? !n.resolved : true))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [notes, hideResolved],
  )

  // Per-actor outstanding counts — handy for "who needs to be off book".
  const perActor = useMemo(() => {
    const c: Record<string, number> = {}
    for (const n of notes) if (!n.resolved) c[n.personId] = (c[n.personId] ?? 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [notes])

  return (
    <>
      <PageHead
        title="Line Notes"
        subtitle="Track line accuracy by actor"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Add note
          </button>
        }
      />

      {notes.length === 0 ? (
        <EmptyState mark="📝" title="No line notes yet">
          Once actors are off book, log dropped or paraphrased lines here — then hand each actor their
          list.
        </EmptyState>
      ) : (
        <>
          {perActor.length > 0 && (
            <div className="card" style={{ padding: 14 }}>
              <div className="card-title">Outstanding by actor</div>
              <div className="row wrap" style={{ gap: 8 }}>
                {perActor.map(([id, n]) => (
                  <span key={id} className="tag">
                    {nameFor(id)} · <strong>{n}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="row-between wrap mt mb">
            <span className="faint small">
              {visible.length} note{visible.length === 1 ? '' : 's'}
            </span>
            <label className="row small" style={{ gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hideResolved}
                onChange={(e) => setHideResolved(e.target.checked)}
                style={{ width: 'auto' }}
              />
              Hide resolved
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Actor</th>
                  <th>Type</th>
                  <th>Where</th>
                  <th>Note</th>
                  <th style={{ width: 110 }}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((n) => (
                  <tr key={n.id} style={{ opacity: n.resolved ? 0.5 : 1 }}>
                    <td className="small">{formatDate(n.date)}</td>
                    <td style={{ fontWeight: 600 }}>{nameFor(n.personId)}</td>
                    <td>
                      <span className="tag">{n.type}</span>
                    </td>
                    <td className="small">{n.location || '—'}</td>
                    <td className="small">{n.note || '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="icon-btn"
                          title={n.resolved ? 'Mark unresolved' : 'Mark resolved'}
                          onClick={() => updateLineNote(n.id, { resolved: !n.resolved })}
                        >
                          {n.resolved ? '↩' : '✓'}
                        </button>
                        <button className="icon-btn" onClick={() => setEditing(n)} aria-label="Edit">
                          ✎
                        </button>
                        <ConfirmButton onConfirm={() => deleteLineNote(n.id)}>🗑</ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <LineNoteForm
          initial={editing === 'new' ? undefined : editing}
          cast={cast.length ? cast : people}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addLineNote(vals)
            else updateLineNote(editing.id, vals)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function LineNoteForm({
  initial,
  cast,
  onClose,
  onSave,
}: {
  initial?: LineNote
  cast: Person[]
  onClose: () => void
  onSave: (vals: Omit<LineNote, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<LineNote, 'id'>>({
    ...BLANK,
    personId: cast[0]?.id ?? '',
    ...initial,
  })
  const set =
    (k: keyof Omit<LineNote, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  return (
    <Modal title={initial ? 'Edit line note' : 'Add line note'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Actor *</span>
          <select value={f.personId} onChange={set('personId')}>
            <option value="">— choose —</option>
            {cast.map((p) => (
              <option key={p.id} value={p.id}>
                {p.character ? `${p.character} (${p.name})` : p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Date</span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Type</span>
          <select value={f.type} onChange={set('type')}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Where (page / scene)</span>
          <input value={f.location} onChange={set('location')} placeholder="p. 34" />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Note</span>
        <textarea
          value={f.note}
          onChange={set('note')}
          placeholder="What was said vs. what's written…"
        />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!f.personId} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
