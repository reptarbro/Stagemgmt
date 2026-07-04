import { formatDate } from './format'
import type { Person, Production, Report } from './types'

/** Trigger a client-side file download. */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Slugify a title for filenames. */
export function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'production'
}

/** Plain-text version of a report, for copy/paste or email body. */
export function reportToText(r: Report, prod: Production): string {
  const L: string[] = []
  L.push(`${prod.title} — ${r.type} Report`)
  L.push(formatDate(r.date))
  if (prod.company) L.push(prod.company)
  L.push('')
  if (r.summary) L.push('SUMMARY', r.summary, '')
  if (r.workedOn) L.push('WORKED ON / TIMING', r.workedOn, '')
  for (const s of r.sections) {
    if (s.notes.length) {
      L.push(s.title.toUpperCase())
      for (const n of s.notes) L.push(`• ${n.text}`)
      L.push('')
    }
  }
  if (r.scheduleNote) L.push('SCHEDULE / NEXT CALL', r.scheduleNote, '')
  return L.join('\n').trim()
}

function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** CSV of the contact sheet. */
export function contactsCSV(people: Person[]): string {
  const header = ['Name', 'Group', 'Role', 'Character', 'Email', 'Phone', 'ICE name', 'ICE phone', 'Notes']
  const rows = people.map((p) =>
    [p.name, p.group, p.role, p.character, p.email, p.phone, p.emergencyContactName, p.emergencyContactPhone, p.notes]
      .map((v) => csvCell(v ?? ''))
      .join(','),
  )
  return [header.join(','), ...rows].join('\r\n')
}
