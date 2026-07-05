import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar, SortTh, useSort } from '../components/ui'
import { PrintSheet } from '../components/PrintSheet'
import { newId } from '../lib/storage'
import { formatDateShort, formatTime } from '../lib/format'
import { contactsCSV, downloadText, slug } from '../lib/exporters'
import type { Conflict, Person, PersonGroup, Production } from '../lib/types'

const GROUPS: PersonGroup[] = [
  'Cast',
  'Crew',
  'Creative',
  'Production',
  'Musician',
  'Front of House',
  'Other',
]

const BLANK: Omit<Person, 'id'> = {
  name: '',
  group: 'Cast',
  role: '',
  character: '',
  email: '',
  phone: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  notes: '',
  conflicts: [],
}

/** "Jul 6 · 6:00–8:00 PM · reason" — times optional (absent = all day). */
export function formatConflict(c: Conflict): string {
  const parts = [formatDateShort(c.date)]
  if (c.startTime) {
    parts.push(`${formatTime(c.startTime)}${c.endTime ? `–${formatTime(c.endTime)}` : ''}`)
  }
  if (c.note) parts.push(c.note)
  return parts.join(' · ')
}

type SortKey = 'name' | 'group' | 'role' | 'contact'
const sortVal = (p: Person, key: SortKey): string => {
  switch (key) {
    case 'group':
      return p.group
    case 'role':
      return p.role || p.character || ''
    case 'contact':
      return p.email || p.phone || ''
    default:
      return p.name
  }
}

