import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar, SortTh, useSort } from '../components/ui'
import { kindProfile } from '../lib/productionKind'
import type { Person, PropCategory, PropItem, PropStatus } from '../lib/types'

const CATEGORIES: PropCategory[] = ['Prop', 'Costume', 'Set', 'Furniture', 'Other']
const STATUSES: PropStatus[] = ['Needed', 'In progress', 'Ready', 'Cut']

const STATUS_COLOR: Record<PropStatus, string> = {
  Needed: 'var(--danger)',
  'In progress': 'var(--warn)',
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
  quantity: '',
  sceneRef: '',
  usedByPersonIds: [],
  usedByAllCast: false,
  priority: false,
  status: 'Needed',
  notes: '',
}

/** "All cast" + any specific names, joined - or "-". */
function usedByLabel(i: PropItem, nameFor: (id: string) => string): string {
  const parts = [i.usedByAllCast ? 'All cast' : null, ...i.usedByPersonIds.map(nameFor)].filter(Boolean)
  return parts.length ? (parts.join(', ') as string) : '-'
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
  const [bulk, setBulk] = useState(false)
  const [filter, setFilter] = useState<'All' | PropCategory | 'Priority'>('All')
  const sort = useSort<SortKey>('name')

  const items = production?.props ?? []
  const people = production?.people ?? []
  const unit = kindProfile(production?.kind).unit // "Scene" / "Number" / "Piece" / "Segment"
  const nameFor = (id: string) => people.find((p) => p.id === id)?.name ?? '-'

  const filtered = useMemo(
    () =>
      items.filter((i) =>
        filter === 'All' ? true : filter === 'Priority' ? !!i.priority : i.category === filter,
      ),
    [items, filter],
  )
  // Column sort, then float priority items to the top (stable - keeps the
  // column order within each group).
  const rows = useMemo(() => {
    const s = sort.sorted(filtered, sortVal)
    return [...s].sort((a, b) => Number(!!b.priority) - Number(!!a.priority))
  }, [filtered, sort])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1
    return c
  }, [items])
  const priorityCount = items.filter((i) => i.priority).length

  const outstanding = items.filter(needsSort).length

  return (
    <>
      <PageHead
        title="Props & Costumes"
        subtitle={
          items.length
            ? `${outstanding} of ${items.length} still need sorting (not yet Ready) - flagged with ⚠️`
            : 'Running lists'
        }
        actions={
          <>
            <button className="btn" onClick={() => setBulk(true)}>
              ⧉ Add Multiple
            </button>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add Item
            </button>
          </>
        }
      />

      {items.length === 0 ? (
        <EmptyState mark="🎩" title="Nothing tracked yet">
          Log props, costumes, set pieces, and furniture - where they're used, who handles them, and
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
              All <span className="chip-ct">{items.length}</span>
            </button>
            {priorityCount > 0 && (
              <button
                className={`btn btn-sm ${filter === 'Priority' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('Priority')}
                style={{ borderRadius: 999, color: filter === 'Priority' ? undefined : 'var(--warn)' }}
              >
                ⚡ Priority <span className="chip-ct">{priorityCount}</span>
              </button>
            )}
            {CATEGORIES.filter((c) => counts[c]).map((c) => (
              <button
                key={c}
                className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(c)}
                style={{ borderRadius: 999 }}
              >
                {c} <span className="chip-ct">{counts[c]}</span>
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
                  <SortTh label={unit} sortKey="sceneRef" ctrl={sort} />
                  <th>Used by</th>
                  <SortTh label="Status" sortKey="status" ctrl={sort} />
                  <th style={{ width: 96 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="row-tap" onClick={() => setViewing(i)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {i.priority && <span title="High priority" style={{ color: 'var(--warn)', marginRight: 4 }}>⚡</span>}
                        {i.name}
                        {i.quantity && <span className="faint small" style={{ fontWeight: 400 }}> · ×{i.quantity}</span>}
                      </div>
                      {i.notes && <div className="faint small">{i.notes}</div>}
                    </td>
                    <td>
                      <span className="tag">{i.category}</span>
                    </td>
                    <td className="small">{i.sceneRef || '-'}</td>
                    <td className="small">{usedByLabel(i, nameFor)}</td>
                    <td>
                      <span className="row" style={{ gap: 4, whiteSpace: 'nowrap' }}>
                        <span
                          className="badge"
                          style={{ color: STATUS_COLOR[i.status], borderColor: 'currentColor' }}
                        >
                          {i.status}
                        </span>
                        {needsSort(i) && (
                          <span className="flag-warn" title="Still to sort - not yet Ready">⚠️</span>
                        )}
                      </span>
                    </td>
                    <td className="no-print">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => setEditing(i)} aria-label="Edit" title="Edit">
                          ✎
                        </button>
                        <ConfirmButton className="icon-btn danger" ariaLabel="Delete item" onConfirm={() => deleteProp(i.id)}>🗑</ConfirmButton>
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
          unit={unit}
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
          unit={unit}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addProp(vals)
            else updateProp(editing.id, vals)
            setEditing(null)
          }}
        />
      )}

      {bulk && (
        <PropsBulkAdd
          onClose={() => setBulk(false)}
          onAdd={(rows) => {
            rows.forEach((r) => addProp(r))
            setBulk(false)
          }}
        />
      )}
    </>
  )
}

function PropDetail({
  item,
  nameFor,
  unit,
  onClose,
  onEdit,
}: {
  item: PropItem
  nameFor: (id: string) => string
  unit: string
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal title={item.name} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        {item.priority && (
          <span className="badge" style={{ color: 'var(--warn)', borderColor: 'currentColor' }}>⚡ Priority</span>
        )}
        <span className="tag">{item.category}</span>
        {item.quantity && <span className="tag">×{item.quantity}</span>}
        <span className="badge" style={{ color: STATUS_COLOR[item.status], borderColor: 'currentColor' }}>
          {item.status}
        </span>
        {needsSort(item) && <span title="Still to sort">⚠️</span>}
        {item.sceneRef && <span className="tag">{unit} {item.sceneRef}</span>}
      </div>
      <div className="field-label">Used by</div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {usedByLabel(item, nameFor)}
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
  unit,
  onClose,
  onSave,
}: {
  initial?: PropItem
  people: Person[]
  unit: string
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

  // Only the essentials are required now - quantity, scene, and handlers are all
  // optional so an item can be logged fast and filled in later.
  const missing = !f.name.trim() || !f.category || !f.status

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
          <span className="field-label">Quantity</span>
          <input value={f.quantity ?? ''} onChange={set('quantity')} placeholder="e.g. 2" />
        </label>
      </div>

      <label className="row" style={{ gap: 8, cursor: 'pointer', marginBottom: 14 }}>
        <input
          type="checkbox"
          checked={!!f.priority}
          onChange={(e) => setF((s) => ({ ...s, priority: e.target.checked }))}
        />
        <span className="small" style={{ color: f.priority ? 'var(--warn)' : undefined }}>
          ⚡ High priority - needed urgently
        </span>
      </label>

      <div className="field-label">
        Used by{' '}
        <span className="faint">
          (
          {[f.usedByAllCast ? 'all cast' : null, f.usedByPersonIds.length ? `${f.usedByPersonIds.length} more` : null]
            .filter(Boolean)
            .join(' + ') || 'none'}
          )
        </span>
      </div>
      {people.length === 0 ? (
        <p className="hint">Add people first to assign handlers.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 140, overflowY: 'auto', marginBottom: 14 }}>
          {people.some((p) => p.group === 'Cast') && (
            <button
              type="button"
              className={`btn btn-sm ${f.usedByAllCast ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() =>
                setF((s) => {
                  const turningOn = !s.usedByAllCast
                  return {
                    ...s,
                    usedByAllCast: turningOn,
                    // Turning "All cast" on clears any individually-picked cast
                    // members (they're now covered); crew/other handlers stay.
                    usedByPersonIds: turningOn
                      ? s.usedByPersonIds.filter((id) => people.find((p) => p.id === id)?.group !== 'Cast')
                      : s.usedByPersonIds,
                  }
                })
              }
              style={{ borderRadius: 999 }}
              title="Everyone in the Cast, kept correct as the cast changes"
            >
              {f.usedByAllCast ? '✓ ' : ''}👥 All cast
            </button>
          )}
          {people.map((p) => {
            // While "All cast" is on, cast members are covered by it - hide them
            // so the picker only offers people not already included.
            if (f.usedByAllCast && p.group === 'Cast') return null
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
        <span className="field-label">{unit}</span>
        <input value={f.sceneRef} onChange={set('sceneRef')} placeholder="5.1" />
      </label>

      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Breakable? Preset where? Sourced from…" />
      </label>
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          Name, category &amp; status are required.
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

/** Rapid multi-item entry - a row per item (name · category · qty · priority),
    like People's "Add Multiple". Blank-name rows are ignored. */
function PropsBulkAdd({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (rows: Omit<PropItem, 'id'>[]) => void
}) {
  type Row = { name: string; category: PropCategory; quantity: string; priority: boolean }
  const blankRow = (): Row => ({ name: '', category: 'Prop', quantity: '', priority: false })
  const [rows, setRows] = useState<Row[]>([blankRow(), blankRow(), blankRow()])
  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))
  const ready = rows.filter((r) => r.name.trim())

  return (
    <Modal title="Add Multiple Items" onClose={onClose} className="modal-wide">
      <p className="small muted" style={{ marginTop: 0 }}>
        Log a batch fast - just name &amp; category. Everything starts as <strong>Needed</strong>; open any
        item later to add handlers, scene, and notes.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {rows.map((r, i) => (
          <div key={i} className="row" style={{ gap: 6, alignItems: 'center' }}>
            <input
              value={r.name}
              onChange={(e) => update(i, { name: e.target.value })}
              placeholder="Item name"
              style={{ flex: 1, minWidth: 90 }}
              autoFocus={i === 0}
            />
            <select
              value={r.category}
              onChange={(e) => update(i, { category: e.target.value as PropCategory })}
              style={{ width: 118, flex: 'none' }}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              value={r.quantity}
              onChange={(e) => update(i, { quantity: e.target.value })}
              placeholder="Qty"
              style={{ width: 60, flex: 'none' }}
            />
            <button
              type="button"
              className={`btn btn-sm ${r.priority ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => update(i, { priority: !r.priority })}
              title="High priority"
              style={{ flex: 'none', padding: '6px 9px' }}
            >
              ⚡
            </button>
            <button type="button" className="icon-btn danger" aria-label="Remove row" onClick={() => remove(i)}>
              🗑
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRows((rs) => [...rs, blankRow()])}>
        + Add row
      </button>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-primary"
          disabled={ready.length === 0}
          onClick={() =>
            onAdd(
              ready.map((r) => ({
                ...BLANK,
                name: r.name.trim(),
                category: r.category,
                quantity: r.quantity.trim() || undefined,
                priority: r.priority,
              })),
            )
          }
        >
          Add {ready.length || ''} item{ready.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  )
}
