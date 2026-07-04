import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton } from '../components/ui'
import { formatDate, formatTime, todayISO, parseISODate } from '../lib/format'
import type {
  Attendance,
  AttendanceStatus,
  EventType,
  Person,
  ScheduleEvent,
} from '../lib/types'

const EVENT_TYPES: EventType[] = ['Rehearsal', 'Performance', 'Tech', 'Meeting', 'Fitting', 'Other']

const BLANK: Omit<ScheduleEvent, 'id'> = {
  type: 'Rehearsal',
  title: '',
  date: todayISO(),
  callTime: '',
  startTime: '',
  endTime: '',
  location: '',
  calledPersonIds: [],
  notes: '',
}

export function Schedule() {
  const { production, addEvent, updateEvent, deleteEvent } = useStore()
  const [editing, setEditing] = useState<ScheduleEvent | 'new' | null>(null)
  const [attendanceFor, setAttendanceFor] = useState<ScheduleEvent | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const events = production?.events ?? []
  const today = todayISO()

  const { upcoming, past } = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => a.date.localeCompare(b.date) || (a.callTime ?? '').localeCompare(b.callTime ?? ''),
    )
    return {
      upcoming: sorted.filter((e) => e.date >= today),
      past: sorted.filter((e) => e.date < today).reverse(),
    }
  }, [events, today])

  return (
    <>
      <PageHead
        title="Schedule"
        subtitle="Rehearsals, performances & attendance"
        actions={
          <>
            {events.length > 0 && (
              <div className="row" style={{ gap: 4 }}>
                <button
                  className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('list')}
                >
                  List
                </button>
                <button
                  className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setView('calendar')}
                >
                  Calendar
                </button>
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add event
            </button>
          </>
        }
      />

      {events.length === 0 ? (
        <EmptyState mark="🗓️" title="Nothing scheduled yet">
          Add rehearsals, tech, and performances with call times, then track who shows up.
        </EmptyState>
      ) : view === 'calendar' ? (
        <CalendarView events={events} today={today} onSelect={setEditing} />
      ) : (
        <>
          <EventGroup
            label="Upcoming"
            events={upcoming}
            onEdit={setEditing}
            onDelete={deleteEvent}
            onAttendance={setAttendanceFor}
            emptyText="No upcoming events."
          />
          {past.length > 0 && (
            <EventGroup
              label="Past"
              events={past}
              onEdit={setEditing}
              onDelete={deleteEvent}
              onAttendance={setAttendanceFor}
            />
          )}
        </>
      )}

      {editing && (
        <EventForm
          initial={editing === 'new' ? undefined : editing}
          people={production?.people ?? []}
          onClose={() => setEditing(null)}
          onSave={(vals) => {
            if (editing === 'new') addEvent(vals)
            else updateEvent(editing.id, vals)
            setEditing(null)
          }}
        />
      )}

      {attendanceFor && (
        <AttendanceModal event={attendanceFor} onClose={() => setAttendanceFor(null)} />
      )}
    </>
  )
}

