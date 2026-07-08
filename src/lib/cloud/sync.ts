// Cloud Sync (beta): the whole app state + binaries. Manual Push/Pull plus an
// auto-sync engine (see CloudAutoSync) that pushes on change and pulls on open,
// guarded so it never auto-clobbers when both sides changed.
import { supa } from './client'
import { getAllFiles, putFile } from '../storage'
import { setSyncStatus } from './status'

const BUCKET = 'files'
const LAST_SYNC_KEY = 'standby.cloud.lastSync'
const SIG_KEY = 'standby.cloud.sig'

function djb2(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0
  return String(h >>> 0)
}

/** Serialize a value with object keys sorted recursively, so two structurally
    identical values always produce the same string regardless of key insertion
    order or whitespace. Arrays keep their order (it's meaningful). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']'
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}'
}

/** Fast, stable signature (djb2) of the app data, used to detect real changes.
    Input is a JSON string; it's canonicalized first (keys sorted, whitespace
    stripped) so a pretty-printed local copy and a compact, key-reordered copy
    round-tripped through Postgres jsonb hash to the SAME value for identical
    data — otherwise the "already in sync" check never matches and the auto-sync
    engine churns (pull/push on every poll and focus). Falls back to hashing the
    raw string if it isn't valid JSON. */
export function dataSignature(s: string): string {
  try {
    return djb2(stableStringify(JSON.parse(s)))
  } catch {
    return djb2(s)
  }
}
/** The signature stored at the last successful sync (push or pull). */
export function syncedSignature(): string | null {
  return localStorage.getItem(SIG_KEY)
}
export function setSyncedSignature(sig: string) {
  localStorage.setItem(SIG_KEY, sig)
}

/** Peek at the cloud copy (data + updated_at) without importing it. */
export async function fetchCloudState(): Promise<{ data: unknown; updatedAt: string } | null> {
  const user = await currentUser()
  if (!user) return null
  const { data, error } = await supa()
    .from('app_state')
    .select('data, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || !data) return null
  return { data: data.data, updatedAt: data.updated_at as string }
}

export type ImportFn = (json: string) => { ok: boolean; error?: string }

export async function currentUser() {
  const { data } = await supa().auth.getUser()
  return data.user ?? null
}

export function lastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

/** Whether the signed-in account already has a saved copy in the cloud. */
export async function cloudHasData(): Promise<boolean> {
  const user = await currentUser()
  if (!user) return false
  const { data } = await supa().from('app_state').select('user_id').eq('user_id', user.id).maybeSingle()
  return !!data
}
function markSynced() {
  const at = new Date().toISOString()
  localStorage.setItem(LAST_SYNC_KEY, at)
  setSyncStatus('synced', at)
}

/** Upload the data model (as one jsonb row) and every stored binary. */
export async function pushAll(dataJson: string): Promise<{ files: number }> {
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')
  setSyncStatus('syncing')

  try {
    const { error } = await supa()
      .from('app_state')
      .upsert({ user_id: user.id, data: JSON.parse(dataJson), updated_at: new Date().toISOString() })
    if (error) throw new Error(error.message)

    const files = await getAllFiles()
    for (const f of files) {
      const path = `${user.id}/${encodeURIComponent(f.key)}`
      const { error: upErr } = await supa()
        .storage.from(BUCKET)
        .upload(path, f.blob, { upsert: true, contentType: f.blob.type || 'application/octet-stream' })
      if (upErr) throw new Error(upErr.message)
    }
    markSynced()
    return { files: files.length }
  } catch (e) {
    setSyncStatus('error')
    throw e
  }
}

/** Pull the cloud copy over this device (restores data model + binaries). */
export async function pullAll(importJSON: ImportFn): Promise<{ ok: boolean; error?: string; files: number }> {
  const user = await currentUser()
  if (!user) return { ok: false, error: 'Not signed in', files: 0 }
  setSyncStatus('syncing')

  const { data, error } = await supa()
    .from('app_state')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) {
    setSyncStatus('error')
    return { ok: false, error: error.message, files: 0 }
  }
  if (!data) {
    return { ok: false, error: 'Nothing in the cloud yet — Push from a device that has your show first.', files: 0 }
  }

  let count = 0
  const list = await supa().storage.from(BUCKET).list(user.id, { limit: 1000 })
  if (!list.error && list.data) {
    for (const obj of list.data) {
      if (obj.name.startsWith('.')) continue // skip folder placeholder
      const dl = await supa().storage.from(BUCKET).download(`${user.id}/${obj.name}`)
      if (!dl.error && dl.data) {
        await putFile(decodeURIComponent(obj.name), dl.data)
        count++
      }
    }
  }

  const res = importJSON(JSON.stringify(data.data))
  if (res.ok) markSynced()
  return { ...res, files: count }
}

/** Delete everything this account has stored in the cloud: every uploaded
    binary under the user's folder and the app_state data row. Runs while the
    session is still valid (call before deleting the auth account / signing
    out). Does NOT touch this device's local copy — that stays local-first.
    Returns the number of files removed. */
export async function deleteCloudData(): Promise<{ files: number }> {
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')

  // Remove stored binaries first (script PDF, sign-in photos).
  let removed = 0
  const list = await supa().storage.from(BUCKET).list(user.id, { limit: 1000 })
  if (!list.error && list.data) {
    const paths = list.data.filter((o) => !o.name.startsWith('.')).map((o) => `${user.id}/${o.name}`)
    if (paths.length) {
      const { error } = await supa().storage.from(BUCKET).remove(paths)
      if (error) throw new Error(error.message)
      removed = paths.length
    }
  }

  // Remove the data row.
  const { error } = await supa().from('app_state').delete().eq('user_id', user.id)
  if (error) throw new Error(error.message)

  // Forget the sync markers so nothing tries to re-push a stale copy.
  localStorage.removeItem(LAST_SYNC_KEY)
  localStorage.removeItem(SIG_KEY)
  return { files: removed }
}

/** Delete the auth account itself via a server-side RPC (`delete_account`, a
    SECURITY DEFINER function that removes the caller from auth.users — see
    supabase/delete_account.sql). Returns false if the function isn't installed
    yet, so the caller can fall back to data-deletion + sign-out. */
export async function deleteAuthAccount(): Promise<boolean> {
  const { error } = await supa().rpc('delete_account')
  return !error
}
