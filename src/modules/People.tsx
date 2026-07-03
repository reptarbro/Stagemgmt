import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import type { Person, PersonGroup } from '../lib/types'

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
}

export function People() {
  const { production, addPerson, updatePerson, deletePerson } = useStore()
  const [editing, setEditing] = useState<Person | 'new' | null>(null)
  const [filter, setFilter] = useState<'All' | PersonGroup>('All')
  const [q, setQ] = useState('')

  const people = production?.people ?? []

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
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + Add person
          </button>
        }
      />

      {people.length === 0 ? (
        <EmptyState mark="👥" title="No one on the roster yet">
          Add your cast, crew, and creative team to build your contact sheet.
        </EmptyState>
      ) : (
        <>
          <div className="row wrap mb" style={{ gap: 8 }}>
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
    </>
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
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Allergies, conflicts, etc." />
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
