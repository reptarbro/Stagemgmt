// Cloud Sync (beta): the whole app state + binaries. Manual Push/Pull plus an
// auto-sync engine (see CloudAutoSync) that pushes on change and pulls on open,
// guarded so it never auto-clobbers when both sides changed.
import { supa } from './client'
import { getAllFiles, putFile } from '../storage'

const BUCKET = 'files'
const LAST_SYNC_KEY = 'standby.cloud.lastSync'
const SIG_KEY = 'standby.cloud.sig'

/** Fast, stable signature of a JSON string (djb2) to detect real data changes. */
export function dataSignature(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) | 0
  return String(h >>> 0)
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
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

/** Upload the data model (as one jsonb row) and every stored binary. */
export async function pushAll(dataJson: string): Promise<{ files: number }> {
  const user = await currentUser()
  if (!user) throw new Error('Not signed in')

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
}

/** Pull the cloud copy over this device (restores data model + binaries). */
export async function pullAll(importJSON: ImportFn): Promise<{ ok: boolean; error?: string; files: number }> {
  const user = await currentUser()
  if (!user) return { ok: false, error: 'Not signed in', files: 0 }

  const { data, error } = await supa()
    .from('app_state')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) return { ok: false, error: error.message, files: 0 }
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
