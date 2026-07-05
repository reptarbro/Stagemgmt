import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar, SortTh, useSort } from '../components/ui'
import type { Person, PropCategory, PropItem, PropStatus } from '../lib/types'

const CATEGORIES: PropCategory[] = ['Prop', 'Costume', 'Set', 'Furniture', 'Other']
const STATUSES: PropStatus[] = ['Needed', 'In progress', 'Ready', 'Cut']

const STATUS_COLOR: Record<PropStatus, string> = {
  Needed: 'var(--danger)',
  'In progress': 'var(--accent-warm)',
  Ready: 'var(--success)',
  Cut: 'var(--text-faint)',
}

/** Items that still need attention (not Ready, not Cut). */
function needsSort(i: PropItem): boolean {
  return i.status === 'Needed' || i.status === 'In progress'
}

const BLANK: Omit<PropItem, 'id'> = {
  name: '',
  category: 'Prop',
  sceneRef: '',
  usedByPersonIds: [],
  status: 'Needed',
  notes: '',
}

type SortKey = 'name' | 'category' | 'sceneRef' | 'status'
const sortVal = (i: PropItem, key: SortKey): string => {
  switch (key) {
    case 'category':
      return i.category
    case 'sceneRef':
      return i.sceneRef || ''
    case 'status':
      return STATUSES.indexOf(i.status).toString()
    default:
      return i.name
  }
}

export function Props() {
  const { production, addProp, updateProp, deleteProp } = useStore()
  const [editing, setEditing] = useState<PropItem | 'new' | null>(null)
  const [viewing, setViewing] = useState<PropItem | null>(null)
  const [filter, setFilter] = useState<'All' | PropCategory>('All')
  const sort = useSort<SortKey>('name')

  const items = production?.props ?? []
  const people = production?.people ?? []
  const nameFor = (id: string) => people.find((p) => p.id === id)?.name ?? '—'

  const filtered = useMemo(
    () => items.filter((i) => (filter === 'All' ? true : i.category === filter)),
    [items, filter],
  )
  const rows = sort.sorted(filtered, sortVal)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1
    return c
  }, [items])

  const outstanding = items.filter(needsSort).length

  return (
    <>
      <PageHead
        title="Props & Costumes"
        subtitle={
          items.length
            ? `${outstanding} of ${items.length} still need sorting (not yet Ready) — flagged with ⚠️`
            : 'Running lists'
        }
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Add Item
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

          <p className="hint no-print" style={{ marginTop: -6 }}>
            Tap a row for full details. ⚠️ marks items still to sort.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Item" sortKey="name" ctrl={sort} />
                  <SortTh label="Category" sortKey="category" ctrl={sort} />
                  <SortTh label="Scene" sortKey="sceneRef" ctrl={sort} />
                  <th>Used by</th>
                  <SortTh label="Status" sortKey="status" ctrl={sort} />
                  <th style={{ width: 96 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="row-tap" onClick={() => setViewing(i)}>
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
                      {needsSort(i) && (
                        <span className="flag-warn" title="Still to sort — not yet Ready">⚠️</span>
                      )}
                    </td>
                    <td className="no-print">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => setEditing(i)} aria-label="Edit" title="Edit">
                          ✎
                        </button>
                        <ConfirmButton className="icon-btn danger" onConfirm={() => deleteProp(i.id)}>🗑</ConfirmButton>
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
        <PropDetail
          item={viewing}
          nameFor={nameFor}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const i = viewing
            setViewing(null)
            setEditing(i)
          }}
        />
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

function PropDetail({
  item,
  nameFor,
  onClose,
  onEdit,
}: {
  item: PropItem
  nameFor: (id: string) => string
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="tag">{item.category}</span>
        <span className="badge" style={{ color: STATUS_COLOR[item.status], borderColor: 'currentColor' }}>
          {item.status}
        </span>
        {needsSort(item) && <span title="Still to sort">⚠️</span>}
        {item.sceneRef && <span className="tag">Scene {item.sceneRef}</span>}
      </div>
      <div className="field-label">Used by</div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {item.usedByPersonIds.length ? item.usedByPersonIds.map(nameFor).join(', ') : '—'}
      </p>
      {item.notes && (
        <>
          <div className="field-label">Notes</div>
          <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.notes}</p>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
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

  const missing =
    !f.name.trim() || !f.category || !f.status || !(f.sceneRef ?? '').trim() || f.usedByPersonIds.length === 0

  return (
    <Modal title={initial ? 'Edit Item' : 'Add Item'} onClose={onClose}>
      <label className="field">
        <span className="field-label">Name <ReqStar /></span>
        <input value={f.name} onChange={set('name')} placeholder="Yorick's skull" autoFocus />
      </label>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">Category <ReqStar /></span>
          <select value={f.category} onChange={set('category')}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Status <ReqStar /></span>
          <select value={f.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Scene / Act <ReqStar /></span>
          <input value={f.sceneRef} onChange={set('sceneRef')} placeholder="5.1" />
        </label>
      </div>

      <div className="field-label">
        Used by <ReqStar /> <span className="faint">({f.usedByPersonIds.length} selected)</span>
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
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          Name, category, status, scene &amp; at least one handler are required.
        </p>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={missing} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}
