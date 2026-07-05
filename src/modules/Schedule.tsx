import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar } from '../components/ui'
import { formatDate, formatTime, todayISO, parseISODate } from '../lib/format'
import { formatConflict } from './People'
import { eventsToICS } from '../lib/ics'
import { downloadText, slug } from '../lib/exporters'
import type {
  Attendance,
  AttendanceStatus,
  Conflict,
  EventType,
  Person,
  Scene,
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
  sceneIds: [],
  notes: '',
}

function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd
}

/** Return the conflict a person has against an event (date + optional time overlap), or null. */
export function eventConflict(person: Person, ev: { date: string; callTime?: string; startTime?: string; endTime?: string }): Conflict | null {
  for (const c of person.conflicts ?? []) {
    if (c.date !== ev.date) continue
    if (!c.startTime || !c.endTime) return c // all-day conflict
    const es = ev.startTime || ev.callTime
    const ee = ev.endTime || ev.startTime || ev.callTime
    if (!es || !ee) return c // event has no window → any conflict counts
    if (timeOverlap(c.startTime, c.endTime, es, ee)) return c
  }
  return null
}

export function Schedule() {
  const { production, addEvent, updateEvent, deleteEvent } = useStore()
  const [editing, setEditing] = useState<ScheduleEvent | 'new' | null>(null)
  const [viewing, setViewing] = useState<ScheduleEvent | null>(null)
  const [attendanceFor, setAttendanceFor] = useState<ScheduleEvent | null>(null)
  const [signInFor, setSignInFor] = useState<ScheduleEvent | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const events = production?.events ?? []
  const today = todayISO()

  const nameFor = (id: string) => {
    const p = production?.people.find((x) => x.id === id)
    return p ? p.name : ''
  }

  const exportCalendar = () => {
    if (!production || events.length === 0) return
    downloadText(`${slug(production.title)}-schedule.ics`, eventsToICS(events, production, nameFor), 'text/calendar;charset=utf-8')
  }

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
            {events.length > 0 && (
              <button className="btn btn-sm" onClick={exportCalendar} title="Download .ics for phone calendars">
                ⤓ Calendar
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              + Add Event
            </button>
          </>
        }
      />

      {events.length === 0 ? (
        <EmptyState mark="🗓️" title="Nothing scheduled yet">
          Add rehearsals, tech, and performances with call times, then track who shows up.
        </EmptyState>
      ) : view === 'calendar' ? (
        <CalendarView events={events} today={today} onSelect={setViewing} />
      ) : (
        <>
          <EventGroup
            label="Upcoming"
            events={upcoming}
            onView={setViewing}
            onDelete={deleteEvent}
            onAttendance={setAttendanceFor}
            onSignIn={setSignInFor}
            emptyText="No upcoming events."
          />
          {past.length > 0 && (
            <EventGroup
              label="Past"
              events={past}
              onView={setViewing}
              onDelete={deleteEvent}
              onAttendance={setAttendanceFor}
              onSignIn={setSignInFor}
            />
          )}
        </>
      )}

      {viewing && (
        <EventDetail
          event={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            const e = viewing
            setViewing(null)
            setEditing(e)
          }}
          onAttendance={() => {
            const e = viewing
            setViewing(null)
            setAttendanceFor(e)
          }}
          onSignIn={() => {
            const e = viewing
            setViewing(null)
            setSignInFor(e)
          }}
        />
      )}

      {editing && (
        <EventForm
          initial={editing === 'new' ? undefined : editing}
          people={production?.people ?? []}
          scenes={production?.scenes ?? []}
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

      {signInFor && <SignInSheet event={signInFor} onClose={() => setSignInFor(null)} />}
    </>
  )
}

function EventGroup({
  label,
  events,
  onView,
  onDelete,
  onAttendance,
  onSignIn,
  emptyText,
}: {
  label: string
  events: ScheduleEvent[]
  onView: (e: ScheduleEvent) => void
  onDelete: (id: string) => void
  onAttendance: (e: ScheduleEvent) => void
  onSignIn: (e: ScheduleEvent) => void
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
              onView={() => onView(e)}
              onDelete={() => onDelete(e.id)}
              onAttendance={() => onAttendance(e)}
              onSignIn={() => onSignIn(e)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EventRow({
  event,
  onView,
  onDelete,
  onAttendance,
  onSignIn,
}: {
  event: ScheduleEvent
  onView: () => void
  onDelete: () => void
  onAttendance: () => void
  onSignIn: () => void
}) {
  const { getAttendance, production } = useStore()
  const att = getAttendance(event.id)
  const totalCalled = event.calledPersonIds.length || production?.people.length || 0
  const summary = att ? summarize(att) : null

  const people = production?.people ?? []
  const pool = event.calledPersonIds.length
    ? people.filter((p) => event.calledPersonIds.includes(p.id))
    : people
  const conflicted = pool.filter((p) => eventConflict(p, event))

  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row-between wrap" style={{ gap: 12 }}>
        <div className="row-tap" style={{ minWidth: 200, borderRadius: 8 }} onClick={onView}>
          <div>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge">{event.type}</span>
              <strong className="tcase">{event.title || event.type}</strong>
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
                ⚠️ Conflict: {conflicted.map((p) => p.name).join(', ')} unavailable
              </div>
            )}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <span className="tag">
            {event.calledPersonIds.length
              ? `${event.calledPersonIds.length} called`
              : 'Whole company'}
          </span>
          {summary && (
            <span className="tag" title="Attendance so far">
              {summary.present} present · {summary.late} late · {summary.absent} absent
            </span>
          )}
          <button className="btn btn-sm" onClick={onAttendance}>
            ✓ Attendance
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onSignIn} title="Printable sign-in sheet">
            🖊 Sign-in Sheet
          </button>
          <div className="row-actions">
            <button className="icon-btn" onClick={onView} aria-label="View" title="View">
              👁
            </button>
            <ConfirmButton className="icon-btn danger" onConfirm={onDelete}>🗑</ConfirmButton>
          </div>
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
    noShow: vals.filter((r) => r.status === 'no-show').length,
  }
}

