import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { PageHead, Modal, EmptyState, ConfirmButton, ReqStar } from '../components/ui'
import { PrintSheet } from '../components/PrintSheet'
import { term, kindProfile } from '../lib/productionKind'
import { putFile, getFile, deleteFile, signInKey, newId } from '../lib/storage'
import { formatDate, formatTime, todayISO, parseISODate } from '../lib/format'
import { formatConflict } from './People'
import { eventsToICS } from '../lib/ics'
import { downloadText, slug } from '../lib/exporters'
import type {
  AgendaItem,
  Attendance,
  AttendanceStatus,
  Conflict,
  EventType,
  Person,
  Production,
  Scene,
  ScheduleEvent,
} from '../lib/types'

const EVENT_TYPES: EventType[] = [
  'Rehearsal',
  'Dress Rehearsal',
  'Performance',
  'Tech',
  'Meeting',
  'Fitting',
  'Other',
]

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

/** Does a conflict's date coverage include this event date? Handles a single
    day, an inclusive date range, and a recurring-weekly window. */
export function conflictCoversDate(c: Conflict, evDate: string): boolean {
  if (evDate < c.date) return false
  // End of the window: explicit endDate, else the single day - unless it's an
  // open-ended weekly pattern (no endDate = ongoing).
  const end = c.endDate && c.endDate >= c.date ? c.endDate : c.repeatWeekly ? null : c.date
  if (end && evDate > end) return false
  if (c.repeatWeekly && c.weekdays?.length) {
    const d = parseISODate(evDate)
    return !!d && c.weekdays.includes(d.getDay())
  }
  return true
}

/** Return the conflict a person has against an event (date coverage + optional
    time overlap), or null. */
export function eventConflict(person: Person, ev: { date: string; callTime?: string; startTime?: string; endTime?: string }): Conflict | null {
  for (const c of person.conflicts ?? []) {
    if (!conflictCoversDate(c, ev.date)) continue
    if (!c.startTime || !c.endTime) return c // all-day conflict
    const es = ev.startTime || ev.callTime
    const ee = ev.endTime || ev.startTime || ev.callTime
    if (!es || !ee) return c // event has no window → any conflict counts
    if (timeOverlap(c.startTime, c.endTime, es, ee)) return c
  }
  return null
}

type CalledRef = Pick<ScheduleEvent, 'calledPersonIds' | 'calledAllCast'>
/** The people called for an event: the whole cast (plus any specific crew) when
    calledAllCast is set; otherwise the explicit list, or the whole company when
    nothing is picked. */
function calledPeople(event: CalledRef, people: Person[]): Person[] {
  if (event.calledAllCast) {
    return people.filter((p) => p.group === 'Cast' || event.calledPersonIds.includes(p.id))
  }
  return event.calledPersonIds.length ? people.filter((p) => event.calledPersonIds.includes(p.id)) : people
}
/** Short "who's called" summary for chips/labels. */
function calledSummary(event: CalledRef, people: Person[]): string {
  if (event.calledAllCast) {
    const extra = event.calledPersonIds.filter((id) => people.find((p) => p.id === id)?.group !== 'Cast').length
    return extra ? `all cast + ${extra}` : 'all cast'
  }
  return event.calledPersonIds.length ? `${event.calledPersonIds.length} called` : 'whole company'
}

