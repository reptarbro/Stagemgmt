import { useMemo, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import { formatDate } from '../lib/format'
import type { Asset, AssetCategory, Person } from '../lib/types'

const CATEGORIES: AssetCategory[] = [
  'Headshot',
  'Contract',
  'Budget',
  'Design',
  'Document',
  'Photo',
  'Other',
]

const CAT_ICON: Record<AssetCategory, string> = {
  Headshot: '🎭',
  Contract: '📝',
  Budget: '💰',
  Design: '🎨',
  Document: '📄',
  Photo: '🖼️',
  Other: '📎',
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Best-guess category from a freshly picked file, so bulk uploads land somewhere
    sensible; the user can re-file any row afterward. */
function guessCategory(file: File): AssetCategory {
  const t = file.type
  const n = file.name.toLowerCase()
  if (/contract|agreement|nda|release|rider|deal/.test(n)) return 'Contract'
  if (/budget|invoice|expense|finance|payroll|receipt/.test(n)) return 'Budget'
  if (/headshot|resume|resumé/.test(n)) return 'Headshot'
  if (/rendering|render|design|plate|sketch|ground[-_ ]?plan|elevation/.test(n)) return 'Design'
  if (t.startsWith('image/')) return 'Photo'
  if (t === 'application/pdf' || t.includes('word') || /\.(pdf|docx?|txt|rtf|pages|xlsx?|csv|numbers|key|ppt|pptx)$/.test(n))
    return 'Document'
  return 'Other'
}

export function Assets() {
  const { production, addAsset, updateAsset, getAssetURL, removeAsset } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [filter, setFilter] = useState<'All' | AssetCategory>('All')

  const assets = production?.assets ?? []
  const people = production?.people ?? []
  const nameFor = (id?: string) => (id ? people.find((p) => p.id === id)?.name : undefined)

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of assets) c[a.category] = (c[a.category] ?? 0) + 1
    return c
  }, [assets])

  const totalBytes = useMemo(() => assets.reduce((n, a) => n + (a.size || 0), 0), [assets])

  const filtered = useMemo(
    () =>
      [...assets]
        .filter((a) => (filter === 'All' ? true : a.category === filter))
        .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '')),
    [assets, filter],
  )

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setErr(null)
    setBusy(true)
    let failed = 0
    for (const file of files) {
      try {
        await addAsset(file, { category: guessCategory(file) })
      } catch {
        failed++
      }
    }
    setBusy(false)
    if (failed) {
      setErr(
        `${failed} file${failed > 1 ? 's' : ''} couldn't be saved — the file may be too large for this browser's storage.`,
      )
    }
  }

  const open = async (a: Asset, download: boolean) => {
    const url = await getAssetURL(a.id)
    if (!url) {
      setErr('That file could not be found in this browser.')
      return
    }
    if (download) {
      const el = document.createElement('a')
      el.href = url
      el.download = a.filename
      el.click()
    } else {
      window.open(url, '_blank')
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <>
      <PageHead
        title="Assets"
        subtitle={
          assets.length
            ? `${assets.length} file${assets.length > 1 ? 's' : ''} · ${humanSize(totalBytes)} stored`
            : 'Files kept with this production'
        }
        actions={
          <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : '+ Add files'}
          </button>
        }
      />

      <input ref={fileRef} type="file" multiple onChange={onFiles} style={{ display: 'none' }} />

      {err && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.4)', color: 'var(--danger)' }}>
          {err}
        </div>
      )}

      {assets.length === 0 ? (
        <div className="card">
          <EmptyState mark="📎" title="No files yet">
            Keep the show's supporting files here — headshots, signed contracts, budgets, design
            renderings, riders, anything. They're stored privately on this device, sync to your account
            when you're signed in, and travel in your backups.
          </EmptyState>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Uploading…' : '⬆ Upload files'}
            </button>
            <p className="hint" style={{ marginTop: 10 }}>
              Any file type. Pick several at once — tap a row afterward to file it or link it to a person.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="row wrap mb" style={{ gap: 8 }}>
            <button
              className={`btn btn-sm ${filter === 'All' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter('All')}
              style={{ borderRadius: 999 }}
            >
              All <span className="chip-ct">{assets.length}</span>
            </button>
            {CATEGORIES.filter((c) => counts[c]).map((c) => (
              <button
                key={c}
                className={`btn btn-sm ${filter === c ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(c)}
                style={{ borderRadius: 999 }}
              >
                {CAT_ICON[c]} {c} <span className="chip-ct">{counts[c]}</span>
              </button>
            ))}
          </div>

          <p className="hint no-print" style={{ marginTop: -6 }}>
            Tap ✎ to re-file a document, rename it, add a note, or link it to a person.
          </p>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Category</th>
                  <th>Linked to</th>
                  <th>Size</th>
                  <th>Added</th>
                  <th style={{ width: 150 }} className="no-print"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="row-tap" onClick={() => open(a, false)}>
                    <td>
                      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                        <span aria-hidden="true" style={{ fontSize: '1.3rem', lineHeight: 1.3, flexShrink: 0 }}>
                          {CAT_ICON[a.category]}
                        </span>
                        {/* Bounded width + clamp so long, hyphen/space-free names
                            (e.g. MORGAN-FANNING-headshot.jpeg) don't collapse the
                            column into one-letter-per-line. */}
                        <div style={{ width: 'clamp(140px, 34vw, 340px)' }}>
                          <div
                            title={a.filename}
                            style={{
                              fontWeight: 600,
                              overflowWrap: 'anywhere',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {a.filename}
                          </div>
                          {a.note && (
                            <div
                              className="faint small"
                              title={a.note}
                              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                              {a.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="tag">{a.category}</span>
                    </td>
                    <td className="small">{nameFor(a.personId) || '—'}</td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{humanSize(a.size)}</td>
                    <td className="small" style={{ whiteSpace: 'nowrap' }}>{formatDate(a.uploadedAt)}</td>
                    <td className="no-print">
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" onClick={() => open(a, true)} aria-label="Download" title="Download">
                          ⬇
                        </button>
                        <button className="icon-btn" onClick={() => setEditing(a)} aria-label="Edit details" title="Edit details">
                          ✎
                        </button>
                        <ConfirmButton className="icon-btn danger" ariaLabel="Delete file" onConfirm={() => void removeAsset(a.id)}>
                          🗑
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="hint" style={{ marginTop: 12 }}>
            Stored privately on this device. Signed in, your files sync across your devices; either way
            they're included when you <strong>Export backup</strong> in Settings.
          </p>
        </>
      )}

      {editing && (
        <AssetForm
          asset={editing}
          people={people}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            updateAsset(editing.id, patch)
            setEditing(null)
          }}
        />
      )}
    </>
  )
}

function AssetForm({
  asset,
  people,
  onClose,
  onSave,
}: {
  asset: Asset
  people: Person[]
  onClose: () => void
  onSave: (patch: Pick<Asset, 'filename' | 'category' | 'personId' | 'note'>) => void
}) {
  const [filename, setFilename] = useState(asset.filename)
  const [category, setCategory] = useState<AssetCategory>(asset.category)
  const [personId, setPersonId] = useState<string>(asset.personId ?? '')
  const [note, setNote] = useState(asset.note ?? '')

  const roster = [...people].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <Modal title="File details" onClose={onClose}>
      <label className="field">
        <span className="field-label">Name</span>
        <input value={filename} onChange={(e) => setFilename(e.target.value)} autoFocus />
      </label>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Linked to</span>
          <select value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">— nobody —</option>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="field-label">Note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Signed 6/1, needs counter-signature; final v3; etc."
        />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!filename.trim()}
          onClick={() =>
            onSave({
              filename: filename.trim(),
              category,
              personId: personId || undefined,
              note: note.trim() || undefined,
            })
          }
        >
          Save
        </button>
      </div>
    </Modal>
  )
}
