/** Format an ISO date ("2026-07-15") as "Wed, Jul 15, 2026". Empty-safe. */
export function formatDate(iso?: string): string {
  if (!iso) return '—'
  const d = parseISODate(iso)
  if (!d) return iso
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Short form: "Jul 15". */
export function formatDateShort(iso?: string): string {
  if (!iso) return '—'
  const d = parseISODate(iso)
  if (!d) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Format "HH:MM" 24h as "7:30 PM". Empty-safe. */
export function formatTime(t?: string): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${period}`
}

/** Parse "YYYY-MM-DD" as a local date (avoids UTC off-by-one from `new Date(str)`). */
export function parseISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

/** Today's date as "YYYY-MM-DD" in local time. */
export function todayISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Whole days from today until the given date. Negative = past. */
export function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const target = parseISODate(iso)
  if (!target) return null
  const now = parseISODate(todayISO())!
  return Math.round((target.getTime() - now.getTime()) / 86_400_000)
}