/** Human label for the scenes attached to an event, e.g. "2.1 The Wood, 2.2 The Lovers". */
function sceneLabels(ids: string[] | undefined, scenes: Scene[]): string {
  if (!ids || ids.length === 0) return ''
  return ids
    .map((id) => scenes.find((s) => s.id === id))
    .filter((s): s is Scene => !!s)
    .map((s) => `${s.number}${s.title ? ` ${s.title}` : ''}`)
    .join(', ')
}

// Event-type accents, kept within the brand family for a uniform calendar.
const TYPE_COLOR: Record<EventType, string> = {
  Rehearsal: '#9fb8a6', // sage
  Performance: '#2fae6b', // emerald
  Tech: '#d9a441', // amber
  Meeting: '#6cc3c0', // teal
  Fitting: '#bcc98a', // olive
  Other: '#7f8d82', // muted
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
                  className="cal-chip tcase"
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

function EventDetail({
  event,
  onClose,
  onEdit,
  onAttendance,
  onSignIn,
}: {
  event: ScheduleEvent
  onClose: () => void
  onEdit: () => void
  onAttendance: () => void
  onSignIn: () => void
}) {
  const { production } = useStore()
  const people = production?.people ?? []
  const scenes = production?.scenes ?? []
  const called = event.calledPersonIds.length
    ? people.filter((p) => event.calledPersonIds.includes(p.id))
    : people
  const conflicted = called.filter((p) => eventConflict(p, event))
  const scenesText = sceneLabels(event.sceneIds, scenes)

  return (
    <Modal title={event.title || event.type} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="badge">{event.type}</span>
        {scenesText && <span className="tag">🎬 {scenesText}</span>}
      </div>
      <p className="small" style={{ margin: '0 0 10px' }}>
        {formatDate(event.date)}
        {event.callTime && ` · Call ${formatTime(event.callTime)}`}
        {event.startTime && ` · ${formatTime(event.startTime)}`}
        {event.endTime && `–${formatTime(event.endTime)}`}
        {event.location && ` · ${event.location}`}
      </p>

      <div className="field-label">
        Who's called{' '}
        <span className="faint">({event.calledPersonIds.length ? called.length : 'whole company'})</span>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {called.length === 0 ? '—' : called.map((p) => p.name).join(', ')}
      </p>

      {conflicted.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.35)', padding: '10px 12px', marginBottom: 12 }}>
          <div className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Availability conflicts</div>
          <ul className="list-reset small" style={{ marginTop: 4 }}>
            {conflicted.map((p) => (
              <li key={p.id}>{p.name} — {formatConflict(eventConflict(p, event)!)}</li>
            ))}
          </ul>
        </div>
      )}

      {event.notes && (
        <>
          <div className="field-label">Notes</div>
          <p className="small muted" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{event.notes}</p>
        </>
      )}

      <div className="modal-actions" style={{ flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
        <button className="btn" onClick={onSignIn}>🖊 Sign-in Sheet</button>
        <button className="btn" onClick={onAttendance}>✓ Attendance</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
  )
}

function EventForm({
  initial,
  people,
  scenes,
  onClose,
  onSave,
}: {
  initial?: ScheduleEvent
  people: Person[]
  scenes: Scene[]
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

  const toggleScene = (id: string) =>
    setF((s) => ({
      ...s,
      sceneIds: (s.sceneIds ?? []).includes(id)
        ? (s.sceneIds ?? []).filter((x) => x !== id)
        : [...(s.sceneIds ?? []), id],
    }))

  // Live conflict warnings for the people called against the chosen date/times.
  const pool = f.calledPersonIds.length
    ? people.filter((p) => f.calledPersonIds.includes(p.id))
    : people
  const warnings = pool
    .map((p) => ({ p, c: eventConflict(p, f) }))
    .filter((w): w is { p: Person; c: Conflict } => !!w.c)

  const missing =
    !f.type ||
    !f.title.trim() ||
    !f.date ||
    !f.callTime ||
    !f.startTime ||
    !f.endTime ||
    !(f.location ?? '').trim()

  return (
    <Modal title={initial ? 'Edit Event' : 'Add Event'} onClose={onClose}>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Type <ReqStar /></span>
          <select value={f.type} onChange={set('type')}>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Title <ReqStar /></span>
          <input value={f.title} onChange={set('title')} placeholder="e.g. Act 1 blocking" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Date <ReqStar /></span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label className="field">
          <span className="field-label">Call time <ReqStar /></span>
          <input type="time" value={f.callTime} onChange={set('callTime')} />
        </label>
      </div>
      <div className="form-row-3">
        <label className="field">
          <span className="field-label">Start <ReqStar /></span>
          <input type="time" value={f.startTime} onChange={set('startTime')} />
        </label>
        <label className="field">
          <span className="field-label">End <ReqStar /></span>
          <input type="time" value={f.endTime} onChange={set('endTime')} />
        </label>
        <label className="field">
          <span className="field-label">Location <ReqStar /></span>
          <input value={f.location} onChange={set('location')} placeholder="Rehearsal Rm B" />
        </label>
      </div>

      {scenes.length > 0 && (
        <>
          <div className="field-label">
            Scene(s) worked <span className="faint">(optional — links to Scenes)</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {scenes.map((s) => {
              const on = (f.sceneIds ?? []).includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => toggleScene(s.id)}
                  style={{ borderRadius: 999 }}
                >
                  {on ? '✓ ' : ''}
                  {s.number}
                  {s.title ? ` ${s.title}` : ''}
                </button>
              )
            })}
          </div>
        </>
      )}

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
            const clash = !!eventConflict(p, f)
            return (
              <button
                key={p.id}
                type="button"
                className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => toggle(p.id)}
                style={{ borderRadius: 999 }}
                title={clash ? 'Has a logged conflict on this date/time' : undefined}
              >
                {on ? '✓ ' : ''}
                {p.name}
                {clash ? ' ⚠️' : ''}
              </button>
            )
          })}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.4)', padding: '10px 12px', marginBottom: 14 }}>
          <div className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>
            ⚠️ {warnings.length} availability conflict{warnings.length === 1 ? '' : 's'} for this call
          </div>
          <ul className="list-reset small" style={{ marginTop: 4 }}>
            {warnings.map(({ p, c }) => (
              <li key={p.id}>
                <strong>{p.name}</strong> — {formatConflict(c)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Scenes, focus, reminders…" />
      </label>
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          Type, title, date, call time, start, end &amp; location are all required.
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

const STATUSES: AttendanceStatus[] = ['unmarked', 'present', 'late', 'absent', 'excused', 'no-show']
const STATUS_LABEL: Record<AttendanceStatus, string> = {
  unmarked: '—',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  'no-show': 'No-show',
}

function AttendanceModal({ event, onClose }: { event: ScheduleEvent; onClose: () => void }) {
  const { production, getAttendance, setAttendance } = useStore()
  const called =
    event.calledPersonIds.length > 0
      ? (production?.people ?? []).filter((p) => event.calledPersonIds.includes(p.id))
      : (production?.people ?? [])

  const existing = getAttendance(event.id)
  const [records, setRecords] = useState<Attendance['records']>(existing?.records ?? {})

  const setStatus = (id: string, status: AttendanceStatus) =>
    setRecords((r) => ({ ...r, [id]: { ...r[id], status } }))

  const setAll = (status: AttendanceStatus) =>
    setRecords(() => Object.fromEntries(called.map((p) => [p.id, { status }])))

  const save = () => {
    setAttendance({ eventId: event.id, records })
    onClose()
  }

  const scenesText = sceneLabels(event.sceneIds, production?.scenes ?? [])
  const heading = `Attendance · ${event.title || event.type}${scenesText ? ` — ${scenesText}` : ''}`

  return (
    <Modal title={heading} onClose={onClose}>
      <p className="muted small" style={{ marginTop: 0 }}>
        {formatDate(event.date)} {event.callTime && `· Call ${formatTime(event.callTime)}`}. Choose a
        status for each person.
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
              Clear All
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
                  <select
                    value={status}
                    onChange={(e) => setStatus(p.id, e.target.value as AttendanceStatus)}
                    className={`badge-${status}`}
                    style={{ width: 'auto', minWidth: 120 }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
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

function SignInSheet({ event, onClose }: { event: ScheduleEvent; onClose: () => void }) {
  const { production } = useStore()
  const called =
    event.calledPersonIds.length > 0
      ? (production?.people ?? []).filter((p) => event.calledPersonIds.includes(p.id))
      : (production?.people ?? [])
  const rows = [...called].sort((a, b) => a.name.localeCompare(b.name))

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const print = () => {
    document.body.classList.add('printing-sheet')
    const cleanup = () => {
      document.body.classList.remove('printing-sheet')
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
  }

  // Rendered in a body-level portal so it can be printed alone (see .sheet-print-root CSS).
  return createPortal(
    <div className="sheet-print-root">
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="row-between no-print" style={{ marginBottom: 12 }}>
            <span className="hint">Print or save as PDF, then post at the callboard.</span>
            <button className="btn btn-sm" onClick={print}>
              🖨 Print / PDF
            </button>
          </div>
          <div className="sheet-doc">
            <div style={{ borderBottom: '2px solid var(--accent)', paddingBottom: 8, marginBottom: 10 }}>
              <h2 style={{ margin: 0 }}>{production?.title}</h2>
              <div className="muted small">
                {event.type}
                {event.title ? ` · ${event.title}` : ''} · {formatDate(event.date)}
                {event.callTime && ` · Call ${formatTime(event.callTime)}`}
                {event.location && ` · ${event.location}`}
              </div>
            </div>
            <table className="sheet-table">
              <thead>
                <tr>
                  <th style={{ width: '38%' }}>Name</th>
                  <th>Role / Character</th>
                  <th style={{ width: 90 }}>Time in</th>
                  <th style={{ width: 80 }}>Initials</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">No one called — add people or a call list.</td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="faint">{p.character || p.role || ''}</td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))
                )}
                {rows.length > 0 &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={`blank-${i}`}>
                      <td>&nbsp;</td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="modal-actions no-print">
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