export function People() {
  const { production, addPerson, updatePerson, deletePerson } = useStore()
  const [editing, setEditing] = useState<Person | 'new' | null>(null)
  const [viewing, setViewing] = useState<Person | null>(null)
  const [bulk, setBulk] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [filter, setFilter] = useState<'All' | PersonGroup>('All')
  const [q, setQ] = useState('')
  const sort = useSort<SortKey>('name')

  const people = production?.people ?? []

  const exportCSV = () => {
    if (!production || people.length === 0) return
    downloadText(`${slug(production.title)}-contacts.csv`, contactsCSV(people), 'text/csv;charset=utf-8')
  }

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return people
      .filter((p) => (filter === 'All' ? true : p.group === filter))
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.role.toLowerCase().includes(term) ||
          (p.character ?? '').toLowerCase().includes(term),
      )
  }, [people, filter, q])

  const rows = sort.sorted(filtered, sortVal)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const p of people) c[p.group] = (c[p.group] ?? 0) + 1
    return c
  }, [people])

  return (
    <>
      <PageHead
        title="People"
        subtitle="Cast & crew contact sheet"
        actions={
          <div
            className="no-print"
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}
          >
            <div className="row wrap" style={{ gap: 6 }}>
              {people.length > 0 && (
                <>
                  <button className="btn btn-sm" onClick={exportCSV} title="Download contact sheet (CSV)">
                    ⤓ CSV
                  </button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setPrinting(true)} title="Printable cast list">
                    🖨 Print
                  </button>
                </>
              )}
              <button className="btn btn-sm" onClick={() => setBulk(true)}>
                ⧉ Paste List
              </button>
            </div>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add Person
            </button>
          </div>
        }
      />

      {people.length === 0 ? (
        <EmptyState mark="👥" title="No one on the roster yet">
          Add your cast, crew, and creative team to build your contact sheet.
        </EmptyState>
      ) : (
        <>
          <div className="row wrap mb no-print" style={{ gap: 8 }}>
            <input
              placeholder="Search name, role, character…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 280 }}
            />
            <div className="spacer" />
            <FilterChip active={filter === 'All'} onClick={() => setFilter('All')}>
              All {people.length}
            </FilterChip>
            {GROUPS.filter((g) => counts[g]).map((g) => (
              <FilterChip key={g} active={filter === g} onClick={() => setFilter(g)}>
                {g}
              </FilterChip>
            ))}
          </div>

          <p className="hint no-print" style={{ marginTop: -6 }}>
            Tap a row to see full details, including availability conflicts.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Name" sortKey="name" ctrl={sort} />
                  <SortTh label="Group" sortKey="group" ctrl={sort} />
                  <SortTh label="Role / Character" sortKey="role" ctrl={sort} />
                  <SortTh label="Contact" sortKey="contact" ctrl={sort} />
                  <th style={{ width: 96 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="row-tap" onClick={() => setViewing(p)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${p.group}`}>{p.group}</span>
                    </td>
                    <td>
                      <div>{p.role || '—'}</div>
                      {p.character && <div className="faint small">as {p.character}</div>}
                    </td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>
                      {p.email && (
                        <div>
                          <a href={`mailto:${p.email}`} onClick={(e) => e.stopPropagation()}>
                            {p.email}
                          </a>
                        </div>
                      )}
                      {p.phone && (
                        <div>
                          <a href={`tel:${p.phone}`} onClick={(e) => e.stopPropagation()}>
                            {p.phone}
                          </a>
                        </div>
                      )}
                      {p.emergencyContactName && (
                        <div className="faint" style={{ fontSize: '0.72rem' }}>
                          🚑 {p.emergencyContactName} {p.emergencyContactPhone}
                        </div>
                      )}
                      {!p.email && !p.phone && !p.emergencyContactName && (
                        <span className="faint">—</span>
                      )}
                    </td>
                    <td className="no-print">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => setEditing(p)} aria-label="Edit" title="Edit">
                          ✎
                        </button>
                        <ConfirmButton className="icon-btn danger" onConfirm={() => deletePerson(p.id)}>
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
        <PersonDetail
          person={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const p = viewing
            setViewing(null)
            setEditing(p)
          }}
        />
      )}

      {editing && (
        <PersonForm
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addPerson(vals)
            else updatePerson(editing.id, vals)
            setEditing(null)
          }}
        />
      )}

      {bulk && (
        <BulkAddModal
          onClose={() => setBulk(false)}
          onAdd={(rows) => {
            rows.forEach((r) => addPerson(r))
            setBulk(false)
          }}
        />
      )}

      {printing && production && (
        <CastListSheet production={production} people={people} onClose={() => setPrinting(false)} />
      )}
    </>
  )
}

function CastListSheet({
  production,
  people,
  onClose,
}: {
  production: Production
  people: Person[]
  onClose: () => void
}) {
  const rows = [...people].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <PrintSheet hint="Print or save the cast &amp; crew list as a PDF." onClose={onClose}>
      <div className="sheet-head">
        <h2>{production.title} — Cast List</h2>
        <div className="sheet-sub">
          Cast &amp; Crew Contact Sheet
          {production.company ? ` · ${production.company}` : ''}
        </div>
      </div>
      <table className="sheet-table">
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Name</th>
            <th style={{ width: '13%' }}>Group</th>
            <th style={{ width: '22%' }}>Role / Character</th>
            <th style={{ width: '25%' }}>Contact</th>
            <th style={{ width: '20%' }}>Emergency</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="muted">No one on the roster yet.</td>
            </tr>
          ) : (
            rows.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.name}</td>
                <td>{p.group}</td>
                <td>
                  {p.role || '—'}
                  {p.character ? (
                    <>
                      {' '}
                      <strong>as {p.character}</strong>
                    </>
                  ) : null}
                </td>
                <td>
                  {p.email || ''}
                  {p.email && p.phone ? <br /> : null}
                  {p.phone || (!p.email ? '—' : '')}
                </td>
                <td>
                  {p.emergencyContactName
                    ? `${p.emergencyContactName}${p.emergencyContactPhone ? ` · ${p.emergencyContactPhone}` : ''}`
                    : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </PrintSheet>
  )
}

function PersonDetail({
  person,
  onClose,
  onEdit,
}: {
  person: Person
  onClose: () => void
  onEdit: () => void
}) {
  const conflicts = [...(person.conflicts ?? [])].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <Modal title={person.name} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className={`badge badge-${person.group}`}>{person.group}</span>
        {person.role && <span className="tag">{person.role}</span>}
        {person.character && <span className="tag">as {person.character}</span>}
      </div>

      <DetailRow label="Email" value={person.email && <a href={`mailto:${person.email}`}>{person.email}</a>} />
      <DetailRow label="Phone" value={person.phone && <a href={`tel:${person.phone}`}>{person.phone}</a>} />
      <DetailRow
        label="🚑 Emergency contact"
        value={
          person.emergencyContactName
            ? `${person.emergencyContactName}${person.emergencyContactPhone ? ` · ${person.emergencyContactPhone}` : ''}`
            : undefined
        }
      />

      <div className="divider" />
      <div className="field-label">Availability conflicts</div>
      {conflicts.length === 0 ? (
        <p className="small muted" style={{ margin: 0 }}>None logged.</p>
      ) : (
        <ul className="list-reset small" style={{ display: 'grid', gap: 4 }}>
          {conflicts.map((c) => (
            <li key={c.id}>⚠️ {formatConflict(c)}</li>
          ))}
        </ul>
      )}

      {person.notes && (
        <>
          <div className="divider" />
          <div className="field-label">Notes</div>
          <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{person.notes}</p>
        </>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
  )
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="row-between" style={{ padding: '6px 0', gap: 12 }}>
      <span className="faint small">{label}</span>
      <span className="small" style={{ fontWeight: 550, textAlign: 'right' }}>{value || '—'}</span>
    </div>
  )
}

function BulkAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (rows: Omit<Person, 'id'>[]) => void
}) {
  const [group, setGroup] = useState<PersonGroup>('Cast')
  const [text, setText] = useState('')

  const parsed: Omit<Person, 'id'>[] = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, role, character] = line.split(',').map((s) => s.trim())
      return { ...BLANK, group, name, role: role || '', character: character || '' }
    })
    .filter((p) => p.name)

  return (
    <Modal title="Paste a Cast/Crew List" onClose={onClose}>
      <p className="small muted" style={{ marginTop: 0 }}>
        One person per line. Optionally add role and character, comma-separated:
        <br />
        <code style={{ fontSize: '0.8rem' }}>Name, Role, Character</code> — e.g.{' '}
        <code style={{ fontSize: '0.8rem' }}>Robin Okafor, Actor, Puck</code>
      </p>
      <label className="field">
        <span className="field-label">Add all as</span>
        <select value={group} onChange={(e) => setGroup(e.target.value as PersonGroup)}>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">Names</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          autoFocus
          placeholder={'Robin Okafor, Actor, Puck\nDaniel Reyes, Actor, Oberon\nGrace Lin'}
        />
      </label>
      <p className="hint" style={{ marginTop: 0 }}>
        Tip: add email &amp; phone (required) afterward by tapping each person.
      </p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={parsed.length === 0} onClick={() => onAdd(parsed)}>
          Add {parsed.length || ''} {parsed.length === 1 ? 'person' : 'people'}
        </button>
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

function PersonForm({
  initial,
  onClose,
  onSave,
}: {
  initial?: Person
  onClose: () => void
  onSave: (vals: Omit<Person, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<Person, 'id'>>({ ...BLANK, ...initial })
  const set =
    (k: keyof Omit<Person, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  // Everyone needs name, group, role, email, phone.
  const missing =
    !f.name.trim() || !f.group || !f.role.trim() || !(f.email ?? '').trim() || !(f.phone ?? '').trim()

  return (
    <Modal title={initial ? 'Edit Person' : 'Add Person'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Name <ReqStar /></span>
          <input value={f.name} onChange={set('name')} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Group <ReqStar /></span>
          <select value={f.group} onChange={set('group')}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Role / Position <ReqStar /></span>
          <input value={f.role} onChange={set('role')} placeholder="e.g. ASM, Lighting Designer" />
        </label>
        <label className="field">
          <span className="field-label">Character (if cast)</span>
          <input value={f.character} onChange={set('character')} placeholder="e.g. Puck" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Email <ReqStar /></span>
          <input type="email" value={f.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span className="field-label">Phone <ReqStar /></span>
          <input value={f.phone} onChange={set('phone')} />
        </label>
      </div>
      <div className="divider" />
      <div className="field-label">🚑 Emergency contact</div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Name</span>
          <input value={f.emergencyContactName} onChange={set('emergencyContactName')} />
        </label>
        <label className="field">
          <span className="field-label">Phone</span>
          <input value={f.emergencyContactPhone} onChange={set('emergencyContactPhone')} />
        </label>
      </div>
      <div className="divider" />
      <ConflictsEditor
        conflicts={f.conflicts ?? []}
        onChange={(list) => setF((s) => ({ ...s, conflicts: list }))}
      />
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Allergies, dietary needs, etc." />
      </label>
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          Name, group, role, email &amp; phone are required.
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

function ConflictsEditor({
  conflicts,
  onChange,
}: {
  conflicts: Conflict[]
  onChange: (list: Conflict[]) => void
}) {
  const [date, setDate] = useState('')
  const [timed, setTimed] = useState(false)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')

  const add = () => {
    if (!date) return
    onChange([
      ...conflicts,
      {
        id: newId(),
        date,
        startTime: timed && start ? start : undefined,
        endTime: timed && end ? end : undefined,
        note: note.trim() || undefined,
      },
    ])
    setDate('')
    setStart('')
    setEnd('')
    setNote('')
    setTimed(false)
  }
  const remove = (id: string) => onChange(conflicts.filter((c) => c.id !== id))

  const sorted = [...conflicts].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="field-label">
        Availability conflicts{' '}
        <span className="faint">(dates/times they can't attend — flagged on the schedule)</span>
      </div>
      {sorted.length > 0 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
          {sorted.map((c) => (
            <span key={c.id} className="tag" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {formatConflict(c)}
              <button
                type="button"
                className="icon-btn"
                style={{ padding: 0, minWidth: 0, minHeight: 0, lineHeight: 1 }}
                onClick={() => remove(c.id)}
                aria-label="Remove conflict"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 6, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ maxWidth: 170 }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="reason (optional)"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          style={{ flex: 1, minWidth: 140 }}
        />
        <button type="button" className="btn btn-sm" onClick={add} disabled={!date}>
          Add
        </button>
      </div>
      <label className="row" style={{ gap: 6, margin: '8px 0 0', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={timed}
          onChange={(e) => setTimed(e.target.checked)}
          style={{ width: 'auto' }}
        />
        <span className="small muted">Only part of the day (add a time range)</span>
      </label>
      {timed && (
        <div className="row" style={{ gap: 6, marginTop: 6, alignItems: 'center' }}>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={{ maxWidth: 140 }} />
          <span className="faint">to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={{ maxWidth: 140 }} />
        </div>
      )}
    </div>
  )
}
