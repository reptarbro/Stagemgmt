import type { AppData, Production } from './types'

const STORAGE_KEY = 'stagemgmt.data.v1'
const CURRENT_VERSION = 1

const EMPTY: AppData = {
  version: CURRENT_VERSION,
  productions: [],
  activeProductionId: null,
}

/**
 * Ensure a production has every collection Phase 1 expects, so data saved by
 * an older version of the app keeps working after an upgrade.
 */
export function normalizeProduction(p: Partial<Production>): Production {
  return {
    id: p.id ?? newId(),
    title: p.title ?? 'Untitled',
    company: p.company,
    venue: p.venue,
    director: p.director,
    firstRehearsal: p.firstRehearsal,
    openingNight: p.openingNight,
    closingNight: p.closingNight,
    notes: p.notes,
    people: (p.people ?? []).map((person) => ({ ...person, conflicts: person.conflicts ?? [] })),
    events: p.events ?? [],
    attendance: p.attendance ?? [],
    reports: p.reports ?? [],
    scenes: p.scenes ?? [],
    props: p.props ?? [],
    lineNotes: p.lineNotes ?? [],
    // Migrate the old "LX" dept label to "Lighting".
    cues: (p.cues ?? []).map((c) => ({ ...c, dept: (c.dept as string) === 'LX' ? 'Lighting' : c.dept })),
    script: p.script,
    assets: p.assets ?? [],
    isSample: p.isSample,
    createdAt: p.createdAt ?? new Date().toISOString(),
  }
}

/** Load app data from localStorage, tolerating missing/corrupt data. */
export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(EMPTY)
    const parsed = JSON.parse(raw) as AppData
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.productions)) {
      return structuredClone(EMPTY)
    }
    return {
      ...structuredClone(EMPTY),
      ...parsed,
      version: CURRENT_VERSION,
      productions: parsed.productions.map(normalizeProduction),
    }
  } catch {
    return structuredClone(EMPTY)
  }
}

/** Persist app data. Throws are swallowed so the UI never crashes on quota errors. */
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save data', err)
  }
}

const BACKUP_KEY = 'stagemgmt.lastBackup'

/** Epoch ms of the last data export, or 0 if never. */
export function getLastBackup(): number {
  const v = localStorage.getItem(BACKUP_KEY)
  return v ? Number(v) : 0
}

/** Record that the user just exported a backup. */
export function markBackedUp(): void {
  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()))
  } catch {
    /* ignore quota errors */
  }
}

/** Generate a stable-ish unique id without external deps. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

// ---------------------------------------------------------------------------
// Script files (binary) live in IndexedDB — localStorage is too small for PDFs.
// ---------------------------------------------------------------------------

const DB_NAME = 'stagemgmt.files'
const DB_STORE = 'scripts'

function openFileDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(DB_STORE)) {
        req.result.createObjectStore(DB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Store a script file's bytes under a key (typically the ScriptMeta id). */
export async function putScriptFile(key: string, file: Blob): Promise<void> {
  const db = await openFileDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).put(file, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

/** Retrieve a stored script file, or null if absent. */
export async function getScriptFile(key: string): Promise<Blob | null> {
  const db = await openFileDB()
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const req = tx.objectStore(DB_STORE).get(key)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return result
}

/** Every stored binary (script PDFs, sign-in photos) with its key — used to
    pack a complete, portable backup that includes files, not just the model. */
export async function getAllFiles(): Promise<{ key: string; blob: Blob }[]> {
  const db = await openFileDB()
  const result = await new Promise<{ key: string; blob: Blob }[]>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly')
    const store = tx.objectStore(DB_STORE)
    const keysReq = store.getAllKeys()
    const valsReq = store.getAll()
    tx.oncomplete = () => {
      const keys = keysReq.result as IDBValidKey[]
      const vals = valsReq.result as Blob[]
      resolve(keys.map((k, i) => ({ key: String(k), blob: vals[i] })))
    }
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return result
}

/** Delete a stored script file. */
export async function deleteScriptFile(key: string): Promise<void> {
  const db = await openFileDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite')
    tx.objectStore(DB_STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

// The same IndexedDB store also holds other binary blobs (e.g. uploaded
// sign-in sheet photos, keyed `signin:<eventId>`). These generic aliases make
// that intent clear at the call site.
export const putFile = putScriptFile
export const getFile = getScriptFile
export const deleteFile = deleteScriptFile

/** IndexedDB key for an event's uploaded (signed) sign-in sheet. */
export const signInKey = (eventId: string) => `signin:${eventId}`

/** IndexedDB key for a general uploaded asset (headshot, contract, budget…). */
export const assetKey = (assetId: string) => `asset:${assetId}`
