import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar } from '../components/ui'
import { term, kindProfile } from '../lib/productionKind'
import type { Person, Scene } from '../lib/types'

const BLANK: Omit<Scene, 'id'> = {
  number: '',
  title: '',
  page: '',
  characterIds: [],
  synopsis: '',
  notes: '',
}

export function Scenes() {
  const { production, addScene, updateScene, deleteScene } = useStore()
  const [editing, setEditing] = useState<Scene | 'new' | null>(null)
  const [viewing, setViewing] = useState<Scene | null>(null)
  const [view, setView] = useState<'list' | 'matrix'>('list')

  const scenes = production?.scenes ?? []
  const profile = kindProfile(production?.kind)
  const { setlist, musicalKeys, unit } = profile
  const charLabel = term(production?.kind, 'character')
  // Only cast are useful as "characters in a scene".
  const cast = useMemo(
    () => (production?.people ?? []).filter((p) => p.group === 'Cast'),
    [production?.people],
  )
  const nameFor = (id: string) => {
    const p = production?.people.find((x) => x.id === id)
    return p ? p.character || p.name : '—'
  }

  return (
    <>
      <PageHead
        title={term(production?.kind, 'scenes')}
        subtitle={
          setlist
            ? `Running order — ${charLabel.toLowerCase()}s${musicalKeys ? ', keys' : ''} & timings`
            : `${term(production?.kind, 'scenes')} & ${charLabel.toLowerCase()} breakdown`
        }
        actions={
          <>
            {scenes.length > 0 && cast.length > 0 && (
              <div className="row" style={{ gap: 4 }}>
                <button
                  className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('list')}
                >
                  List
                </button>
                <button
                  className={`btn btn-sm ${view === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('matrix')}
                >
                  Grid
                </button>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add {unit}
            </button>
          </>
        }
      />

      {scenes.length === 0 ? (
        <EmptyState mark={setlist ? '🎵' : '🎬'} title={`No ${term(production?.kind, 'scenes').toLowerCase()} yet`}>
          {setlist
            ? `Add each ${unit.toLowerCase()} in order — title, who's up${musicalKeys ? ', key' : ''}, and timing. You'll get a clean running order plus a who's-in-what grid.`
            : `Add each scene (or French scene) and mark who's in it. You'll get an instant "who's called for what" grid to build rehearsal calls from.`}
        </EmptyState>
      ) : view === 'matrix' ? (
        <SceneMatrix scenes={scenes} cast={cast} unit={unit} />
      ) : (
        <>
          <p className="hint no-print" style={{ marginTop: -4 }}>
            Tap a scene for its full overview.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scenes.map((s) => (
              <div key={s.id} className="card row-tap" style={{ padding: 14 }} onClick={() => setViewing(s)}>
                <div className="row-between wrap" style={{ gap: 10 }}>
                  <div style={{ minWidth: 200 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge">{s.number || '—'}</span>
                      <strong className="tcase">{s.title || `Untitled ${unit.toLowerCase()}`}</strong>
                      {!setlist && s.page && <span className="tag">p. {s.page}</span>}
                      {musicalKeys && s.key && <span className="tag">key {s.key}</span>}
                      {setlist && s.duration && <span className="tag">{s.duration}</span>}
                    </div>
                    {s.synopsis && (
                      <div className="small muted" style={{ marginTop: 6 }}>
                        {s.synopsis}
                      </div>
                    )}
                    <div className="row wrap" style={{ gap: 5, marginTop: 8 }}>
                      {s.characterIds.length === 0 ? (
                        <span className="faint small">No {charLabel.toLowerCase()}s marked</span>
                      ) : (
                        s.characterIds.map((id) => (
                          <span key={id} className="tag">
                            {nameFor(id)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setEditing(s)} aria-label="Edit" title="Edit">
                      ✎
                    </button>
                    <ConfirmButton className="icon-btn danger" ariaLabel="Delete scene" onConfirm={() => deleteScene(s.id)}>🗑</ConfirmButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {viewing && (
        <SceneDetail
          scene={viewing}
          nameFor={nameFor}
          setlist={setlist}
          musicalKeys={musicalKeys}
          charLabel={charLabel}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const s = viewing
            setViewing(null)
            setEditing(s)
          }}
        />
      )}

      {editing && (
        <SceneForm
          initial={editing === 'new' ? undefined : editing}
          cast={cast}
          setlist={setlist}
          musicalKeys={musicalKeys}
          unit={unit}
          charLabel={charLabel}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addScene(vals)
            else updateScene(editing.id, vals)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function SceneDetail({
  scene,
  nameFor,
  setlist,
  musicalKeys,
  charLabel,
  onClose,
  onEdit,
}: {
  scene: Scene
  nameFor: (id: string) => string
  setlist: boolean
  musicalKeys: boolean
  charLabel: string
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal title={`${scene.number}${scene.title ? ` · ${scene.title}` : ''}`} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="badge">{scene.number || '—'}</span>
        {!setlist && scene.page && <span className="tag">p. {scene.page}</span>}
        {musicalKeys && scene.key && <span className="tag">key {scene.key}</span>}
        {setlist && scene.duration && <span className="tag">{scene.duration}</span>}
      </div>
      {scene.synopsis && (
        <p className="small" style={{ margin: '0 0 10px' }}>{scene.synopsis}</p>
      )}
      <div className="field-label">{setlist ? `${charLabel}s` : 'Characters'} ({scene.characterIds.length})</div>
      <div className="row wrap" style={{ gap: 5, marginBottom: 10 }}>
        {scene.characterIds.length === 0 ? (
          <span className="faint small">None marked</span>
        ) : (
          scene.characterIds.map((id) => (
            <span key={id} className="tag">{nameFor(id)}</span>
          ))
        )}
      </div>
      {scene.notes && (
        <>
          <div className="field-label">Notes</div>
          <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{scene.notes}</p>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
  )
}

function SceneMatrix({ scenes, cast, unit }: { scenes: Scene[]; cast: Person[]; unit: string }) {
  if (cast.length === 0) {
    return <p className="muted small">Add cast members on the People page to build the grid.</p>
  }
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{unit}</th>
            {cast.map((p) => (
              <th key={p.id} style={{ textAlign: 'center' }}>
                {p.character || p.name}
              </th>
            ))}
            <th style={{ textAlign: 'center' }}>#</th>
          </tr>
        </thead>
        <tbody>
          {scenes.map((s) => (
            <tr key={s.id}>
              <td>
                <strong>{s.number || '—'}</strong>
                {s.title && <div className="faint small">{s.title}</div>}
              </td>
              {cast.map((p) => (
                <td key={p.id} style={{ textAlign: 'center' }}>
                  {s.characterIds.includes(p.id) ? (
                    <span style={{ color: 'var(--accent)' }}>●</span>
                  ) : (
                    <span className="faint">·</span>
                  )}
                </td>
              ))}
              <td style={{ textAlign: 'center' }} className="faint">
                {s.characterIds.length}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SceneForm({
  initial,
  cast,
  setlist,
  musicalKeys,
  unit,
  charLabel,
  onClose,
  onSave,
}: {
  initial?: Scene
  cast: Person[]
  setlist: boolean
  musicalKeys: boolean
  unit: string
  charLabel: string
  onClose: () => void
  onSave: (vals: Omit<Scene, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<Scene, 'id'>>({ ...BLANK, ...initial })
  const set =
    (k: keyof Omit<Scene, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  const toggle = (id: string) =>
    setF((s) => ({
      ...s,
      characterIds: s.characterIds.includes(id)
        ? s.characterIds.filter((x) => x !== id)
        : [...s.characterIds, id],
    }))

  // Set lists don't require a performer (an overture or company number may have none).
  const missing = !f.number.trim() || !(f.title ?? '').trim() || (!setlist && f.characterIds.length === 0)

  return (
    <Modal title={`${initial ? 'Edit' : 'Add'} ${unit}`} onClose={onClose}>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">{setlist ? 'Order' : 'Number'} <ReqStar /></span>
          <input value={f.number} onChange={set('number')} placeholder={setlist ? '1' : '1.1'} autoFocus />
        </label>
        <label className="field" style={{ gridColumn: 'span 2' }}>
          <span className="field-label">{setlist ? 'Song / title' : 'Title'} <ReqStar /></span>
          <input value={f.title} onChange={set('title')} placeholder={setlist ? 'Cry Me a River' : 'The tavern'} />
        </label>
      </div>
      {setlist ? (
        <div className="form-row">
          {musicalKeys && (
            <label className="field">
              <span className="field-label">Key</span>
              <input value={f.key ?? ''} onChange={set('key')} placeholder="Am" />
            </label>
          )}
          <label className="field">
            <span className="field-label">Duration</span>
            <input value={f.duration ?? ''} onChange={set('duration')} placeholder="3:10" />
          </label>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">Script page(s)</span>
          <input value={f.page} onChange={set('page')} placeholder="12–15" />
        </label>
      )}

      <div className="field-label">
        {setlist ? `${charLabel}s` : 'Characters'} in this {unit.toLowerCase()} {!setlist && <ReqStar />}{' '}
        <span className="faint">({f.characterIds.length} selected)</span>
      </div>
      {cast.length === 0 ? (
        <p className="hint">Add cast members on the People page first.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {cast.map((p) => {
            const on = f.characterIds.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggle(p.id)}
                style={{ borderRadius: 999 }}
              >
                {on ? '✓ ' : ''}
                {p.character || p.name}
              </button>
            )
          })}
        </div>
      )}

      <label className="field">
        <span className="field-label">Synopsis</span>
        <textarea value={f.synopsis} onChange={set('synopsis')} placeholder="What happens…" />
      </label>
      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Staging, transitions…" />
      </label>
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          {setlist
            ? 'Order and title are required.'
            : 'Number, title & at least one character are required.'}
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
