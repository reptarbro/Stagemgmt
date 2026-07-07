// Complete, portable backups: the localStorage data model PLUS every binary
// (uploaded script PDFs, sign-in photos) that lives in IndexedDB, packed into a
// single JSON file so a production fully rehydrates on another device.
import { getAllFiles, putFile } from './storage'

export interface BundleFile {
  key: string
  mime: string
  /** base64, no data-URL prefix */
  data: string
}

/** base64 (no data-URL prefix) for a blob. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

export function base64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}

/** Build the full bundle string: the given data model + all IndexedDB files. */
export async function buildBundleString(dataJson: string): Promise<string> {
  const files = await getAllFiles()
  const encoded: BundleFile[] = await Promise.all(
    files.map(async (f) => ({
      key: f.key,
      mime: f.blob.type || 'application/octet-stream',
      data: await blobToBase64(f.blob),
    })),
  )
  return JSON.stringify({
    kind: 'standby-bundle',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: JSON.parse(dataJson),
    files: encoded,
  })
}

/**
 * Apply a backup file's text. Handles both the new full bundle (restores files
 * then the data model) and a plain data-only JSON (backward compatible).
 * `importJSON` is the store action that replaces the data model.
 */
export async function applyBackupText(
  text: string,
  importJSON: (json: string) => { ok: boolean; error?: string },
): Promise<{ ok: boolean; error?: string; files: number; bundle: boolean }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file isn't valid Standby data.", files: 0, bundle: false }
  }
  const obj = parsed as { kind?: string; files?: BundleFile[]; data?: unknown }
  if (obj && obj.kind === 'standby-bundle') {
    const list = obj.files ?? []
    // Restore binaries first so the reloaded data model finds its files.
    for (const f of list) await putFile(f.key, base64ToBlob(f.data, f.mime))
    const res = importJSON(JSON.stringify(obj.data))
    return { ...res, files: list.length, bundle: true }
  }
  const res = importJSON(text)
  return { ...res, files: 0, bundle: false }
}
