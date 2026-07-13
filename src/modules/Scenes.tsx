import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar } from '../components/ui'
import { term, kindProfile } from '../lib/productionKind'
import type { Person, Scene } from '../lib/types'

/** Split a scene "number" into numeric + text chunks for natural ordering,
    so "2.1" sorts after "1.10" and renumbering to 100 drops it to the bottom. */
function sceneKey(n: string): (number | string)[] {
  return (n.match(/\d+|\D+/g) ?? []).map((p) => (/^\d+$/.test(p) ? Number(p) : p.toLowerCase()))
}
function compareScenes(a: Scene, b: Scene): number {
  const ka = sceneKey(a.number)
  const kb = sceneKey(b.number)
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const x = ka[i]
    const y = kb[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (typeof x === 'number' && typeof y === 'number') {
      if (x !== y) return x - y
    } else if (String(x) !== String(y)) {
      return String(x) < String(y) ? -1 : 1
    }
  }
  return 0
}

const ACT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten']
/** The act a scene belongs to, derived from its number: "1.3" / "2-1" → "1"/"2".
    A flat number like "7" has no act (returns null → flat grid). */
function actOf(number: string): string | null {
  const m = number.trim().match(/^(\d+)\s*[.:–\-]/)
  return m ? m[1] : null
}
function actLabel(act: string): string {
  const n = Number(act)
  return ACT_WORDS[n] ? `Act ${ACT_WORDS[n]}` : `Act ${act}`
}
/** Compact initials for a scene tile chip, e.g. "Robin Okafor" → "RO". */
function initialsOf(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const BLANK: Omit<Scene, 'id'> = {
  number: '',
  title: '',
  page: '',
  characterIds: [],
  synopsis: '',
  notes: '',
}

export function Scenes() {
  const { production, addScene, updateScene, deleteScene, updateProduction } = useStore()
  const [editing, setEditing] = useState<Scene | 'new' | null>(null)
  const [viewing, setViewing] = useState<Scene | null>(null)
  const profile = kindProfile(production?.kind)
  const { setlist, musicalKeys, unit } = profile
  // Plays default to the Board (matrix + tappable scene grid); set lists keep
  // their running-order list, with the matrix as the alternate.
  const [view, setView] = useState<'board' | 'list' | 'matrix'>(setlist ? 'list' : 'board')
  const [filterChar, setFilterChar] = useState<string | null>(null)

  // Board grid honors the stored array order (so drag/reorder sticks); the
  // list & matrix show numeric order for a stable reference.
  const rawScenes = production?.scenes ?? []
  const scenes = useMemo(() => [...(production?.scenes ?? [])].sort(compareScenes), [production?.scenes])
  const charLabel = term(production?.kind, 'character')

  // Reorder within the board: move a scene one slot up/down among its act peers.
  const moveScene = (id: string, dir: -1 | 1) => {
    if (!production) return
    const arr = [...(production.scenes ?? [])]
    const i = arr.findIndex((s) => s.id === id)
    if (i < 0) return
    const act = actOf(arr[i].number)
    let j = i + dir
    while (j >= 0 && j < arr.length && actOf(arr[j].number) !== act) j += dir
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    updateProduction(production.id, { scenes: arr })
  }
  // Drag-drop (desktop): drop `dragId` onto `targetId`, reordering the array.
  const dropScene = (dragId: string, targetId: string) => {
    if (!production || dragId === targetId) return
    const arr = [...(production.scenes ?? [])]
    const from = arr.findIndex((s) => s.id === dragId)
    const to = arr.findIndex((s) => s.id === targetId)
    if (from < 0 || to < 0) return
    const [moved] = arr.splice(from, 1)
    arr.splice(arr.findIndex((s) => s.id === targetId) + (to > from ? 1 : 0), 0, moved)
    updateProduction(production.id, { scenes: arr })
  }
  const sortByNumber = () => {
    if (!production) return
    updateProduction(production.id, { scenes: [...(production.scenes ?? [])].sort(compareScenes) })
  }
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
            ? `Running Order — ${charLabel.toLowerCase()}s${musicalKeys ? ', keys' : ''} & timings`
            : `${term(production?.kind, 'scenes')} & ${charLabel.toLowerCase()} breakdown`
        }
        actions={
          <>
            {scenes.length > 0 && cast.length > 0 && (
              <div className="row" style={{ gap: 4 }}>
                {!setlist && (
                  <button
                    className={`btn btn-sm ${view === 'board' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setView('board')}
                  >
                    Board
                  </button>
                )}
                <button
                  className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('list')}
                >
                  List
                </button>
                {setlist && (
                  <button
                    className={`btn btn-sm ${view === 'matrix' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setView('matrix')}
                  >
                    Grid
                  </button>
                )}
              </div>
            )}
            {view === 'board' && scenes.length > 1 && (
              <button className="btn btn-sm btn-ghost" onClick={sortByNumber} title="Reset the board to numeric order">
                ↕ Sort by number
              </button>
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
            : `Add each ${unit.toLowerCase()} and mark who's in it. You'll get an instant "who's called for what" grid to build rehearsal calls from.`}
        </EmptyState>
      ) : view === 'board' ? (
        <SceneBoard
          scenes={rawScenes}
          cast={cast}
          unit={unit}
          charLabel={charLabel}
          nameFor={nameFor}
          filterChar={filterChar}
          setFilterChar={setFilterChar}
          onView={setViewing}
          onMove={moveScene}
          onDrop={dropScene}
        />
      ) : view === 'matrix' ? (
        <SceneMatrix scenes={scenes.filter((s) => !s.patter)} cast={cast} unit={unit} />
      ) : (
        <>
          <p className="hint no-print" style={{ marginTop: -4 }}>
            Tap a {unit.toLowerCase()} for its full overview.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scenes.map((s) => (
              <div
                key={s.id}
                className="card row-tap"
                style={{ padding: 14, borderLeft: s.patter ? '3px solid var(--muted)' : undefined }}
                onClick={() => setViewing(s)}
              >
                <div className="row-between wrap" style={{ gap: 10 }}>
                  <div style={{ minWidth: 200 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge">{s.number || '—'}</span>
                      <strong className={s.patter ? 'muted' : 'tcase'} style={s.patter ? { fontStyle: 'italic', fontWeight: 500 } : undefined}>
                        {s.title || `Untitled ${unit.toLowerCase()}`}
                      </strong>
                      {s.patter && <span className="tag">🎤 patter</span>}
                      {!setlist && s.page && <span className="tag">p. {s.page}</span>}
                      {musicalKeys && !s.patter && s.key && <span className="tag">key {s.key}</span>}
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
                    <ConfirmButton className="icon-btn danger" ariaLabel={`Delete ${unit.toLowerCase()}`} onConfirm={() => deleteScene(s.id)}>🗑</ConfirmButton>
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
        {scene.patter && <span className="tag">🎤 patter</span>}
        {!setlist && scene.page && <span className="tag">p. {scene.page}</span>}
        {musicalKeys && !scene.patter && scene.key && <span className="tag">key {scene.key}</span>}
        {setlist && scene.duration && <span className="tag">{scene.duration}</span>}
      </div>
      {scene.synopsis && (
        <p className="small" style={{ margin: '0 0 10px' }}>{scene.synopsis}</p>
      )}
      <div className="field-label">{charLabel}s ({scene.characterIds.length})</div>
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

function SceneMatrix({
  scenes,
  cast,
  unit,
  activeChar,
  onToggleChar,
}: {
  scenes: Scene[]
  cast: Person[]
  unit: string
  /** When set, the board is filtered to this character; the column is lit. */
  activeChar?: string | null
  /** Tapping a character header toggles the board filter (board mode only). */
  onToggleChar?: (id: string) => void
}) {
  if (cast.length === 0) {
    return <p className="muted small">Add cast members on the People page to build the grid.</p>
  }
  return (
    <div className="table-wrap scene-matrix">
      <table>
        <thead>
          <tr>
            <th>{unit}</th>
            {cast.map((p) => {
              const on = activeChar === p.id
              return (
                <th
                  key={p.id}
                  className={onToggleChar ? `scene-matrix-h ${on ? 'active' : ''}` : undefined}
                  style={{ textAlign: 'center', cursor: onToggleChar ? 'pointer' : undefined }}
                  onClick={onToggleChar ? () => onToggleChar(p.id) : undefined}
                  title={onToggleChar ? `Show only ${p.character || p.name}'s ${unit.toLowerCase()}s` : undefined}
                >
                  {p.character || p.name}
                </th>
              )
            })}
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
                <td key={p.id} style={{ textAlign: 'center', background: activeChar === p.id ? 'rgba(87,185,138,.08)' : undefined }}>
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

/** The scene board: a condensed who's-in matrix on top, then a grid of tappable
    scene squares grouped by act (derived from the number) — reorderable. */
function SceneBoard({
  scenes,
  cast,
  unit,
  charLabel,
  nameFor,
  filterChar,
  setFilterChar,
  onView,
  onMove,
  onDrop,
}: {
  scenes: Scene[]
  cast: Person[]
  unit: string
  charLabel: string
  nameFor: (id: string) => string
  filterChar: string | null
  setFilterChar: (id: string | null) => void
  onView: (s: Scene) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDrop: (dragId: string, targetId: string) => void
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const shown = filterChar ? scenes.filter((s) => s.characterIds.includes(filterChar)) : scenes

  // Group by act when the numbers imply acts; otherwise one flat grid.
  const derivable = scenes.some((s) => actOf(s.number) !== null)
  const groups: { key: string; label: string; items: Scene[] }[] = []
  if (derivable) {
    const map = new Map<string, Scene[]>()
    for (const s of shown) {
      const a = actOf(s.number) ?? '~'
      if (!map.has(a)) map.set(a, [])
      map.get(a)!.push(s)
    }
    for (const k of [...map.keys()].sort((a, b) => (a === '~' ? 1 : b === '~' ? -1 : Number(a) - Number(b)))) {
      groups.push({ key: k, label: k === '~' ? 'Other' : actLabel(k), items: map.get(k)! })
    }
  } else {
    groups.push({ key: 'all', label: '', items: shown })
  }

  const activeName = filterChar ? nameFor(filterChar) : ''

  return (
    <>
      <SceneMatrix
        scenes={scenes.filter((s) => !s.patter)}
        cast={cast}
        unit={unit}
        activeChar={filterChar}
        onToggleChar={(id) => setFilterChar(filterChar === id ? null : id)}
      />

      {filterChar ? (
        <div className="row" style={{ gap: 8, margin: '14px 0 2px', alignItems: 'center' }}>
          <span className="small">
            Showing {unit.toLowerCase()}s with <strong>{activeName}</strong>
          </span>
          <button className="btn btn-sm btn-ghost" onClick={() => setFilterChar(null)}>✕ Clear</button>
        </div>
      ) : (
        <p className="hint no-print" style={{ margin: '14px 0 2px' }}>
          Tap a {unit.toLowerCase()} to open it · tap a name above to filter · drag or use ↑↓ to reorder.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key} style={{ marginTop: 14 }}>
          {g.label && <div className="scene-act">{g.label}</div>}
          {g.items.length === 0 ? (
            <p className="faint small">No {unit.toLowerCase()}s.</p>
          ) : (
            <div className="scene-grid">
              {g.items.map((s) => (
                <SceneTile
                  key={s.id}
                  scene={s}
                  charLabel={charLabel}
                  nameFor={nameFor}
                  dragging={dragId === s.id}
                  onView={() => onView(s)}
                  onMoveUp={() => onMove(s.id, -1)}
                  onMoveDown={() => onMove(s.id, 1)}
                  onDragStart={() => setDragId(s.id)}
                  onDragEnd={() => setDragId(null)}
                  onDropHere={() => {
                    if (dragId) onDrop(dragId, s.id)
                    setDragId(null)
                  }}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </>
  )
}

function SceneTile({
  scene,
  charLabel,
  nameFor,
  dragging,
  onView,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDropHere,
}: {
  scene: Scene
  charLabel: string
  nameFor: (id: string) => string
  dragging: boolean
  onView: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onDropHere: () => void
}) {
  const count = scene.characterIds.length
  const initials = scene.characterIds.slice(0, 6).map((id) => initialsOf(nameFor(id)))
  const extra = count - initials.length
  const meta = scene.page ? `p. ${scene.page}` : scene.duration ? scene.duration : ''
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <div
      className={`scene-tile ${dragging ? 'dragging' : ''}`}
      onClick={onView}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        onDropHere()
      }}
    >
      <div className="scene-tile-head">
        <span className="scene-num">{scene.number || '—'}</span>
        <span className="scene-count" title={`${count} ${charLabel.toLowerCase()}${count === 1 ? '' : 's'}`}>
          {count === 0 ? <span className="scene-attention" title={`No ${charLabel.toLowerCase()}s marked`} /> : count}
        </span>
      </div>
      <div className="scene-tile-title tcase">{scene.title || 'Untitled'}</div>
      {meta && <div className="scene-tile-meta">{meta}</div>}
      <div className="scene-inits">
        {initials.map((ini, i) => (
          <span key={i} className="scene-init">{ini}</span>
        ))}
        {extra > 0 && <span className="scene-init more">+{extra}</span>}
      </div>
      <div className="scene-reorder no-print" onClick={stop}>
        <button className="icon-btn" aria-label="Move earlier" onClick={onMoveUp}>↑</button>
        <button className="icon-btn" aria-label="Move later" onClick={onMoveDown}>↓</button>
      </div>
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
    <Modal title={`${initial ? 'Edit' : 'Add'} ${f.patter ? 'patter' : unit}`} onClose={onClose}>
      {setlist && (
        <div className="row" style={{ gap: 6, marginBottom: 12 }}>
          <button
            type="button"
            className={`btn btn-sm ${!f.patter ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 999 }}
            onClick={() => setF((s) => ({ ...s, patter: false }))}
          >
            🎵 {unit}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${f.patter ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 999 }}
            onClick={() => setF((s) => ({ ...s, patter: true }))}
          >
            🎤 Patter
          </button>
        </div>
      )}
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">{setlist ? 'Order' : 'Number'} <ReqStar /></span>
          <input value={f.number} onChange={set('number')} placeholder={setlist ? '1' : '1.1'} autoFocus />
        </label>
        <label className="field" style={{ gridColumn: 'span 2' }}>
          <span className="field-label">
            {f.patter ? 'Patter / bit' : setlist ? 'Song / title' : 'Title'} <ReqStar />
          </span>
          <input
            value={f.title}
            onChange={set('title')}
            placeholder={f.patter ? 'Intro banter' : setlist ? 'Cry Me a River' : 'The tavern'}
          />
        </label>
      </div>
      {setlist ? (
        <div className="form-row">
          {musicalKeys && !f.patter && (
            <label className="field">
              <span className="field-label">Key</span>
              <input value={f.key ?? ''} onChange={set('key')} placeholder="Am" />
            </label>
          )}
          <label className="field">
            <span className="field-label">Duration</span>
            <input value={f.duration ?? ''} onChange={set('duration')} placeholder={f.patter ? '1:30' : '3:10'} />
          </label>
        </div>
      ) : (
        <label className="field">
          <span className="field-label">Script page(s)</span>
          <input value={f.page} onChange={set('page')} placeholder="12–15" />
        </label>
      )}

      <div className="field-label">
        {charLabel}s in this {unit.toLowerCase()} {!setlist && <ReqStar />}{' '}
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
                <span style={{ display: 'inline-block', width: '0.8em', marginRight: 3 }}>{on ? '✓' : ''}</span>
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
            : `Number, title & at least one ${charLabel.toLowerCase()} are required.`}
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
