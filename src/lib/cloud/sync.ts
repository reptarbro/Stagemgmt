// Cloud Sync (beta): manual push/pull of the whole app state + binaries.
// v1 is deliberately explicit (no background sync) so nothing is ever clobbered
// without the user asking — it's account-backed export/import, essentially.
import { supa } from './client'
import { getAllFiles, putFile } from '../storage'

const BUCKET = 'files'
const LAST_SYNC_KEY = 'standby.cloud.lastSync'

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
