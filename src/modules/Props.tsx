import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import type { Person, PropCategory, PropItem, PropStatus } from '../lib/types'

const CATEGORIES: PropCategory[] = ['Prop', 'Costume', 'Set', 'Furniture', 'Sound', 'Other']
const STATUSES: PropStatus[] = ['Needed', 'In progress', 'Ready', 'Cut']

const STATUS_COLOR: Record<PropStatus, string> = {
  Needed: 'var(--danger)',
  'In progress': 'var(--accent-warm)',
  Ready: 'var(--success)',
  Cut: 'var(--text-faint)',
}

const BLANK: Omit<PropItem, 'id'> = {
  name: '',
  category: 'Prop',
  sceneRef: '',
  usedByPersonIds: [],
  status: 'Needed',
  notes: '',
}

export function Props() {
  const { production, addProp, updateProp, deleteProp } = useStore()
  const [editing, setEditing] = useState<PropItem | 'new' | null>(null)
  const [filter, setFilter] = useState<'All' | PropCategory>('All')

  const items = production?.props ?? []
  const people = production?.people ?? []
  const nameFor = (id: string) => people.find((p) => p.id === id)?.name ?? '—'

  const filtered = useMemo(
    () => items.filter((i) => (filter === 'All' ? true : i.category === filter)),
    [items, filter],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1
    return c
  }, [items])

  const outstanding = items.filter((i) => i.status === 'Needed' || i.status === 'In progress').length

  return (
    <>
      <PageHead
        title="Props & Costumes"
        subtitle={
          items.length ? `${outstanding} still to sort of ${items.length} tracked` : 'Running lists'
        }
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Add item
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState mark="🎩" title="Nothing tracked yet">
          Log props, costumes, set pieces, and furniture — where they're used, who handles them, and
          whether they're ready.
        </EmptyState>
      ) : (
        <>
          <div className="row wrap mb" style={{ gap: 8 }}>
            <button
              className={`btn btn-sm ${filter === 'All' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('All')}
              style={{ borderRadius: 999 }}
            >
              All {items.length}
            </button>
            {CATEGORIES.filter((c) => counts[c]).map((c) => (
              <button
                key={c}
                className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(c)}
                style={{ borderRadius: 999 }}
              >
                {c} {counts[c]}
              </button>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Scene</th>
                  <th>Used by</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      {i.notes && <div className="faint small">{i.notes}</div>}
                    </td>
                    <td>
                      <span className="tag">{i.category}</span>
                    </td>
                    <td className="small">{i.sceneRef || '—'}</td>
                    <td className="small">
                      {i.usedByPersonIds.length
                        ? i.usedByPersonIds.map(nameFor).join(', ')
                        : '—'}
                    </td>
                    <td>
                      <span
                        className="badge"
                        style={{ color: STATUS_COLOR[i.status], borderColor: 'currentColor' }}
                      >
                        {i.status}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => setEditing(i)} aria-label="Edit">
                          ✎
                        </button>
                        <ConfirmButton onConfirm={() => deleteProp(i.id)}>🗑</ConfirmButton>
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
        <PropForm
          initial={editing === 'new' ? undefined : editing}
          people={people}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addProp(vals)
            else updateProp(editing.id, vals)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function PropForm({
  initial,
  people,
  onClose,
  onSave,
}: {
  initial?: PropItem
  people: Person[]
  onClose: () => void
  onSave: (vals: Omit<PropItem, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<PropItem, 'id'>>({ ...BLANK, ...initial })
  const set =
    (k: keyof Omit<PropItem, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  const toggle = (id: string) =>
    setF((s) => ({
      ...s,
      usedByPersonIds: s.usedByPersonIds.includes(id)
        ? s.usedByPersonIds.filter((x) => x !== id)
        : [...s.usedByPersonIds, id],
    }))

  return (
    <Modal title={initial ? 'Edit item' : 'Add item'} onClose={onClose}>
      <label className="field">
        <span className="field-label">Name *</span>
        <input value={f.name} onChange={set('name')} placeholder="Yorick's skull" autoFocus />
      </label>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">Category</span>
          <select value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status</span>
          <select value={f.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Scene / Act</span>
          <input value={f.sceneRef} onChange={set('sceneRef')} placeholder="5.1" />
        </label>
      </div>

      <div className="field-label">
        Used by <span className="faint">({f.usedByPersonIds.length} selected)</span>
      </div>
      {people.length === 0 ? (
        <p className="hint">Add people first to assign handlers.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', marginBottom: 14 }}>
          {people.map((p) => {
            const on = f.usedByPersonIds.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggle(p.id)}
                style={{ borderRadius: 999 }}
              >
                {on ? '✓ ' : ''}
                {p.name}
              </button>
            )
          })}
        </div>
      )}

      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Breakable? Preset where? Sourced from…" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!f.name.trim()} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
