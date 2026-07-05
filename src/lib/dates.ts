import type { Production } from './types'

/** Midnight-local today, for whole-day comparisons. */
function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Parse an ISO date ("YYYY-MM-DD") as a local midnight Date. */
export function parseISO(iso?: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

/** Whole days from today until opening night; negative once open. Null if unset. */
export function daysToOpening(prod: Production): number | null {
  const open = parseISO(prod.openingNight)
  if (!open) return null
  const ms = open.getTime() - today().getTime()
  return Math.round(ms / 86_400_000)
}

/**
 * Cue-to-cue becomes relevant as tech approaches. It "opens" ~25 days out
 * (the 21–25 day window) and stays available through the run.
 */
export const CUE_WINDOW_DAYS = 25

export function cueToCueActive(prod: Production): boolean {
  const d = daysToOpening(prod)
  if (d === null) return false
  return d <= CUE_WINDOW_DAYS
}