function EventGroup({
  label,
  events,
  onEdit,
  onDelete,
  onAttendance,
  emptyText,
}: {
  label: string
  events: ScheduleEvent[]
  onEdit: (e: ScheduleEvent) => void
  onDelete: (id: string) => void
  onAttendance: (e: ScheduleEvent) => void
  emptyText?: string
}) {
  return (
    <div className="mt">
      <div className="card-title">{label}</div>
      {events.length === 0 ? (
        <p className="muted small">{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              onEdit={() => onEdit(e)}
              onDelete={() => onDelete(e.id)}
              onAttendance={() => onAttendance(e)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({
  event,
  onEdit,
  onDelete,
  onAttendance,
}: {
  event: ScheduleEvent
  onEdit: () => void
  onDelete: () => void
  onAttendance: () => void
}) {
  const { getAttendance, production } = useStore()
  const att = getAttendance(event.id)
  const totalCalled = event.calledPersonIds.length || production?.people.length || 0
  const summary = att ? summarize(att) : null

  // Anyone called for this event who logged a conflict on this date.
  const people = production?.people ?? []
  const pool = event.calledPersonIds.length
    ? people.filter((p) => event.calledPersonIds.includes(p.id))
    : people
  const conflicted = pool.filter((p) => (p.conflicts ?? []).some((c) => c.date === event.date))

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row-between wrap" style={{ gap: 12 }}>
        <div style={{ minWidth: 200 }}>
          <div className="row" style={{ gap: 8 }}>
            <span className="badge">{event.type}</span>
            <strong>{event.title || event.type}</strong>
          </div>
          <div className="faint small" style={{ marginTop: 4 }}>
            {formatDate(event.date)}
            {event.callTime && ` · Call ${formatTime(event.callTime)}`}
            {event.startTime && ` · ${formatTime(event.startTime)}`}
            {event.endTime && `–${formatTime(event.endTime)}`}
            {event.location && ` · ${event.location}`}
          </div>
          {event.notes && <div className="small muted" style={{ marginTop: 6 }}>{event.notes}</div>}
          {conflicted.length > 0 && (
            <div className="small" style={{ marginTop: 6, color: 'var(--danger)' }}>
              ⚠ Conflict: {conflicted.map((p) => p.name).join(', ')} unavailable this date
            </div>
          )}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tag">
            {event.calledPersonIds.length
              ? `${event.calledPersonIds.length} called`
              : 'Whole company'}
          </span>
          {summary && (
            <span className="tag" title="Attendance">
              ✓ {summary.present} · ⏱ {summary.late} · ✕ {summary.absent}
            </span>
          )}
          <button className="btn btn-sm" onClick={onAttendance}>
            ✓ Attendance
          </button>
          <button className="icon-btn" onClick={onEdit} aria-label="Edit">
            ✎
          </button>
          <ConfirmButton onConfirm={onDelete}>🗑</ConfirmButton>
        </div>
      </div>
      {totalCalled === 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          Add people on the People page to track attendance.
        </div>
      )}
    </div>
  )
}

function summarize(att: Attendance) {
  const vals = Object.values(att.records)
  return {
    present: vals.filter((r) => r.status === 'present').length,
    late: vals.filter((r) => r.status === 'late').length,
    absent: vals.filter((r) => r.status === 'absent').length,
    excused: vals.filter((r) => r.status === 'excused').length,
  }
}

const TYPE_COLOR: Record<EventType, string> = {
  Rehearsal: '#6ba4e0',
  Performance: '#e0b64d',
  Tech: '#c8b0f0',
  Meeting: '#8fdcc4',
  Fitting: '#e9b7d6',
  Other: '#a49fba',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function CalendarView({
  events,
  today,
  onSelect,
}: {
  events: ScheduleEvent[]
  today: string
  onSelect: (e: ScheduleEvent) => void
}) {
  const now = parseISODate(today)!
  const [ym, setYm] = useState<{ y: number; m: number }>({ y: now.getFullYear(), m: now.getMonth() })

  const byDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {}
    for (const e of events) (map[e.date] ??= []).push(e)
    for (const k of Object.keys(map))
      map[k].sort((a, b) => (a.callTime ?? '').localeCompare(b.callTime ?? ''))
    return map
  }, [events])

  const firstWeekday = new Date(ym.y, ym.m, 1).getDay()
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const step = (dir: number) => {
    setYm((s) => {
      const m = s.m + dir
      if (m < 0) return { y: s.y - 1, m: 11 }
      if (m > 11) return { y: s.y + 1, m: 0 }
      return { y: s.y, m }
    })
  }

  return (
    <div className="mt">
      <div className="row-between mb">
        <button className="btn btn-sm btn-ghost" onClick={() => step(-1)}>
          ‹ Prev
        </button>
        <strong>
          {MONTHS[ym.m]} {ym.y}
        </strong>
        <button className="btn btn-sm btn-ghost" onClick={() => step(1)}>
          Next ›
        </button>
      </div>
      <div className="cal-grid cal-head">
        {WEEKDAYS.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="cal-cell cal-empty" />
          const iso = `${ym.y}-${pad(ym.m + 1)}-${pad(day)}`
          const dayEvents = byDate[iso] ?? []
          return (
            <div key={i} className={`cal-cell ${iso === today ? 'cal-today' : ''}`}>
              <div className="cal-date">{day}</div>
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  className="cal-chip"
                  style={{ borderLeftColor: TYPE_COLOR[e.type] }}
                  onClick={() => onSelect(e)}
                  title={`${e.title || e.type}${e.callTime ? ' · Call ' + formatTime(e.callTime) : ''}`}
                >
                  {e.callTime ? formatTime(e.callTime).replace(':00', '') + ' ' : ''}
                  {e.title || e.type}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EventForm({
  initial,
  people,
  onClose,
  onSave,
}: {
  initial?: ScheduleEvent
  people: Person[]
  onClose: () => void
  onSave: (vals: Omit<ScheduleEvent, 'id'>) => void
}) {
  const [f, setF] = useState<Omit<ScheduleEvent, 'id'>>({ ...BLANK, ...initial })
  const set =
    (k: keyof Omit<ScheduleEvent, 'id'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((s) => ({ ...s, [k]: e.target.value }))

  const toggle = (id: string) =>
    setF((s) => ({
      ...s,
      calledPersonIds: s.calledPersonIds.includes(id)
        ? s.calledPersonIds.filter((x) => x !== id)
        : [...s.calledPersonIds, id],
    }))

  return (
    <Modal title={initial ? 'Edit event' : 'Add event'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Type</span>
          <select value={f.type} onChange={set('type')}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Title</span>
          <input value={f.title} onChange={set('title')} placeholder="e.g. Act 1 blocking" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Date *</span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label className="field">
          <span className="field-label">Call time</span>
          <input type="time" value={f.callTime} onChange={set('callTime')} />
        </label>
      </div>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">Start</span>
          <input type="time" value={f.startTime} onChange={set('startTime')} />
        </label>
        <label className="field">
          <span className="field-label">End</span>
          <input type="time" value={f.endTime} onChange={set('endTime')} />
        </label>
        <label className="field">
          <span className="field-label">Location</span>
          <input value={f.location} onChange={set('location')} placeholder="Rehearsal Rm B" />
        </label>
      </div>

      <div className="field-label">
        Who's called{' '}
        <span className="faint">
          ({f.calledPersonIds.length ? `${f.calledPersonIds.length} selected` : 'none = whole company'})
        </span>
      </div>
      {people.length === 0 ? (
        <p className="hint">Add people first to build a call list.</p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            maxHeight: 160,
            overflowY: 'auto',
            marginBottom: 14,
          }}
        >
          {people.map((p) => {
            const on = f.calledPersonIds.includes(p.id)
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
        <textarea value={f.notes} onChange={set('notes')} placeholder="Scenes, focus, reminders…" />
      </label>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!f.date} onClick={() => onSave(f)}>
          Save
        </button>
      </div>
    </Modal>
  )
}

const STATUS_CYCLE: AttendanceStatus[] = ['unmarked', 'present', 'late', 'absent', 'excused']
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  unmarked: '—',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
}

function AttendanceModal({ event, onClose }: { event: ScheduleEvent; onClose: () => void }) {
  const { production, getAttendance, setAttendance } = useStore()
  const called =
    event.calledPersonIds.length > 0
      ? (production?.people ?? []).filter((p) => event.calledPersonIds.includes(p.id))
      : (production?.people ?? [])

  const existing = getAttendance(event.id)
  const [records, setRecords] = useState<Attendance['records']>(existing?.records ?? {})

  const cycle = (id: string) => {
    const cur = records[id]?.status ?? 'unmarked'
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length]
    setRecords((r) => ({ ...r, [id]: { ...r[id], status: next } }))
  }

  const setAll = (status: AttendanceStatus) =>
    setRecords(() => Object.fromEntries(called.map((p) => [p.id, { status }])))

  const save = () => {
    setAttendance({ eventId: event.id, records })
    onClose()
  }

  return (
    <Modal title={`Attendance · ${event.title || event.type}`} onClose={onClose}>
      <p className="muted small" style={{ marginTop: 0 }}>
        {formatDate(event.date)} {event.callTime && `· Call ${formatTime(event.callTime)}`}. Tap a
        status to cycle it.
      </p>
      {called.length === 0 ? (
        <p className="hint">No one is called for this event yet.</p>
      ) : (
        <>
          <div className="row wrap mb" style={{ gap: 6 }}>
            <button className="btn btn-sm" onClick={() => setAll('present')}>
              Mark all present
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setRecords({})}>
              Clear
            </button>
          </div>
          <ul className="list-reset">
            {called.map((p) => {
              const status = records[p.id]?.status ?? 'unmarked'
              return (
                <li
                  key={p.id}
                  className="row-between"
                  style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}
                >
                  <div>
                    <div style={{ fontWeight: 550 }}>{p.name}</div>
                    <div className="faint small">{p.character || p.role}</div>
                  </div>
                  <button
                    className={`btn btn-sm badge-${status}`}
                    onClick={() => cycle(p.id)}
                    style={{ minWidth: 96, justifyContent: 'center' }}
                  >
                    {STATUS_LABEL[status]}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={save}>
          Save attendance
        </button>
      </div>
    </Modal>
  )
}
