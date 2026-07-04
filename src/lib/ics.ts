import type { Production, ScheduleEvent } from './types'

// Generate an RFC-5545 .ics calendar from schedule events, using local
// "floating" times so a call at 6:30pm shows as 6:30pm in everyone's calendar.

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function localDateTime(dateISO: string, time?: string): { allDay: boolean; value: string } {
  const [y, m, d] = dateISO.split('-').map(Number)
  if (!time) return { allDay: true, value: `${y}${pad(m)}${pad(d)}` }
  const [hh, mm] = time.split(':').map(Number)
  return { allDay: false, value: `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00` }
}

function nextDay(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const dt = new Date(y, m - 1, d + 1)
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`
}

function esc(s = ''): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function stamp(): string {
  const d = new Date()
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

/** Fold long lines to ~74 chars per RFC 5545. */
function fold(line: string): string {
  if (line.length <= 74) return line
  let out = ''
  let rest = line
  while (rest.length > 74) {
    out += rest.slice(0, 74) + '\r\n '
    rest = rest.slice(74)
  }
  return out + rest
}

export function eventsToICS(
  events: ScheduleEvent[],
  prod: Production,
  nameFor: (id: string) => string,
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stage Manager//Schedule//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${esc(prod.title)}`,
  ]
  for (const e of events) {
    const start = localDateTime(e.date, e.startTime || e.callTime)
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${e.id}@stagemgmt`)
    lines.push(`DTSTAMP:${stamp()}`)
    if (start.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start.value}`)
      lines.push(`DTEND;VALUE=DATE:${nextDay(e.date)}`)
    } else {
      lines.push(`DTSTART:${start.value}`)
      if (e.endTime) lines.push(`DTEND:${localDateTime(e.date, e.endTime).value}`)
    }
    lines.push(`SUMMARY:${esc(`${e.type}: ${e.title || e.type}`)}`)
    if (e.location) lines.push(`LOCATION:${esc(e.location)}`)
    const desc: string[] = []
    if (e.callTime) desc.push(`Call ${e.callTime}`)
    desc.push(
      'Called: ' +
        (e.calledPersonIds.length ? e.calledPersonIds.map(nameFor).join(', ') : 'Whole company'),
    )
    if (e.notes) desc.push(e.notes)
    lines.push(`DESCRIPTION:${esc(desc.join('\n'))}`)
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.map(fold).join('\r\n')
}
