import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import { newId } from '../lib/storage'
import { formatDateShort } from '../lib/format'
import { contactsCSV, downloadText, slug } from '../lib/exporters'
import type { Conflict, Person, PersonGroup } from '../lib/types'

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

export function People() {
  const { production, addPerson, updatePerson, deletePerson } = useStore()
  const [editing, setEditing] = useState<Person | 'new' | null>(null)
  const [bulk, setBulk] = useState(false)
  const [filter, setFilter] = useState<'All' | PersonGroup>('All')
  const [q, setQ] = useState('')

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
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [people, filter, q])

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
          <div className="row wrap no-print" style={{ gap: 6 }}>
            {people.length > 0 && (
              <>
                <button className="btn btn-sm" onClick={exportCSV} title="Download contact sheet (CSV)">
                  ⤓ CSV
                </button>
                <button className="btn btn-sm btn-ghost" onClick={() => window.print()} title="Print contact sheet">
                  🖨 Print
                </button>
              </>
            )}
            <button className="btn btn-sm" onClick={() => setBulk(true)}>
              ⧉ Paste list
            </button>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add person
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
                {g} {counts[g]}
              </FilterChip>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Group</th>
                  <th>Role / Character</th>
                  <th>Contact</th>
                  <th style={{ width: 90 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.emergencyContactName && (
                        <div className="faint" style={{ fontSize: '0.72rem' }}>
                          ICE: {p.emergencyContactName} {p.emergencyContactPhone}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${p.group}`}>{p.group}</span>
                    </td>
                    <td>
                      <div>{p.role || '—'}</div>
                      {p.character && <div className="faint small">as {p.character}</div>}
                    </td>
                    <td className="small">
                      {p.email && (
                        <div>
                          <a href={`mailto:${p.email}`}>{p.email}</a>
                        </div>
                      )}
                      {p.phone && (
                        <div>
                          <a href={`tel:${p.phone}`}>{p.phone}</a>
                        </div>
                      )}
                      {!p.email && !p.phone && <span className="faint">—</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="icon-btn" onClick={() => setEditing(p)} aria-label="Edit">
                          ✎
                        </button>
                        <ConfirmButton onConfirm={() => deletePerson(p.id)}>🗑</ConfirmButton>
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
    </>
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
    <Modal title="Paste a cast/crew list" onClose={onClose}>
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

  return (
    <Modal title={initial ? 'Edit person' : 'Add person'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Name *</span>
          <input value={f.name} onChange={set('name')} autoFocus />
        </label>
        <label className="field">
          <span className="field-label">Group</span>
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
          <span className="field-label">Role / Position</span>
          <input value={f.role} onChange={set('role')} placeholder="e.g. ASM, Lighting Designer" />
        </label>
        <label className="field">
          <span className="field-label">Character (if cast)</span>
          <input value={f.character} onChange={set('character')} placeholder="e.g. Puck" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Email</span>
          <input type="email" value={f.email} onChange={set('email')} />
        </label>
        <label className="field">
          <span className="field-label">Phone</span>
          <input value={f.phone} onChange={set('phone')} />
        </label>
      </div>
      <div className="divider" />
      <div className="field-label">Emergency contact (ICE)</div>
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

function ConflictsEditor({
  conflicts,
  onChange,
}: {
  conflicts: Conflict[]
  onChange: (list: Conflict[]) => void
}) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  const add = () => {
    if (!date) return
    onChange([...conflicts, { id: newId(), date, note: note.trim() || undefined }])
    setDate('')
    setNote('')
  }
  const remove = (id: string) => onChange(conflicts.filter((c) => c.id !== id))

  const sorted = [...conflicts].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="field-label">
        Availability conflicts{' '}
        <span className="faint">(dates they can't attend — flagged on the schedule)</span>
      </div>
      {sorted.length > 0 && (
        <div className="row wrap" style={{ gap: 6, marginBottom: 10 }}>
          {sorted.map((c) => (
            <span key={c.id} className="tag" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {formatDateShort(c.date)}
              {c.note ? ` · ${c.note}` : ''}
              <button
                type="button"
                className="icon-btn"
                style={{ padding: 0, lineHeight: 1 }}
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
    </div>
  )
}
