import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import { formatDate, todayISO } from '../lib/format'
import { newId } from '../lib/storage'
import type { Report, ReportSection, ReportType } from '../lib/types'

/** Standard departments a rehearsal report usually addresses. */
const DEFAULT_SECTIONS = [
  'Scenic / Props',
  'Costumes',
  'Lighting',
  'Sound',
  'Stage Management',
  'General Notes',
]

function blankSections(): ReportSection[] {
  return DEFAULT_SECTIONS.map((title) => ({ id: newId(), title, notes: [] }))
}

export function Reports() {
  const { production, addReport, updateReport, deleteReport } = useStore()
  const [editing, setEditing] = useState<Report | 'new' | null>(null)
  const [viewing, setViewing] = useState<Report | null>(null)

  const reports = useMemo(
    () => [...(production?.reports ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [production?.reports],
  )

  return (
    <>
      <PageHead
        title="Reports"
        subtitle="Rehearsal & performance reports"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + New report
          </button>
        }
      />

      {reports.length === 0 ? (
        <EmptyState mark="📋" title="No reports yet">
          File a rehearsal or performance report to keep a record and share with your team.
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reports.map((r) => {
            const noteCount = r.sections.reduce((n, s) => n + s.notes.length, 0)
            return (
              <div key={r.id} className="card" style={{ padding: 14 }}>
                <div className="row-between wrap" style={{ gap: 10 }}>
                  <div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="badge">{r.type}</span>
                      <strong>{formatDate(r.date)}</strong>
                    </div>
                    <div className="faint small" style={{ marginTop: 4 }}>
                      {noteCount} note{noteCount === 1 ? '' : 's'}
                      {r.summary && ` · ${r.summary.slice(0, 80)}${r.summary.length > 80 ? '…' : ''}`}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => setViewing(r)}>
                      View
                    </button>
                    <button className="icon-btn" onClick={() => setEditing(r)} aria-label="Edit">
                      ✎
                    </button>
                    <ConfirmButton onConfirm={() => deleteReport(r.id)}>🗑</ConfirmButton>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <ReportEditor
          initial={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addReport(vals)
            else updateReport(editing.id, vals)
            setEditing(null)
          }}
        />
      )}

      {viewing && <ReportViewer report={viewing} onClose={() => setViewing(null)} />}
    </>
  )
}

type EditorState = Omit<Report, 'id' | 'createdAt'>

function ReportEditor({
  initial,
  onClose,
  onSave,
}: {
  initial?: Report
  onClose: () => void
  onSave: (vals: EditorState) => void
}) {
  const { production } = useStore()
  const [f, setF] = useState<EditorState>(
    initial
      ? {
          type: initial.type,
          date: initial.date,
          eventId: initial.eventId,
          summary: initial.summary,
          workedOn: initial.workedOn,
          sections: initial.sections,
          scheduleNote: initial.scheduleNote,
        }
      : {
          type: 'Rehearsal',
          date: todayISO(),
          summary: '',
          workedOn: '',
          sections: blankSections(),
          scheduleNote: '',
        },
  )

  const eventsOnDate = (production?.events ?? []).filter((e) => e.date === f.date)

  const setField = <K extends keyof EditorState>(k: K, v: EditorState[K]) =>
    setF((s) => ({ ...s, [k]: v }))

  const setSection = (id: string, patch: Partial<ReportSection>) =>
    setF((s) => ({
      ...s,
      sections: s.sections.map((sec) => (sec.id === id ? { ...sec, ...patch } : sec)),
    }))

  const addNote = (sectionId: string, text: string) => {
    if (!text.trim()) return
    setF((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, notes: [...sec.notes, { id: newId(), text: text.trim() }] }
          : sec,
      ),
    }))
  }

  const removeNote = (sectionId: string, noteId: string) =>
    setF((s) => ({
      ...s,
      sections: s.sections.map((sec) =>
        sec.id === sectionId
          ? { ...sec, notes: sec.notes.filter((n) => n.id !== noteId) }
          : sec,
      ),
    }))

  const addSection = () =>
    setF((s) => ({
      ...s,
      sections: [...s.sections, { id: newId(), title: 'New section', notes: [] }],
    }))

  const removeSection = (id: string) =>
    setF((s) => ({ ...s, sections: s.sections.filter((sec) => sec.id !== id) }))

  return (
    <Modal title={initial ? 'Edit report' : 'New report'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Type</span>
          <select
            value={f.type}
            onChange={(e) => setField('type', e.target.value as ReportType)}
          >
            <option value="Rehearsal">Rehearsal</option>
            <option value="Performance">Performance</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Date *</span>
          <input type="date" value={f.date} onChange={(e) => setField('date', e.target.value)} />
        </label>
      </div>

      {eventsOnDate.length > 0 && (
        <label className="field">
          <span className="field-label">Link to event (optional)</span>
          <select
            value={f.eventId ?? ''}
            onChange={(e) => setField('eventId', e.target.value || undefined)}
          >
            <option value="">— none —</option>
            {eventsOnDate.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title || e.type}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span className="field-label">Summary</span>
        <textarea
          value={f.summary}
          onChange={(e) => setField('summary', e.target.value)}
          placeholder="Overview of the day…"
        />
      </label>
      <label className="field">
        <span className="field-label">Worked on / Timing</span>
        <textarea
          value={f.workedOn}
          onChange={(e) => setField('workedOn', e.target.value)}
          placeholder="Scenes rehearsed, running time, breaks taken…"
        />
      </label>

      <div className="divider" />
      <div className="row-between mb">
        <div className="field-label" style={{ margin: 0 }}>
          Department notes
        </div>
        <button className="btn btn-sm btn-ghost" onClick={addSection}>
          + Section
        </button>
      </div>

      {f.sections.map((sec) => (
        <SectionEditor
          key={sec.id}
          section={sec}
          onRename={(title) => setSection(sec.id, { title })}
          onAddNote={(text) => addNote(sec.id, text)}
          onRemoveNote={(noteId) => removeNote(sec.id, noteId)}
          onRemove={() => removeSection(sec.id)}
        />
      ))}

      <label className="field mt">
        <span className="field-label">Schedule / Next call</span>
        <textarea
          value={f.scheduleNote}
          onChange={(e) => setField('scheduleNote', e.target.value)}
          placeholder="Tomorrow's call, upcoming deadlines…"
        />
      </label>

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!f.date} onClick={() => onSave(f)}>
          Save report
        </button>
      </div>
    </Modal>
  )
}

function SectionEditor({
  section,
  onRename,
  onAddNote,
  onRemoveNote,
  onRemove,
}: {
  section: ReportSection
  onRename: (title: string) => void
  onAddNote: (text: string) => void
  onRemoveNote: (noteId: string) => void
  onRemove: () => void
}) {
  const [draft, setDraft] = useState('')
  const commit = () => {
    onAddNote(draft)
    setDraft('')
  }

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: 12,
        marginBottom: 10,
      }}
    >
      <div className="row" style={{ gap: 6, marginBottom: 8 }}>
        <input
          value={section.title}
          onChange={(e) => onRename(e.target.value)}
          style={{ fontWeight: 600 }}
        />
        <button className="icon-btn" onClick={onRemove} aria-label="Remove section">
          ✕
        </button>
      </div>
      {section.notes.length > 0 && (
        <ul className="list-reset" style={{ marginBottom: 8 }}>
          {section.notes.map((n) => (
            <li key={n.id} className="row-between" style={{ padding: '4px 0' }}>
              <span className="small">• {n.text}</span>
              <button className="icon-btn" onClick={() => onRemoveNote(n.id)} aria-label="Remove note">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row" style={{ gap: 6 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            }
          }}
          placeholder="Add a note, press Enter…"
        />
        <button className="btn btn-sm" onClick={commit} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}

function ReportViewer({ report, onClose }: { report: Report; onClose: () => void }) {
  const { production } = useStore()
  const sectionsWithNotes = report.sections.filter((s) => s.notes.length > 0)

  return (
    <Modal title={`${report.type} Report`} onClose={onClose}>
      <div className="report-doc">
        <div className="row-between no-print mb">
          <span className="hint">Ready to distribute</span>
          <button className="btn btn-sm" onClick={() => window.print()}>
            🖨 Print / PDF
          </button>
        </div>

        <div style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 10, marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>{production?.title}</h2>
          <div className="muted small">
            {report.type} Report · {formatDate(report.date)}
          </div>
          {production?.company && <div className="faint small">{production.company}</div>}
        </div>

        {report.summary && (
          <Block title="Summary">
            <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {report.summary}
            </p>
          </Block>
        )}
        {report.workedOn && (
          <Block title="Worked On / Timing">
            <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {report.workedOn}
            </p>
          </Block>
        )}

        {sectionsWithNotes.map((s) => (
          <Block key={s.id} title={s.title}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {s.notes.map((n) => (
                <li key={n.id} className="small" style={{ marginBottom: 3 }}>
                  {n.text}
                </li>
              ))}
            </ul>
          </Block>
        ))}

        {report.scheduleNote && (
          <Block title="Schedule / Next Call">
            <p className="small" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {report.scheduleNote}
            </p>
          </Block>
        )}

        {!report.summary &&
          !report.workedOn &&
          sectionsWithNotes.length === 0 &&
          !report.scheduleNote && <p className="muted small">This report is empty.</p>}
      </div>

      <div className="modal-actions no-print">
        <button className="btn btn-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: '0.74rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--accent-warm)',
          fontWeight: 700,
          marginBottom: 5,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}