export function Schedule() {
  const { production, addEvent, updateEvent, deleteEvent } = useStore()
  const [editing, setEditing] = useState<ScheduleEvent | 'new' | null>(null)
  const [viewing, setViewing] = useState<ScheduleEvent | null>(null)
  const [attendanceFor, setAttendanceFor] = useState<ScheduleEvent | null>(null)
  const [signInFor, setSignInFor] = useState<ScheduleEvent | null>(null)
  const [callSheetFor, setCallSheetFor] = useState<ScheduleEvent | null>(null)
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
            today={today}
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
              today={today}
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
          onCallSheet={() => {
            const e = viewing
            setViewing(null)
            setCallSheetFor(e)
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

      {signInFor && (
        <SignInSheet
          event={signInFor}
          isPast={signInFor.date < today}
          onClose={() => setSignInFor(null)}
        />
      )}

      {callSheetFor && production && (
        <CallSheet
          event={callSheetFor}
          production={production}
          called={calledPeople(callSheetFor, production.people)}
          onClose={() => setCallSheetFor(null)}
        />
      )}
    </>
  )
}

function EventGroup({
  label,
  events,
  today,
  onView,
  onDelete,
  onAttendance,
  onSignIn,
  emptyText,
}: {
  label: string
  events: ScheduleEvent[]
  today: string
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
              isPast={e.date < today}
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
  isPast,
  onView,
  onDelete,
  onAttendance,
  onSignIn,
}: {
  event: ScheduleEvent
  isPast: boolean
  onView: () => void
  onDelete: () => void
  onAttendance: () => void
  onSignIn: () => void
}) {
  const { getAttendance, production } = useStore()
  const att = getAttendance(event.id)
  const summary = att ? summarize(att) : null
  const [callSheet, setCallSheet] = useState(false)

  const people = production?.people ?? []
  const pool = calledPeople(event, people)
  const totalCalled = pool.length
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
          <span className="tag tcase">{calledSummary(event, people)}</span>
          {summary && (
            <span className="tag" title="Attendance so far">
              {summary.present} present · {summary.late} late · {summary.absent} absent
            </span>
          )}
          <button className="btn btn-sm" onClick={onAttendance}>
            ✓ Attendance
          </button>
          <button
            className={`btn btn-sm ${isPast && event.signInUploadedAt ? '' : 'btn-ghost'}`}
            onClick={onSignIn}
            title={
              isPast
                ? 'Print a blank sheet, or upload/view the signed one'
                : 'Printable sign-in sheet'
            }
          >
            {isPast
              ? event.signInUploadedAt
                ? '🖊 Sign-in ✓ uploaded'
                : '🖊 Sign-in · Upload'
              : '🖊 Sign-in Sheet'}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => setCallSheet(true)} title="Call sheet - print, save PDF, or email">
            📋 Call Sheet
          </button>
          <button className="btn btn-sm btn-ghost" onClick={onView} title="View details">
            View
          </button>
          <div className="row-actions">
            <ConfirmButton className="icon-btn danger" ariaLabel="Delete event" onConfirm={onDelete}>🗑</ConfirmButton>
          </div>
        </div>
      </div>
      {totalCalled === 0 && (
        <div className="hint" style={{ marginTop: 8 }}>
          Add people on the People page to track attendance.
        </div>
      )}
      {callSheet && production && (
        <CallSheet event={event} production={production} called={pool} onClose={() => setCallSheet(false)} />
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
  Rehearsal: '#5fbf8f', // green
  'Dress Rehearsal': '#33bdb8', // teal
  Performance: '#22b56b', // emerald
  Tech: '#eaa62f', // amber
  Meeting: '#a3c95f', // olive
  Fitting: '#d3b877', // sand
  Other: '#8fa091', // muted
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

  const typesPresent = useMemo(() => {
    const seen = new Set<EventType>()
    for (const e of events) seen.add(e.type)
    return EVENT_TYPES.filter((t) => seen.has(t))
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
      {/* Legend - quick key for what the colors mean. */}
      <div className="cal-legend no-print">
        {typesPresent.map((t) => (
          <span key={t} className="cal-legend-item">
            <span className="cal-swatch" style={{ background: TYPE_COLOR[t] }} />
            {t}
          </span>
        ))}
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
              {dayEvents.map((e) => {
                const start = e.callTime || e.startTime
                const windowText = e.startTime
                  ? `${formatTime(e.startTime)}${e.endTime ? `-${formatTime(e.endTime)}` : ''}`
                  : ''
                const sub = [windowText, e.location].filter(Boolean).join(' · ')
                return (
                  <button
                    key={e.id}
                    className="cal-chip"
                    style={{ borderLeftColor: TYPE_COLOR[e.type], background: `${TYPE_COLOR[e.type]}2b` }}
                    onClick={() => onSelect(e)}
                    title={`${e.type} · ${e.title || ''}${e.callTime ? ' · Call ' + formatTime(e.callTime) : ''}${e.location ? ' · ' + e.location : ''}`}
                  >
                    <span className="cal-chip-main">
                      {start && (
                        <span className="cal-chip-time">{formatTime(start).replace(':00', '')}</span>
                      )}
                      <span className="tcase">{e.title || e.type}</span>
                    </span>
                    {sub && <span className="cal-chip-sub">{sub}</span>}
                  </button>
                )
              })}
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
  onCallSheet,
}: {
  event: ScheduleEvent
  onClose: () => void
  onEdit: () => void
  onAttendance: () => void
  onSignIn: () => void
  onCallSheet: () => void
}) {
  const { production } = useStore()
  const people = production?.people ?? []
  const scenes = production?.scenes ?? []
  const called = calledPeople(event, people)
  const conflicted = called.filter((p) => eventConflict(p, event))
  const scenesText = sceneLabels(event.sceneIds, scenes)

  return (
    <Modal title={event.title || event.type} onClose={onClose}>
      <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
        <span className="badge">{event.type}</span>
        {scenesText && <span className="tag">{kindProfile(production?.kind).setlist ? '🎵' : '🎬'} {scenesText}</span>}
      </div>
      <p className="small" style={{ margin: '0 0 10px' }}>
        {formatDate(event.date)}
        {event.callTime && ` · Call ${formatTime(event.callTime)}`}
        {event.startTime && ` · ${formatTime(event.startTime)}`}
        {event.endTime && `–${formatTime(event.endTime)}`}
        {event.location && ` · ${event.location}`}
      </p>

      {event.agenda && event.agenda.length > 0 && (
        <>
          <div className="field-label">Call times</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '0 0 12px' }}>
            {sortAgenda(event.agenda).map((a) => (
              <div key={a.id} className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                <span className="mono small" style={{ minWidth: 92, flex: 'none', color: 'var(--accent)' }}>
                  {a.time ? formatTime(a.time) : '-'}
                  {a.endTime ? `–${formatTime(a.endTime)}` : ''}
                </span>
                <span className="small">{a.what}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {hasPerPersonCalls(event) && (
        <>
          <div className="field-label">Individual calls</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, margin: '0 0 12px' }}>
            {personCalls(event, called).map((c) => (
              <div key={c.person.id} className="row" style={{ gap: 10, alignItems: 'baseline' }}>
                <span className="mono small" style={{ minWidth: 92, flex: 'none', color: 'var(--accent)' }}>
                  {c.inTime ? formatTime(c.inTime) : '-'}
                  {c.outTime ? `–${formatTime(c.outTime)}` : ''}
                </span>
                <span className="small">{c.person.name}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="field-label">
        Who's called{' '}
        <span className="faint">({calledSummary(event, people)})</span>
      </div>
      <p className="small muted" style={{ marginTop: 0 }}>
        {called.length === 0 ? '-' : called.map((p) => p.name).join(', ')}
      </p>

      {conflicted.length > 0 && (
        <div className="card" style={{ borderColor: 'rgba(229,101,79,.35)', padding: '10px 12px', marginBottom: 12 }}>
          <div className="small" style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️ Availability conflicts</div>
          <ul className="list-reset small" style={{ marginTop: 4 }}>
            {conflicted.map((p) => (
              <li key={p.id}>{p.name} - {formatConflict(eventConflict(p, event)!)}</li>
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
        <button className="btn" onClick={onCallSheet}>📋 Call Sheet</button>
        <button className="btn" onClick={onSignIn}>🖊 Sign-in Sheet</button>
        <button className="btn" onClick={onAttendance}>✓ Attendance</button>
        <button className="btn btn-primary" onClick={onEdit}>✎ Edit</button>
      </div>
    </Modal>
  )
}

/** Sort agenda lines by their time (blank times sink to the bottom). */
function sortAgenda(items: AgendaItem[]): AgendaItem[] {
  return [...items].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
}

function AgendaEditor({
  items,
  people,
  onChange,
}: {
  items: AgendaItem[]
  /** The people who can be assigned to a line (the event's called company). */
  people: Person[]
  onChange: (list: AgendaItem[]) => void
}) {
  const add = () => onChange([...items, { id: newId(), time: '', what: '' }])
  const update = (id: string, patch: Partial<AgendaItem>) =>
    onChange(items.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const remove = (id: string) => onChange(items.filter((a) => a.id !== id))
  const togglePerson = (item: AgendaItem, pid: string) => {
    const cur = item.personIds ?? []
    update(item.id, { personIds: cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid] })
  }
  return (
    <>
      <div className="row-between mb">
        <div className="field-label" style={{ margin: 0 }}>
          Call times / agenda <span className="faint">(optional - the hour-by-hour)</span>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={add}>
          + Time
        </button>
      </div>
      {items.length === 0 ? (
        <p className="hint" style={{ marginTop: 0 }}>
          Add lines like &ldquo;6:15–7:00 · Cast call&rdquo;. Assign people to a line to give them their own
          in/out time - the call sheet then lists each person&rsquo;s individual call.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          {items.map((a) => {
            const assigned = a.personIds ?? []
            return (
              <div
                key={a.id}
                style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}
              >
                <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                  <input
                    type="time"
                    value={a.time}
                    onChange={(e) => update(a.id, { time: e.target.value })}
                    style={{ width: 108, flex: 'none' }}
                    aria-label="In / start time"
                  />
                  <span className="faint">–</span>
                  <input
                    type="time"
                    value={a.endTime ?? ''}
                    onChange={(e) => update(a.id, { endTime: e.target.value || undefined })}
                    style={{ width: 108, flex: 'none' }}
                    aria-label="Out / end time (optional)"
                  />
                  <input
                    value={a.what}
                    onChange={(e) => update(a.id, { what: e.target.value })}
                    placeholder="e.g. Cast call, Fight call, Band"
                    style={{ flex: 1, minWidth: 90 }}
                  />
                  <button type="button" className="icon-btn danger" aria-label="Remove line" onClick={() => remove(a.id)}>
                    🗑
                  </button>
                </div>
                {people.length > 0 && (
                  <div className="row wrap" style={{ gap: 4, marginTop: 8, alignItems: 'center' }}>
                    <span className="hint" style={{ flex: 'none' }}>Called:</span>
                    {people.map((p) => {
                      const on = assigned.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`btn btn-sm ${on ? 'btn-primary' : 'btn-ghost'}`}
                          onClick={() => togglePerson(a, p.id)}
                          style={{ borderRadius: 999, padding: '3px 9px', fontSize: '0.72rem' }}
                        >
                          {on ? '✓ ' : ''}
                          {p.name.split(' ')[0]}
                        </button>
                      )
                    })}
                    {assigned.length === 0 && <span className="hint" style={{ flex: 'none' }}>everyone</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Each called person's individual in/out for an event: the earliest start and
    latest end of the agenda lines they're assigned to, falling back to the
    event's own call/end time when they have no personal lines. */
interface PersonCall {
  person: Person
  inTime?: string
  outTime?: string
}
function personCalls(event: ScheduleEvent, called: Person[]): PersonCall[] {
  const agenda = event.agenda ?? []
  return called.map((p) => {
    const lines = agenda.filter((a) => (a.personIds ?? []).includes(p.id))
    const ins = lines.map((a) => a.time).filter(Boolean).sort()
    const outs = lines.map((a) => a.endTime).filter((t): t is string => !!t).sort()
    return {
      person: p,
      inTime: ins[0] || event.callTime || undefined,
      outTime: outs[outs.length - 1] || event.endTime || undefined,
    }
  })
}
/** True when at least one agenda line assigns specific people (so per-person
    calls are meaningful and worth showing). */
function hasPerPersonCalls(event: ScheduleEvent): boolean {
  return (event.agenda ?? []).some((a) => (a.personIds?.length ?? 0) > 0)
}

function CallSheet({
  event,
  production,
  called,
  onClose,
}: {
  event: ScheduleEvent
  production: Production
  called: Person[]
  onClose: () => void
}) {
  const agenda = sortAgenda(event.agenda ?? [])
  const perPerson = hasPerPersonCalls(event)
  const calls = perPerson ? personCalls(event, called) : []
  const emailCallSheet = () => {
    const to = called.map((p) => p.email).filter(Boolean).join(',')
    const body = [
      `${production.title} - Call Sheet`,
      `${event.type}${event.title ? ` · ${event.title}` : ''} · ${formatDate(event.date)}`,
      event.location ? `Location: ${event.location}` : '',
      event.callTime ? `Call: ${formatTime(event.callTime)}` : '',
      '',
      ...(agenda.length ? ['SCHEDULE', ...agenda.map((a) => `${a.time ? formatTime(a.time) : '-'}${a.endTime ? `–${formatTime(a.endTime)}` : ''}  ${a.what}`), ''] : []),
      ...(perPerson
        ? ['CALLS BY PERSON', ...calls.map((c) => `${c.person.name}: ${c.inTime ? formatTime(c.inTime) : '-'}${c.outTime ? ` – ${formatTime(c.outTime)}` : ''}`), '']
        : []),
      called.length ? `Called: ${called.map((p) => p.name).join(', ')}` : '',
    ]
      .filter((l) => l !== '')
      .join('\n')
    const subject = `Call Sheet - ${production.title} - ${formatDate(event.date)}`
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }
  return (
    <PrintSheet hint="Print or save the call sheet as a PDF, or email it to the called company." onClose={onClose}>
      <div className="sheet-head">
        <h2>{production.title} - Call Sheet</h2>
        <div className="sheet-sub">
          {event.type}
          {event.title ? ` · ${event.title}` : ''} · {formatDate(event.date)}
          {event.location ? ` · ${event.location}` : ''}
        </div>
      </div>
      {agenda.length > 0 ? (
        <table className="sheet-table">
          <thead>
            <tr>
              <th style={{ width: '26%' }}>Time</th>
              <th>Call</th>
            </tr>
          </thead>
          <tbody>
            {agenda.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700 }}>
                  {a.time ? formatTime(a.time) : '-'}
                  {a.endTime ? `–${formatTime(a.endTime)}` : ''}
                </td>
                <td>{a.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted small">No call times yet - add them on the event to build the hour-by-hour.</p>
      )}

      {perPerson && (
        <>
          <div className="field-label" style={{ marginTop: 14 }}>Calls by person</div>
          <table className="sheet-table">
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: '22%' }}>In</th>
                <th style={{ width: '22%' }}>Out</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.person.id}>
                  <td>{c.person.name}</td>
                  <td style={{ fontWeight: 700 }}>{c.inTime ? formatTime(c.inTime) : '-'}</td>
                  <td>{c.outTime ? formatTime(c.outTime) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <div className="field-label" style={{ marginTop: 14 }}>Called{called.length ? ` (${called.length})` : ''}</div>
      <p className="small">{called.length ? called.map((p) => p.name).join(', ') : 'Whole company'}</p>
      <div className="no-print" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={emailCallSheet}>✉ Email to called</button>
      </div>
    </PrintSheet>
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
  const { production } = useStore()
  const profile = kindProfile(production?.kind)
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
    setF((s) => {
      const on = (s.sceneIds ?? []).includes(id)
      if (on) {
        // Removing a scene never un-calls anyone - a person may be needed for
        // another scene or reason. The user prunes the call list by hand.
        return { ...s, sceneIds: (s.sceneIds ?? []).filter((x) => x !== id) }
      }
      // Adding a scene pre-selects the characters in it (if the breakdown is
      // filled out) so the call list builds itself from the scenes. Additive
      // only - deselect anyone not actually needed. Skipped when "all cast"
      // is on, since the whole cast is already covered by the flag.
      const chars = scenes.find((sc) => sc.id === id)?.characterIds ?? []
      const calledPersonIds = s.calledAllCast
        ? s.calledPersonIds
        : Array.from(new Set([...s.calledPersonIds, ...chars]))
      return { ...s, sceneIds: [...(s.sceneIds ?? []), id], calledPersonIds }
    })

  // Turn "all cast" on/off. On: drop any individually-picked cast members
  // (they're covered by the flag) so the chips don't double up - mirrors Props.
  const toggleAllCast = () =>
    setF((s) => {
      const on = !s.calledAllCast
      return {
        ...s,
        calledAllCast: on,
        calledPersonIds: on
          ? s.calledPersonIds.filter((id) => people.find((p) => p.id === id)?.group !== 'Cast')
          : s.calledPersonIds,
      }
    })

  // Live conflict warnings for the people called against the chosen date/times.
  const pool = calledPeople(f, people)
  const warnings = pool
    .map((p) => ({ p, c: eventConflict(p, f) }))
    .filter((w): w is { p: Person; c: Conflict } => !!w.c)

  const missing =
    !f.type ||
    !f.date ||
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
          <span className="field-label">Title</span>
          <input value={f.title} onChange={set('title')} placeholder="e.g. Act 1 blocking" />
        </label>
      </div>
      <div className="form-row">
        <label className="field">
          <span className="field-label">Date <ReqStar /></span>
          <input type="date" value={f.date} onChange={set('date')} />
        </label>
        <label className="field">
          <span className="field-label">Call time</span>
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
            {profile.unit}(s) worked{' '}
            <span className="faint">(optional - picking one pre-calls its {term(production?.kind, 'character').toLowerCase()}s)</span>
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
        <span className="faint">({calledSummary(f, people)})</span>
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
          {people.some((p) => p.group === 'Cast') && (
            <button
              type="button"
              className={`btn btn-sm ${f.calledAllCast ? 'btn-primary' : 'btn-ghost'}`}
              onClick={toggleAllCast}
              style={{ borderRadius: 999 }}
              title="Call the whole cast (stays correct as the cast changes)"
            >
              {f.calledAllCast ? '✓ ' : ''}👥 All cast
            </button>
          )}
          {people.map((p) => {
            // When "all cast" is on, cast members are covered by the flag - hide
            // their chips so the picker only shows the extras you can still add.
            if (f.calledAllCast && p.group === 'Cast') return null
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
                <strong>{p.name}</strong> - {formatConflict(c)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <AgendaEditor
        items={f.agenda ?? []}
        people={pool}
        onChange={(list) => setF((s) => ({ ...s, agenda: list }))}
      />

      <label className="field">
        <span className="field-label">Notes</span>
        <textarea value={f.notes} onChange={set('notes')} placeholder="Notes, focus, reminders…" />
      </label>
      {missing && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 8 }}>
          Type, date, start, end &amp; location are all required.
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
  unmarked: '-',
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
  'no-show': 'No-show',
}

function AttendanceModal({ event, onClose }: { event: ScheduleEvent; onClose: () => void }) {
  const { production, getAttendance, setAttendance } = useStore()
  const called = calledPeople(event, production?.people ?? [])

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
  const heading = `Attendance · ${event.title || event.type}${scenesText ? ` - ${scenesText}` : ''}`

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

function SignInSheet({
  event,
  isPast,
  onClose,
}: {
  event: ScheduleEvent
  isPast: boolean
  onClose: () => void
}) {
  const { production } = useStore()
  const called = calledPeople(event, production?.people ?? [])
  const rows = [...called].sort((a, b) => a.name.localeCompare(b.name))
  const scenesText = sceneLabels(event.sceneIds, production?.scenes ?? [])
  const windowText = event.startTime
    ? `${formatTime(event.startTime)}${event.endTime ? `–${formatTime(event.endTime)}` : ''}`
    : ''

  return (
    <PrintSheet hint="Print or save the sign-in sheet as a PDF, then post it at the callboard." onClose={onClose}>
      {isPast && <SignedSheetPanel event={event} />}
      <div className="sheet-head">
        <h2>{production?.title} - Sign-in Sheet</h2>
        <div className="sheet-sub">
          {event.type}
          {event.title ? ` · ${event.title}` : ''} · {formatDate(event.date)}
          {event.callTime ? ` · Call ${formatTime(event.callTime)}` : ''}
          {windowText ? ` · ${windowText}` : ''}
          {event.location ? ` · ${event.location}` : ''}
          {scenesText ? ` · ${scenesText}` : ''}
        </div>
      </div>
      <table className="sheet-table">
        <thead>
          <tr>
            <th style={{ width: '34%' }}>Name</th>
            <th>Role / {term(production?.kind, 'character')}</th>
            <th style={{ width: '18%' }}>Time in</th>
            <th style={{ width: '16%' }}>Initials</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td style={{ fontWeight: 700 }}>{p.name}</td>
              <td>{p.character || p.role || ''}</td>
              <td></td>
              <td></td>
            </tr>
          ))}
          {/* Always leave blank rows for walk-ins / swings; keeps a complete grid. */}
          {Array.from({ length: rows.length === 0 ? 12 : 4 }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td>&nbsp;</td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintSheet>
  )
}

/**
 * Upload / view the physically-signed sign-in sheet for a PAST event.
 * The image or PDF lives in IndexedDB (too big for localStorage); the event
 * just carries a flag + mime so we know one exists.
 */
function SignedSheetPanel({ event }: { event: ScheduleEvent }) {
  const { production, updateEvent } = useStore()
  // Read the live event from the store - the modal's `event` prop is a snapshot
  // taken when it opened, so it wouldn't reflect an upload made just now.
  const live = production?.events.find((e) => e.id === event.id) ?? event
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const uploadedAt = live.signInUploadedAt
  const mime = live.signInMime ?? ''
  const isPdf = mime.includes('pdf')

  // Load the stored blob into an object URL for preview whenever it changes.
  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    if (uploadedAt) {
      getFile(signInKey(event.id)).then((blob) => {
        if (cancelled || !blob) return
        const u = URL.createObjectURL(blob)
        revoked = u
        setUrl(u)
      })
    } else {
      setUrl(null)
    }
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [event.id, uploadedAt])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setBusy(true)
    try {
      await putFile(signInKey(event.id), file)
      updateEvent(event.id, {
        signInUploadedAt: new Date().toISOString(),
        signInMime: file.type,
      })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteFile(signInKey(event.id))
      updateEvent(event.id, { signInUploadedAt: undefined, signInMime: undefined })
      setUrl(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="card no-print"
      style={{ padding: 14, marginBottom: 14, background: 'var(--bg-elev)' }}
    >
      <div className="row-between wrap" style={{ gap: 10 }}>
        <div>
          <div style={{ fontWeight: 600 }}>Signed sheet</div>
          <div className="faint small">
            {uploadedAt
              ? `Uploaded ${formatDate(uploadedAt.slice(0, 10))}`
              : 'Upload a photo or scan of the signed sheet to keep it on file.'}
          </div>
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <label className="btn btn-sm btn-primary" style={{ cursor: 'pointer' }}>
            {busy ? 'Saving…' : uploadedAt ? '↻ Replace' : '⤒ Upload signed sheet'}
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={onPick}
              style={{ display: 'none' }}
            />
          </label>
          {uploadedAt && url && (
            <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
              View full size
            </a>
          )}
          {uploadedAt && (
            <ConfirmButton className="btn btn-sm btn-danger" onConfirm={remove}>
              Remove
            </ConfirmButton>
          )}
        </div>
      </div>
      {uploadedAt && url && !isPdf && (
        <img
          src={url}
          alt="Signed sign-in sheet"
          style={{
            display: 'block',
            marginTop: 12,
            maxWidth: '100%',
            maxHeight: 340,
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        />
      )}
      {uploadedAt && url && isPdf && (
        <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
          PDF uploaded - tap “View full size” to open it.
        </p>
      )}
    </div>
  )
}
