// Auto-merge for Cloud Sync. One person, several devices → we never ask them to
// resolve a conflict; we merge. Rules:
//   • Records union by id (an add on any device is never lost).
//   • Same id on both sides → the one with the newer `updatedAt` wins
//     (deterministic tiebreak when equal, so devices agree without a server).
//   • Deletes are tombstones (a deleted id stays gone unless it was edited later).
//   • Ordering is taken from the cloud copy, with this device's not-yet-in-cloud
//     records appended - so after each device pushes once, every device converges
//     to the exact same array (no ping-pong) while keeping meaningful order
//     (e.g. the cue sheet) intact.
// The merge is order-stable given a fixed cloud, so reconcile(local, cloud) run
// on both devices lands them on identical state.
import type { AppData, Production } from '../types'

/** Effective "last touched" time for a record; '' (oldest) when unknown. */
function recTime(r: unknown): string {
  const o = r as { updatedAt?: string; createdAt?: string; uploadedAt?: string } | null
  return (o && (o.updatedAt || o.createdAt || o.uploadedAt)) || ''
}

/** Canonical (key-sorted) serialization - for a device-independent tiebreak. */
function stable(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']'
  const o = v as Record<string, unknown>
  return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
}

/** Choose between two versions of the same record: newer `updatedAt` wins; on a
    tie, the lexicographically-greater serialization (so both devices agree). */
function pick<T>(a: T, b: T): T {
  const ta = recTime(a)
  const tb = recTime(b)
  if (ta > tb) return a
  if (tb > ta) return b
  return stable(a) >= stable(b) ? a : b
}

function maxStr(a?: string, b?: string): string | undefined {
  const x = a ?? ''
  const y = b ?? ''
  const m = x >= y ? x : y
  return m || undefined
}

function minStr(a?: string, b?: string): string | undefined {
  if (!a) return b
  if (!b) return a
  return a <= b ? a : b
}

/** Merge two tombstone maps: keep the latest deletion time per id. */
export function mergeDeleted(
  a?: Record<string, string>,
  b?: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...(a ?? {}) }
  for (const [id, t] of Object.entries(b ?? {})) {
    if (!out[id] || t > out[id]) out[id] = t
  }
  return out
}

/** Union two record arrays: cloud (remote) order first with newest-wins on
    shared ids, then this device's not-yet-uploaded records appended, then drop
    anything a tombstone deletes. Deterministic for a fixed `remote`. */
function mergeArray<T>(
  local: T[] | undefined,
  remote: T[] | undefined,
  key: (r: T) => string,
  deleted: Record<string, string>,
): T[] {
  const localById = new Map<string, T>()
  for (const r of local ?? []) localById.set(key(r), r)
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of remote ?? []) {
    const k = key(r)
    seen.add(k)
    const mine = localById.get(k)
    out.push(mine ? pick(mine, r) : r)
  }
  for (const r of local ?? []) {
    const k = key(r)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(r)
    }
  }
  return out.filter((r) => {
    const t = deleted[key(r)]
    return !(t && recTime(r) <= t)
  })
}

/** Merge two copies of the same production. */
function mergeProduction(a: Production, b: Production): Production {
  const deleted = mergeDeleted(a.deleted, b.deleted)
  // Own fields (title, dates, notes, script) come from whichever copy's own
  // edit is newer (production.updatedAt), tiebroken deterministically.
  const s = pick(a, b)
  const id = (r: { id: string }) => r.id
  const evKey = (r: { eventId: string }) => r.eventId
  return {
    id: a.id,
    title: s.title,
    company: s.company,
    venue: s.venue,
    director: s.director,
    firstRehearsal: s.firstRehearsal,
    openingNight: s.openingNight,
    closingNight: s.closingNight,
    notes: s.notes,
    script: s.script,
    isSample: a.isSample ?? b.isSample,
    createdAt: minStr(a.createdAt, b.createdAt) ?? a.createdAt ?? b.createdAt,
    updatedAt: maxStr(a.updatedAt, b.updatedAt),
    people: mergeArray(a.people, b.people, id, deleted),
    events: mergeArray(a.events, b.events, id, deleted),
    attendance: mergeArray(a.attendance, b.attendance, evKey, deleted),
    reports: mergeArray(a.reports, b.reports, id, deleted),
    scenes: mergeArray(a.scenes, b.scenes, id, deleted),
    props: mergeArray(a.props, b.props, id, deleted),
    lineNotes: mergeArray(a.lineNotes, b.lineNotes, id, deleted),
    cues: mergeArray(a.cues, b.cues, id, deleted),
    assets: mergeArray(a.assets, b.assets, id, deleted),
    deleted,
  }
}

function prodTime(p: Production): string {
  return p.updatedAt || p.createdAt || ''
}

/**
 * Merge this device's data with the cloud copy. Cloud provides the base order;
 * local-only productions/records are added; deletes (tombstones) are honored.
 * `activeProductionId` is device-local UI state and is kept from `local`.
 */
export function mergeAppData(local: AppData, remote: AppData): AppData {
  const deleted = mergeDeleted(local.deleted, remote.deleted)
  const localById = new Map<string, Production>()
  for (const p of local.productions ?? []) localById.set(p.id, p)
  const seen = new Set<string>()
  const merged: Production[] = []
  for (const p of remote.productions ?? []) {
    seen.add(p.id)
    const mine = localById.get(p.id)
    merged.push(mine ? mergeProduction(mine, p) : p)
  }
  for (const p of local.productions ?? []) {
    if (!seen.has(p.id)) {
      seen.add(p.id)
      merged.push(p)
    }
  }
  const productions = merged.filter((p) => {
    const t = deleted[p.id]
    return !(t && prodTime(p) <= t)
  })
  return {
    version: 1,
    productions,
    activeProductionId: local.activeProductionId,
    deleted,
  }
}
